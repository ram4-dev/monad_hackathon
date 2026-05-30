#!/usr/bin/env node
// W6 end-to-end smoke: drive the LIVE compass-proxy with the guarded pipeline enabled
// (on-chain policy read + LLM veto) against the real wallet-agent upstream on Monad Testnet.
//
// Reads .env for Azure + RPC + deployer; sets POLICY_CONTRACT_ADDRESS so the proxy enables W4/W5.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync } from "node:fs";

const env = { ...process.env };
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
env.PATH = `${env.HOME}/.bun/bin:${env.PATH}`;
env.POLICY_CONTRACT_ADDRESS = env.POLICY_CONTRACT_ADDRESS || "0xf46fE939a947b6b300D9727ef94A2AbbCE07586C";
env.MONAD_RPC_URL = env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz";
env.npm_config_registry = "https://registry.npmjs.org/";

const transport = new StdioClientTransport({
  command: `${env.HOME}/.bun/bin/bun`,
  args: ["run", "bin/compass-proxy.ts", "--upstream", "bunx wallet-agent@latest", "--chain", "monad-testnet"],
  env,
  stderr: "ignore",
});
const host = new Client({ name: "e2e", version: "0.0.0" }, { capabilities: {} });
await host.connect(transport);

const status = await host.callTool({ name: "compass_status", arguments: {} });
console.log("compass_status.upstream:", JSON.stringify(status.structuredContent?.upstream));

const addr = env.COMPASS_DEMO_RECIPIENT || "0xAaCF452ef1385B2c5555F1097b4915B54359550E";

console.log("\n--- get_balance (read-only, allowlisted on-chain) ---");
const ro = await host.callTool({ name: "get_balance", arguments: { address: addr } });
console.log(ro.isError ? `BLOCKED: ${JSON.stringify(ro.structuredContent?.error)}` : `FORWARDED: ${JSON.stringify(ro.structuredContent).slice(0, 200)}`);

console.log("\n--- send_transaction (mutation, no consent) ---");
const wr = await host.callTool({ name: "send_transaction", arguments: { to: addr, value: "1" } });
console.log(wr.isError ? `BLOCKED/skipped: ${JSON.stringify(wr.structuredContent?.error)}` : `FORWARDED (unexpected): ${JSON.stringify(wr.structuredContent).slice(0, 200)}`);

await host.close();
process.exit(0);
