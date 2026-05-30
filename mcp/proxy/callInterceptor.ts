/**
 * tools/call interceptor (W1 skeleton of the W4 guarded forward pipeline).
 *
 * Full W4 ordering (constitution §6):
 *   registry -> required evidence -> simulation/inspection -> risk -> policy -> allow/block -> audit
 *
 * W1 implements ONLY:
 *   shape validation -> classify (meta | provisional read-only allowlist | block) -> forward|block -> audit
 *
 * The intermediate W4 stages are deliberately NOT implemented here. They are the documented
 * extension point for W4; no policy/risk/digest/simulation decision is silently made in W1.
 */

import { randomUUID } from "node:crypto";
import { classifyTool } from "../../back/services/adapters/walletAgent.ts";
import { ToolCallArgsSchema, makeSafeError, sanitizeToSafeError } from "./schemas.ts";
import { UpstreamClient } from "./upstreamClient.ts";
import type { AuditLog } from "../../back/services/audit/auditLog.ts";
import type { InterceptOutcome, SafeError } from "../../shared/types/index.ts";

export type InterceptResult =
  | { ok: true; meta: { toolName: string }; correlationId: string }
  | { ok: true; forwarded: { toolName: string; result: unknown }; correlationId: string }
  | { ok: false; error: SafeError; correlationId: string };

export class CallInterceptor {
  private readonly upstream: UpstreamClient;
  private readonly audit: AuditLog;

  constructor(upstream: UpstreamClient, audit: AuditLog) {
    this.upstream = upstream;
    this.audit = audit;
  }

  /** Pure classification of a call (no I/O). Exposed for testing and the server router. */
  plan(toolName: string, rawArgs: unknown): { outcome: InterceptOutcome; args: Record<string, unknown> } {
    const parsed = ToolCallArgsSchema.safeParse(rawArgs ?? {});
    if (!parsed.success) {
      return {
        outcome: {
          kind: "block",
          toolName,
          error: makeSafeError("MISSING_REQUIRED_EVIDENCE", "Invalid or oversized arguments."),
        },
        args: {},
      };
    }
    const args = parsed.data as Record<string, unknown>;

    const classification = classifyTool(toolName);
    if (classification.kind === "meta") {
      return { outcome: { kind: "meta", toolName }, args };
    }
    if (classification.kind === "forward") {
      return { outcome: { kind: "forward", toolName, toolClass: classification.toolClass }, args };
    }
    // block
    const error =
      classification.reason === "unmapped"
        ? sanitizeToSafeError("UNMAPPED_TOOL")
        : sanitizeToSafeError("POLICY_BLOCKED");
    return {
      outcome: { kind: "block", toolName, error },
      args,
    };
  }

  /**
   * Handle a host tools/call for an UPSTREAM tool (meta-tools are handled by the server before
   * reaching here). Forwards allowlisted read-only calls, blocks everything else, audits both.
   */
  async handleUpstreamCall(toolName: string, rawArgs: unknown): Promise<InterceptResult> {
    const correlationId = randomUUID();
    const { outcome, args } = this.plan(toolName, rawArgs);

    this.audit.record({
      action: "tool_call_received",
      result: "pending",
      toolName,
      correlationId,
    });

    if (outcome.kind === "meta") {
      // Defensive: server routes meta-tools directly; reaching here means misuse.
      const error = sanitizeToSafeError("INTERNAL_ERROR");
      this.audit.record({ action: "tool_call_blocked", result: "blocked", toolName, correlationId, errorCode: error.error_code });
      return { ok: false, error, correlationId };
    }

    if (outcome.kind === "block") {
      this.audit.record({
        action: "tool_call_blocked",
        result: "blocked",
        toolName,
        correlationId,
        errorCode: outcome.error.error_code,
        metadata: { reason_code: outcome.error.error_code },
      });
      return { ok: false, error: outcome.error, correlationId };
    }

    // forward
    if (!this.upstream.isConnected()) {
      const error = sanitizeToSafeError("UPSTREAM_UNAVAILABLE");
      this.audit.record({ action: "upstream_unavailable", result: "failed", toolName, correlationId, errorCode: error.error_code });
      return { ok: false, error, correlationId };
    }

    try {
      const result = await this.upstream.callTool(toolName, args);
      this.audit.record({
        action: "tool_call_forwarded",
        result: "success",
        toolName,
        toolClass: outcome.toolClass,
        correlationId,
      });
      return { ok: true, forwarded: { toolName, result }, correlationId };
    } catch {
      // Never propagate raw upstream error content.
      const error = sanitizeToSafeError("UPSTREAM_ERROR");
      this.audit.record({
        action: "upstream_error",
        result: "failed",
        toolName,
        toolClass: outcome.toolClass,
        correlationId,
        errorCode: error.error_code,
      });
      return { ok: false, error, correlationId };
    }
  }
}
