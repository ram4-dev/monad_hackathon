/**
 * Assembles the W4/W5 guarded pipeline for the live proxy: on-chain policy read (W3) + action
 * coverage (W5) + guarded forward (W4) + LLM veto (W4, Azure from env). Returned as a GuardedRunner
 * the CallInterceptor invokes on the forward path. Built only when a policy contract is configured.
 */

import { coverToolCall, createPolicySourceConfig, IdempotencyStore } from "./guardedForwardBridge.ts";
import { createMonadPolicyTransport } from "./monadPolicyTransport.ts";
import type { GuardedRunner } from "./callInterceptor.ts";
import type { SafeError } from "../../shared/types/index.ts";

export type GuardedPipelineConfig = {
  rpcUrl: string;
  policyContractAddress: string;
};

/**
 * Build the guarded runner. Returns null when the policy-source config is invalid (so the proxy
 * falls back to the W1/W2 path rather than failing to start).
 */
export function buildGuardedRunner({ rpcUrl, policyContractAddress }: GuardedPipelineConfig): GuardedRunner | null {
  const cfg = createPolicySourceConfig({
    chain_id: 10143,
    network_name: "Monad Testnet",
    rpc_url: rpcUrl,
    policy_contract_address: policyContractAddress,
  });
  if (!cfg.ok) return null;

  const transport = createMonadPolicyTransport({ rpcUrl, address: policyContractAddress as `0x${string}` });
  const idempotencyStore = new IdempotencyStore();

  return {
    async run(toolName, args, forward) {
      const res = (await coverToolCall({
        toolName,
        args,
        ctx: { chainId: 10143 },
        policySource: { config: cfg.config, transport },
        forward,
        idempotencyStore,
        env: process.env,
        // LLM: coverToolCall -> guardedForward -> finalSafetyReview builds the Azure client from env.
      })) as { decision: string; result?: unknown; error?: { error_code: string; safe_message: string }; reason?: string };

      if (res.decision === "skipped") return { skipped: true as const, reason: res.reason ?? "skipped" };
      if (res.decision === "allow") return { ok: true as const, result: res.result };
      const error = (res.error ?? { error_code: "INTERNAL_ERROR", safe_message: "Internal error." }) as SafeError;
      return { ok: false as const, error };
    },
  };
}
