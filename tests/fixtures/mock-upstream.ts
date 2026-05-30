/**
 * Deterministic mock upstream for W1 tests.
 *
 * Builds an MCP Server that advertises the real Wallet Agent tool inventory captured in W0
 * (wallet-agent-tools-list.sanitized.json) and implements canned handlers for the read-only /
 * simulation tools. It is linked to the UpstreamClient via an in-memory transport pair, so tests
 * never spawn a process or touch the network.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(
  here,
  "../../openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json",
);

type FixtureTool = { name: string; description?: string; inputSchema?: Record<string, unknown> };

export function loadUpstreamTools(): FixtureTool[] {
  const raw = JSON.parse(readFileSync(FIXTURE, "utf8")) as { tools?: FixtureTool[] } | FixtureTool[];
  return Array.isArray(raw) ? raw : (raw.tools ?? []);
}

export function loadUpstreamToolNames(): string[] {
  return loadUpstreamTools().map((t) => t.name);
}

/** Canned read-only/simulation responses, keyed by tool name. */
const CANNED_RESULTS: Record<string, unknown> = {
  get_wallet_info: { address: "0x0000000000000000000000000000000000000001", chainId: 10143 },
  get_balance: { balance: "0.000980740085998415", symbol: "MON", chainId: 10143 },
  get_token_balance: { balance: "0", token: "0x0000000000000000000000000000000000000002" },
  estimate_gas: { gas: "21000" },
  simulate_transaction: { success: true, gasUsed: "21000" },
};

export type MockUpstreamOptions = {
  /** If true, every callTool throws, simulating an upstream that errors. */
  failCalls?: boolean;
  /** Tool names whose schema should be intentionally drifted for W2 integration tests. */
  driftTools?: string[];
};

/**
 * Create a client-side transport linked to a running mock upstream Server. Pass the returned
 * factory to `new UpstreamClient(config, factory)`.
 */
export function createMockUpstream(options: MockUpstreamOptions = {}): {
  factory: () => Transport;
  toolNames: string[];
  close: () => Promise<void>;
} {
  const tools = loadUpstreamTools().map((tool) =>
    options.driftTools?.includes(tool.name)
      ? { ...tool, inputSchema: { type: "object" as const, properties: { drifted: { type: "boolean" } } } }
      : tool,
  );
  const toolNames = tools.map((tool) => tool.name);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const server = new Server({ name: "wallet-agent", version: "0.1.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema ?? { type: "object" as const } })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (options.failCalls) {
      throw new Error("mock upstream forced failure");
    }
    const canned = CANNED_RESULTS[request.params.name];
    return {
      content: [{ type: "text" as const, text: JSON.stringify(canned ?? { ok: true }) }],
      structuredContent: (canned ?? { ok: true }) as Record<string, unknown>,
    };
  });

  // Connect the server side immediately; the client side is returned via the factory.
  void server.connect(serverTransport);

  return {
    factory: () => clientTransport,
    toolNames,
    close: async () => {
      await server.close();
    },
  };
}
