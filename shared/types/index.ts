/**
 * Shared W1 types for Compass proxy.
 *
 * These are intentionally a SUBSET of the full constitution shapes (docs/constitution.md
 * §4, §8). Fields reserved for W3/W4 (policy snapshots, candidate_tx_digest, idempotency_key,
 * simulation/risk results) are NOT modeled here; they are added when those waves land.
 */

/** Tool classes relevant to W1 classification (full union lives in the W2 registry). */
export type ToolClass =
  | "read_only"
  | "simulation"
  | "chain_management"
  | "transaction_execute"
  | "token_approval"
  | "signature"
  | "private_key_management"
  | "unknown";

/** Transport for the upstream connection. P0 only supports stdio (constitution §3.3). */
export type UpstreamTransport = "stdio";

/** Resolved proxy configuration, built from CLI flags + COMPASS_* env (constitution §10). */
export type ProxyConfig = {
  upstreamCommand: string;
  upstreamTransport: UpstreamTransport;
  chainLabel: string;
  policyPath: string | null;
  auditPath: string;
  agentId: string;
  connectTimeoutMs: number;
  callTimeoutMs: number;
};

/** In-memory upstream connection state, surfaced by compass_status. */
export type UpstreamState = {
  connected: boolean;
  managedByCompass: true;
  transport: UpstreamTransport;
  serverName: string | null;
  serverVersion: string | null;
  /** Count of tools discovered upstream (internal inventory, not host-exposed). */
  upstreamToolCount: number;
  /** Reason when not connected; always a safe message, never raw stderr. */
  reason: string | null;
};

/** W1 SafeError codes. Reserved codes are typed but not emitted by W1 paths. */
export type SafeErrorCode =
  // W1-emitted
  | "UNMAPPED_TOOL"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_ERROR"
  | "MISSING_REQUIRED_EVIDENCE"
  | "POLICY_BLOCKED"
  | "INTERNAL_ERROR"
  // reserved for W3/W4 — MUST NOT be emitted by W1 code paths
  | "UNSUPPORTED_CHAIN"
  | "DIGEST_MISMATCH"
  | "SIMULATION_FAILED"
  | "SIMULATION_UNAVAILABLE"
  | "BROADCAST_FAILED";

export type SafeError = {
  error_code: SafeErrorCode;
  safe_message: string;
  /** Sanitized reference only — never raw upstream content, stderr, or stack traces. */
  debug_ref?: string;
};

/** W1 audit actions (subset of constitution §8 AuditEvent.action). */
export type AuditAction =
  | "proxy_started"
  | "upstream_connected"
  | "upstream_unavailable"
  | "tools_list_served"
  | "tool_call_received"
  | "tool_call_forwarded"
  | "tool_call_blocked"
  | "upstream_error";

export type AuditEvent = {
  event_id: string;
  timestamp: string;
  source: "mcp" | "cli" | "system";
  agent_id?: string;
  /** Correlation id linking a received call to its forward/block outcome. */
  correlation_id?: string;
  tool_name?: string;
  tool_class?: ToolClass;
  action: AuditAction;
  result: "success" | "blocked" | "failed" | "pending";
  error_code?: SafeErrorCode;
  /** Allowlisted, non-secret metadata only. */
  metadata?: Record<string, unknown>;
};

/** Outcome of the W1 tools/call interceptor. */
export type InterceptOutcome =
  | { kind: "meta"; toolName: string }
  | { kind: "forward"; toolName: string; toolClass: ToolClass }
  | { kind: "block"; toolName: string; error: SafeError };
