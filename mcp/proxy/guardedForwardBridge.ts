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

export type CoverToolCallParams = {
  toolName: string;
  args?: Record<string, unknown>;
  ctx?: Record<string, unknown>;
  policySource?: GuardedForwardParams["policySource"];
  simulation?: Record<string, unknown>;
  consent?: Record<string, unknown>;
  llm?: GuardedForwardParams["llm"];
  env?: Record<string, string | undefined>;
  forward: GuardedForwardParams["forward"];
  idempotencyStore?: GuardedForwardParams["idempotencyStore"];
  auditWriter?: GuardedForwardParams["auditWriter"];
};

export type CoverToolCallResult =
  | GuardedForwardResult
  | { decision: "skipped"; reason: string; missing_consent?: string[]; record: Record<string, unknown> };

const guardedForwardModule = require("../../packages/coding-agent/src/guarded-forward/index.js") as GuardedForwardModule;
const idempotencyModule = require("../../packages/coding-agent/src/idempotency/index.js") as {
  IdempotencyStore: GuardedForwardModule["IdempotencyStore"];
};
const actionCoverageModule = require("../../packages/coding-agent/src/action-coverage/index.js") as {
  coverToolCall: (params: CoverToolCallParams) => Promise<CoverToolCallResult>;
};
const policySourceModule = require("../../packages/coding-agent/src/policy-source/index.js") as {
  createPolicySourceConfig: (input?: unknown, opts?: unknown) => { ok: boolean; config?: unknown; error?: unknown };
};
const monadRpcModule = require("../../packages/coding-agent/src/monad-rpc/index.js") as {
  createJsonRpcTransport: (opts: { rpcUrl: string }) => { request: (r: { method: string; params?: unknown[] }) => Promise<unknown> };
  buildSimulationEvidence: (params: {
    transport: { request: Function };
    tx: { from?: string; to?: string; value?: string; data?: string };
    fee?: { maxFeePerGasWei?: string | bigint };
  }) => Promise<{ simulation: { status: string }; estimated_gas_cost_wei?: string; gas_limit?: string }>;
};

export const createJsonRpcTransport = monadRpcModule.createJsonRpcTransport;
export const buildSimulationEvidence = monadRpcModule.buildSimulationEvidence;

/** Run the W4 guarded-forward pipeline for one host tools/call. */
export function guardedForward(params: GuardedForwardParams): Promise<GuardedForwardResult> {
  return guardedForwardModule.guardedForward(params);
}

/** Run the W5 action-coverage entry (evidence extraction + consent gate + guarded forward). */
export function coverToolCall(params: CoverToolCallParams): Promise<CoverToolCallResult> {
  return actionCoverageModule.coverToolCall(params);
}

/** Build a W3 policy-source config (binding validation) from env/options. */
export function createPolicySourceConfig(input?: unknown, opts?: unknown): { ok: boolean; config?: unknown; error?: unknown } {
  return policySourceModule.createPolicySourceConfig(input, opts);
}

export const IdempotencyStore = idempotencyModule.IdempotencyStore;
