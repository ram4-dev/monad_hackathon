/**
 * Bridge from the W1 TypeScript proxy to the W4 CommonJS guarded-forward orchestrator.
 *
 * Mirrors the W2 `toolSemanticsBridge.ts` pattern: the security logic lives in the
 * `packages/coding-agent` package (pure JS, reusing W2 tool-semantics + W3 policy/risk/audit),
 * and this seam exposes a typed entry point the runtime can call on `tools/call`.
 *
 * The runtime injects: the on-chain policy source (a `{ config, transport }` reading the
 * deployed Monad Testnet policy contract, or a preloaded `{ snapshot }`), the upstream `forward`
 * callback, an idempotency store, and (optionally) an LLM client. With none configured, the
 * orchestrator fails closed.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export type GuardedForwardCall = {
  toolName: string;
  inputSchemaHash?: string;
  args?: Record<string, unknown>;
};

export type GuardedForwardParams = {
  call: GuardedForwardCall;
  evidence?: Record<string, unknown>;
  policySource?:
    | { snapshot: unknown }
    | { failure: unknown }
    | { config: unknown; transport: { request: Function; readContract: Function } };
  llm?: { review: (context: unknown) => Promise<{ verdict: string; reason?: string }> };
  env?: Record<string, string | undefined>;
  forward: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  idempotencyStore?: { runOnce: (key: string, fn: () => Promise<unknown>) => Promise<{ reused: boolean; result: unknown }> };
  auditWriter?: (event: Record<string, unknown>) => Promise<void>;
  now?: () => number;
};

export type GuardedForwardResult = {
  decision: "allow" | "block";
  result?: unknown;
  error?: { error_code: string; safe_message: string; debug_ref?: string };
  record: Record<string, unknown>;
  digest?: string;
  idempotency_key?: string;
  reused?: boolean;
};

type GuardedForwardModule = {
  guardedForward: (params: GuardedForwardParams) => Promise<GuardedForwardResult>;
  IdempotencyStore: new (opts?: { now?: () => number }) => GuardedForwardParams["idempotencyStore"];
};

const guardedForwardModule = require("../../packages/coding-agent/src/guarded-forward/index.js") as GuardedForwardModule;
const idempotencyModule = require("../../packages/coding-agent/src/idempotency/index.js") as {
  IdempotencyStore: GuardedForwardModule["IdempotencyStore"];
};

/** Run the W4 guarded-forward pipeline for one host tools/call. */
export function guardedForward(params: GuardedForwardParams): Promise<GuardedForwardResult> {
  return guardedForwardModule.guardedForward(params);
}

export const IdempotencyStore = idempotencyModule.IdempotencyStore;
