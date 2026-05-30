/**
 * Append-only local audit writer (constitution §8).
 *
 * Writes one JSON line per event to COMPASS_AUDIT_PATH. A redaction allowlist governs
 * metadata; secrets, tokens, raw upstream payloads, raw stderr and stack traces are never
 * persisted. W4 extends the event shape with policy/digest/idempotency fields.
 */

import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { AuditAction, AuditEvent, SafeErrorCode, ToolClass } from "../../../shared/types/index.ts";

/** Metadata keys allowed to be persisted. Anything else is dropped. */
const METADATA_ALLOWLIST: readonly string[] = [
  "exposed_tool_count",
  "upstream_tool_count",
  "transport",
  "chain_label",
  "server_name",
  "server_version",
  "duration_ms",
  "reason_code",
];

function redactMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of METADATA_ALLOWLIST) {
    if (key in metadata && metadata[key] !== undefined) {
      const value = metadata[key];
      // Only persist primitives; never nested objects that could carry payloads.
      if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
        out[key] = value;
      }
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export type AuditInput = {
  action: AuditAction;
  result: AuditEvent["result"];
  source?: AuditEvent["source"];
  agentId?: string;
  correlationId?: string;
  toolName?: string;
  toolClass?: ToolClass;
  errorCode?: SafeErrorCode;
  metadata?: Record<string, unknown>;
};

export class AuditLog {
  private readonly path: string;
  private readonly agentId: string;
  private readonly nowIso: () => string;

  constructor(path: string, agentId: string, nowIso: () => string = () => new Date().toISOString()) {
    this.path = path;
    this.agentId = agentId;
    this.nowIso = nowIso;
    const dir = dirname(path);
    if (dir && dir !== ".") {
      mkdirSync(dir, { recursive: true });
    }
  }

  /** Append a single redacted event. Returns the written event. */
  record(input: AuditInput): AuditEvent {
    const event: AuditEvent = {
      event_id: randomUUID(),
      timestamp: this.nowIso(),
      source: input.source ?? "mcp",
      agent_id: this.agentId,
      ...(input.correlationId ? { correlation_id: input.correlationId } : {}),
      ...(input.toolName ? { tool_name: input.toolName } : {}),
      ...(input.toolClass ? { tool_class: input.toolClass } : {}),
      action: input.action,
      result: input.result,
      ...(input.errorCode ? { error_code: input.errorCode } : {}),
      ...(redactMetadata(input.metadata) ? { metadata: redactMetadata(input.metadata) } : {}),
    };
    appendFileSync(this.path, JSON.stringify(event) + "\n", { encoding: "utf8" });
    return event;
  }

  /** Read the most recent `limit` events (already redacted at write time). */
  tail(limit: number): AuditEvent[] {
    if (!existsSync(this.path)) return [];
    const lines = readFileSync(this.path, "utf8").split("\n").filter((l) => l.trim().length > 0);
    const slice = lines.slice(Math.max(0, lines.length - limit));
    const events: AuditEvent[] = [];
    for (const line of slice) {
      try {
        events.push(JSON.parse(line) as AuditEvent);
      } catch {
        // Skip any malformed line rather than leaking partial content.
      }
    }
    return events;
  }
}
