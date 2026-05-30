/**
 * Shared W1 constants for Compass proxy.
 */

import type { ToolClass } from "../types/index.ts";

/** Canonical Compass meta-tool names (constitution §3.2). NOT get_audit_events. */
export const META_TOOL_STATUS = "compass_status" as const;
export const META_TOOL_AUDIT_EVENTS = "compass_audit_events" as const;
export const META_TOOLS: readonly string[] = [META_TOOL_STATUS, META_TOOL_AUDIT_EVENTS];

/**
 * W1 provisional read-only allowlist (Q1/Q2 decision + constitution invariants 8-9).
 *
 * SAFETY: only `read_only` and `simulation` classes may appear here. Adding any mutating,
 * signing, approval, or key-management tool would make W1 an unsafe pass-through and violate
 * the constitution. The real registry (W2) supersedes this map and also populates tools/list.
 *
 * `dry_run_transaction` is intentionally absent: the live upstream does not expose it
 * (W0-BLOCKER-009).
 */
export const PROVISIONAL_READONLY_ALLOWLIST: Readonly<Record<string, ToolClass>> = {
  get_wallet_info: "read_only",
  get_balance: "read_only",
  get_token_balance: "read_only",
  estimate_gas: "simulation",
  simulate_transaction: "simulation",
};

/**
 * Tools known to be sensitive that must always be blocked before upstream contact
 * (constitution §4.3 + write/signature/approval classes). Used for clearer audit
 * classification; any tool not in the allowlist is blocked regardless.
 */
export const ALWAYS_BLOCKED_TOOLS: Readonly<Record<string, ToolClass>> = {
  send_transaction: "transaction_execute",
  transfer_token: "transaction_execute",
  approve_token: "token_approval",
  sign_typed_data: "signature",
  sign_message: "signature",
  import_private_key: "private_key_management",
  create_encrypted_keystore: "private_key_management",
  unlock_keystore: "private_key_management",
  import_encrypted_private_key: "private_key_management",
  remove_private_key: "private_key_management",
};

/** Default env values (constitution §10). */
export const DEFAULTS = {
  upstreamCommand: "bunx wallet-agent@latest",
  upstreamTransport: "stdio" as const,
  chainLabel: "monad-testnet",
  auditPath: "./.compass/audit.jsonl",
  agentId: "claude_code",
  connectTimeoutMs: 30_000,
  callTimeoutMs: 30_000,
  /** Public npm registry override resolving W0-BLOCKER-001. */
  npmRegistry: "https://registry.npmjs.org/",
} as const;

/** Max serialized size of tools/call arguments accepted before validation fails. */
export const MAX_ARGS_BYTES = 256 * 1024;

/**
 * Environment variables safe to forward to the spawned upstream. Secret-bearing vars are
 * never forwarded verbatim. `npm_config_registry` is injected separately.
 */
export const UPSTREAM_ENV_ALLOWLIST: readonly string[] = [
  "PATH",
  "HOME",
  "SHELL",
  "LANG",
  "LC_ALL",
  "TMPDIR",
  "TERM",
  "USER",
  "BUN_INSTALL",
];
