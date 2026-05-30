/**
 * Assembles the W4/W5 guarded pipeline for the live proxy: on-chain policy read (W3) + action
 * coverage (W5) + guarded forward (W4) + LLM veto (W4, Azure from env). Returned as a GuardedRunner
 * the CallInterceptor invokes on the forward path. Built only when a policy contract is configured.
 */

import { coverToolCall, createPolicySourceConfig, IdempotencyStore, createJsonRpcTransport, buildSimulationEvidence } from "./guardedForwardBridge.ts";
import { createMonadPolicyTransport } from "./monadPolicyTransport.ts";
import type { GuardedRunner } from "./callInterceptor.ts";
import type { SafeError } from "../../shared/types/index.ts";

export type GuardedPipelineConfig = {
  rpcUrl: string;
  policyContractAddress: string;
};

const MUTATION_TOOLS = new Set(["send_transaction", "transfer_token", "approve_token", "sign_typed_data"]);

/** Parse a MON/ether decimal or wei string/number into a 0x wei hex string. */
function toWeiHex(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  try {
    if (s.includes(".")) {
      const [whole, frac = ""] = s.split(".");
      const fracPad = (frac + "0".repeat(18)).slice(0, 18);
      return "0x" + (BigInt(whole || "0") * 10n ** 18n + BigInt(fracPad || "0")).toString(16);
    }
    // integer: treat large values as wei, small (<1e9) as MON for convenience
    const n = BigInt(s);
    const wei = n < 1_000_000_000n ? n * 10n ** 18n : n;
    return "0x" + wei.toString(16);
  } catch {
    return undefined;
  }
}

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
  const rpc = createJsonRpcTransport({ rpcUrl });
  const idempotencyStore = new IdempotencyStore();
  const signer = process.env.COMPASS_DEMO_SIGNER;

  return {
    async run(toolName, args, forward) {
      let simulation: Record<string, unknown> | undefined;
      let consent: Record<string, unknown> | undefined;

      // For mutations, build real Monad simulation evidence + explicit consent (the on-chain
      // allowlist is the operator's pre-authorization for these targets/caps).
      if (MUTATION_TOOLS.has(toolName)) {
        const to = (args.to ?? args.recipient ?? args.recipientAddress) as string | undefined;
        const value = toWeiHex(args.value ?? args.amount);
        try {
          simulation = await buildSimulationEvidence({
            transport: rpc,
            tx: { ...(signer ? { from: signer } : {}), ...(to ? { to } : {}), ...(value ? { value } : {}) },
          });
        } catch {
          simulation = { simulation: { status: "unavailable" } } as unknown as Record<string, unknown>;
        }
        consent = {
          network: "monad-testnet",
          account: signer ?? "upstream",
          target: to ?? args.spender ?? "n/a",
          asset: args.token ? "ERC20" : "MON",
          max_amount: String(args.value ?? args.amount ?? "0"),
        };
      }

      const res = (await coverToolCall({
        toolName,
        args,
        ctx: { chainId: 10143 },
        policySource: { config: cfg.config, transport },
        ...(simulation ? { simulation: (simulation as { simulation?: Record<string, unknown> }).simulation ?? simulation } : {}),
        ...(consent ? { consent } : {}),
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
