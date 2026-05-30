/**
 * tools/call interceptor (W1 skeleton of the W4 guarded forward pipeline).
 *
 * Full W4 ordering (constitution §6):
 *   registry -> required evidence -> simulation/inspection -> risk -> policy -> allow/block -> audit
 *
 * W1+W2 implements ONLY:
 *   shape validation -> registry/schema resolution -> default decision -> forward|block -> audit
 *
 * The intermediate W4 stages are deliberately NOT implemented here. They are the documented
 * extension point for W4; no policy/risk/digest/simulation decision is silently made in W1+W2.
 */

import { randomUUID } from "node:crypto";
import { resolveToolForCall } from "./toolSemanticsBridge.ts";
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

    if (toolName === "compass_status" || toolName === "compass_audit_events") {
      return { outcome: { kind: "meta", toolName }, args };
    }

    const resolution = resolveToolForCall(toolName, this.upstream.getUpstreamToolDescriptor(toolName), this.upstream.isConnected());
    if (resolution.status !== "visible") {
      return {
        outcome: { kind: "block", toolName, error: sanitizeToSafeError(resolution.safe_reason_code) },
        args,
      };
    }

    if (resolution.semantics.default_decision !== "allow") {
      return {
        outcome: { kind: "block", toolName, error: sanitizeToSafeError("POLICY_BLOCKED") },
        args,
      };
    }

    return { outcome: { kind: "forward", toolName, toolClass: resolution.semantics.tool_class }, args };
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
