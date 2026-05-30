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

async function buildHostClient() {
  const mock = createMockUpstream();
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

describe("host-facing tools/list", () => {
  test("returns an empty list in W1 even though the upstream exposes 42 tools", async () => {
    const ctx = await buildHostClient();
    expect(ctx.upstream.getUpstreamToolNames().length).toBe(42);

    const listed = await ctx.host.listTools();
    expect(listed.tools).toEqual([]);

    await ctx.host.close();
    await ctx.upstream.shutdown();
    await ctx.mock.close();
    cleanup(ctx.auditPath);
  });

  test("no upstream tool name is advertised to the host", async () => {
    const ctx = await buildHostClient();
    const listed = await ctx.host.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).not.toContain("get_balance");
    expect(names).not.toContain("send_transaction");

    await ctx.host.close();
    await ctx.upstream.shutdown();
    await ctx.mock.close();
    cleanup(ctx.auditPath);
  });
});
