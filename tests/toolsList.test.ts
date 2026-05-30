import { test, expect, describe } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createProxyServer } from "../mcp/proxy/server.ts";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { ToolMirror } from "../mcp/proxy/toolMirror.ts";
import { CallInterceptor } from "../mcp/proxy/callInterceptor.ts";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { createMockUpstream } from "./fixtures/mock-upstream.ts";
import { testConfig, cleanup } from "./fixtures/helpers.ts";

async function buildHostClient(options: Parameters<typeof createMockUpstream>[0] = {}) {
  const mock = createMockUpstream(options);
  const config = testConfig();
  const upstream = new UpstreamClient(config, mock.factory);
  await upstream.connect();
  const audit = new AuditLog(config.auditPath, config.agentId);
  const mirror = new ToolMirror(upstream);
  const interceptor = new CallInterceptor(upstream, audit);
  const server = createProxyServer({ config, upstream, mirror, interceptor, audit });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const host = new Client({ name: "test-host", version: "0.0.0" }, { capabilities: {} });
  await host.connect(clientTransport);

  return { host, upstream, mock, server, auditPath: config.auditPath };
}

async function closeCtx(ctx: Awaited<ReturnType<typeof buildHostClient>>) {
  await ctx.host.close();
  await ctx.upstream.shutdown();
  await ctx.mock.close();
  cleanup(ctx.auditPath);
}

describe("host-facing tools/list", () => {
  test("returns W2 registry-filtered default-allow tools from the upstream inventory", async () => {
    const ctx = await buildHostClient();
    expect(ctx.upstream.getUpstreamToolNames().length).toBe(42);

    const listed = await ctx.host.listTools();
    const names = listed.tools.map((t) => t.name).sort();

    expect(names).toEqual([
      "estimate_gas",
      "get_balance",
      "get_token_balance",
      "get_wallet_info",
      "simulate_transaction",
    ]);
    expect(listed.tools.every((tool) => tool.inputSchema?.type === "object")).toBe(true);

    await closeCtx(ctx);
  });

  test("does not advertise unmapped, private-key, schema-drifted, or default-block tools", async () => {
    const ctx = await buildHostClient({ driftTools: ["get_balance"] });
    const listed = await ctx.host.listTools();
    const names = listed.tools.map((t) => t.name);

    expect(names).not.toContain("get_balance");
    expect(names).not.toContain("send_transaction");
    expect(names).not.toContain("transfer_token");
    expect(names).not.toContain("approve_token");
    expect(names).not.toContain("sign_typed_data");
    expect(names).not.toContain("import_private_key");
    expect(names).not.toContain("connect_wallet");

    await closeCtx(ctx);
  });
});
