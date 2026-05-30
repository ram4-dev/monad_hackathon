import { test, expect, describe } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createProxyServer } from "../mcp/proxy/server.ts";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { ToolMirror } from "../mcp/proxy/toolMirror.ts";
import { CallInterceptor } from "../mcp/proxy/callInterceptor.ts";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { buildCompassStatus } from "../mcp/tools/compassStatus.ts";
import { createMockUpstream } from "./fixtures/mock-upstream.ts";
import { testConfig, cleanup } from "./fixtures/helpers.ts";

describe("compass meta-tools", () => {
  test("compass_status reflects connected upstream and W2-filtered exposed tool count", async () => {
    const mock = createMockUpstream();
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, mock.factory);
    await upstream.connect();
    const mirror = new ToolMirror(upstream);

    const status = buildCompassStatus(cfg, upstream, mirror);
    expect(status.upstream.connected).toBe(true);
    expect(status.upstream.managed_by_compass).toBe(true);
    expect(status.upstream.server_name).toBe("wallet-agent");
    expect(status.upstream.upstream_tool_count).toBe(42);
    expect(status.exposed_tool_count).toBe(5);
    expect(status.chain_label).toBe("monad-testnet");

    await upstream.shutdown();
    await mock.close();
    cleanup(cfg.auditPath);
  });

  test("compass_status answers even when the upstream is unavailable", async () => {
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, () => {
      throw new Error("down");
    });
    await upstream.connect();
    const mirror = new ToolMirror(upstream);

    const status = buildCompassStatus(cfg, upstream, mirror);
    expect(status.upstream.connected).toBe(false);
    expect(status.upstream.reason).toBeTruthy();
    cleanup(cfg.auditPath);
  });

  test("meta-tools are callable via the host MCP path and are not forwarded", async () => {
    const mock = createMockUpstream();
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, mock.factory);
    await upstream.connect();
    const audit = new AuditLog(cfg.auditPath, cfg.agentId);
    const mirror = new ToolMirror(upstream);
    const interceptor = new CallInterceptor(upstream, audit);
    const server = createProxyServer({ config: cfg, upstream, mirror, interceptor, audit });

    const [ct, st] = InMemoryTransport.createLinkedPair();
    await server.connect(st);
    const host = new Client({ name: "host", version: "0.0.0" }, { capabilities: {} });
    await host.connect(ct);

    const statusRes = (await host.callTool({ name: "compass_status", arguments: {} })) as {
      structuredContent?: { exposed_tool_count?: number };
    };
    expect(statusRes.structuredContent?.exposed_tool_count).toBe(5);

    // generate one audit event then read it back
    await host.callTool({ name: "compass_audit_events", arguments: { limit: 10 } });
    const auditRes = (await host.callTool({ name: "compass_audit_events", arguments: { limit: 10 } })) as {
      structuredContent?: { count?: number };
    };
    expect(typeof auditRes.structuredContent?.count).toBe("number");

    await host.close();
    await upstream.shutdown();
    await mock.close();
    cleanup(cfg.auditPath);
  });
});
