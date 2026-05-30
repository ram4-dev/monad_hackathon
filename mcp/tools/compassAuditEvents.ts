/**
 * compass_audit_events meta-tool (handled locally, never forwarded upstream).
 *
 * Returns a tail of the append-only audit log. Events are already redacted at write time, so
 * this simply reads the most recent entries.
 */

import type { AuditLog } from "../../back/services/audit/auditLog.ts";
import type { AuditEvent } from "../../shared/types/index.ts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export type CompassAuditEventsResult = {
  count: number;
  events: AuditEvent[];
};

export function buildCompassAuditEvents(audit: AuditLog, rawArgs: unknown): CompassAuditEventsResult {
  let limit = DEFAULT_LIMIT;
  if (rawArgs && typeof rawArgs === "object" && "limit" in rawArgs) {
    const requested = (rawArgs as { limit?: unknown }).limit;
    if (typeof requested === "number" && Number.isFinite(requested) && requested > 0) {
      limit = Math.min(Math.floor(requested), MAX_LIMIT);
    }
  }
  const events = audit.tail(limit);
  return { count: events.length, events };
}
