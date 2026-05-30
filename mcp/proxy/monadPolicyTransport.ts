/**
 * Monad Testnet policy-read transport for the W3 policy-source client.
 *
 * Provides the `{ request, readContract }` interface that `fetchPolicySnapshot` expects, backed by
 * viem (the Monad-recommended library). `request` issues raw JSON-RPC; `readContract` decodes the
 * CompassPolicy ABI and normalizes results to ARRAY form (the client destructures tuples), keeping
 * struct array elements as objects (which the client also handles).
 *
 * This lives on the TS/runtime side; the pure-JS coding-agent package only receives the transport
 * object and never imports viem.
 */

import { createPublicClient, http, parseAbi } from "viem";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { COMPASS_POLICY_ABI } = require("../../packages/coding-agent/src/policy-source/index.js") as {
  COMPASS_POLICY_ABI: string[];
};

const ABI = parseAbi(COMPASS_POLICY_ABI);

const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [] as string[] } },
} as const;

export type PolicyTransport = {
  request: (req: { method: string; params?: unknown[] }) => Promise<unknown>;
  readContract: (req: { functionName: string; args?: unknown[] }) => Promise<unknown>;
};

/** Normalize a viem decode result to the array form the policy client destructures. */
function toArrayForm(result: unknown): unknown {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object") return Object.values(result as Record<string, unknown>);
  return result;
}

export function createMonadPolicyTransport({ rpcUrl, address }: { rpcUrl: string; address: `0x${string}` }): PolicyTransport {
  const client = createPublicClient({
    chain: { ...MONAD_TESTNET, rpcUrls: { default: { http: [rpcUrl] } } },
    transport: http(rpcUrl),
  });

  return {
    async request({ method, params = [] }) {
      // Raw JSON-RPC passthrough (eth_chainId, eth_getCode, eth_blockNumber).
      return client.request({ method: method as never, params: params as never });
    },
    async readContract({ functionName, args = [] }) {
      const result = await client.readContract({ address, abi: ABI, functionName: functionName as never, args: args as never });
      return toArrayForm(result);
    },
  };
}
