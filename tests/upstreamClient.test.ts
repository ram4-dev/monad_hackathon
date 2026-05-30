import { test, expect, describe } from "bun:test";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { createMockUpstream } from "./fixtures/mock-upstream.ts";
import { testConfig } from "./fixtures/helpers.ts";

describe("upstream adapter", () => {
  test("connects, completes handshake, and caches the upstream inventory", async () => {
    const mock = createMockUpstream();
    const upstream = new UpstreamClient(testConfig(), mock.factory);
    await upstream.connect();

    const state = upstream.getState();
    expect(state.connected).toBe(true);
    expect(state.managedByCompass).toBe(true);
    expect(state.serverName).toBe("wallet-agent");
    expect(state.serverVersion).toBe("0.1.0");
    expect(state.upstreamToolCount).toBe(42);
    expect(upstream.getUpstreamToolNames()).toContain("get_balance");

    await upstream.shutdown();
    await mock.close();
  });

  test("forwards a read-only call and returns the upstream result", async () => {
    const mock = createMockUpstream();
    const upstream = new UpstreamClient(testConfig(), mock.factory);
    await upstream.connect();

    const result = (await upstream.callTool("get_balance", {})) as { structuredContent?: { symbol?: string } };
    expect(result.structuredContent?.symbol).toBe("MON");

    await upstream.shutdown();
    await mock.close();
  });

  test("connect never throws and reports a safe reason when the transport factory fails", async () => {
    const upstream = new UpstreamClient(testConfig(), () => {
      throw new Error("boom: secret-looking detail");
    });
    await upstream.connect();

    const state = upstream.getState();
    expect(state.connected).toBe(false);
    expect(state.reason).toBeTruthy();
    // Safe reason must not echo the raw error text.
    expect(state.reason).not.toContain("secret-looking");
  });

  test("rejects unsupported transport via the default factory", async () => {
    const upstream = new UpstreamClient(testConfig({ upstreamTransport: "http" as unknown as "stdio" }));
    await upstream.connect();
    expect(upstream.getState().connected).toBe(false);
  });
});
