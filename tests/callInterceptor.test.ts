import { test, expect, describe } from "bun:test";
import { CallInterceptor } from "../mcp/proxy/callInterceptor.ts";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { createMockUpstream } from "./fixtures/mock-upstream.ts";
import { testConfig, cleanup } from "./fixtures/helpers.ts";

function buildInterceptor(upstream: UpstreamClient, auditPath: string) {
  const audit = new AuditLog(auditPath, "test");
  return { interceptor: new CallInterceptor(upstream, audit), audit };
}

async function buildConnectedInterceptor(options: Parameters<typeof createMockUpstream>[0] = {}) {
  const mock = createMockUpstream(options);
  const cfg = testConfig();
  const upstream = new UpstreamClient(cfg, mock.factory);
  await upstream.connect();
  const built = buildInterceptor(upstream, cfg.auditPath);
  return { ...built, upstream, mock, auditPath: cfg.auditPath };
}

async function closeConnected(ctx: Awaited<ReturnType<typeof buildConnectedInterceptor>>) {
  await ctx.upstream.shutdown();
  await ctx.mock.close();
  cleanup(ctx.auditPath);
}

describe("call interceptor W2 registry planning", () => {
  test("meta-tools are classified as meta", () => {
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg);
    const { interceptor } = buildInterceptor(upstream, cfg.auditPath);
    expect(interceptor.plan("compass_status", {}).outcome.kind).toBe("meta");
    expect(interceptor.plan("compass_audit_events", {}).outcome.kind).toBe("meta");
    cleanup(cfg.auditPath);
  });

  test("schema-compatible default-allow tools forward", async () => {
    const ctx = await buildConnectedInterceptor();
    for (const name of ["get_wallet_info", "get_balance", "get_token_balance", "estimate_gas", "simulate_transaction"]) {
      expect(ctx.interceptor.plan(name, {}).outcome.kind).toBe("forward");
    }
    await closeConnected(ctx);
  });

  test("write/approval/signature tools are registered but default-blocked with POLICY_BLOCKED", async () => {
    const ctx = await buildConnectedInterceptor();
    for (const name of ["send_transaction", "transfer_token", "approve_token", "sign_typed_data"]) {
      const outcome = ctx.interceptor.plan(name, {}).outcome;
      expect(outcome.kind).toBe("block");
      if (outcome.kind === "block") expect(outcome.error.error_code).toBe("POLICY_BLOCKED");
    }
    await closeConnected(ctx);
  });

  test("private-key tools are blocked before policy", async () => {
    const ctx = await buildConnectedInterceptor();
    const outcome = ctx.interceptor.plan("import_private_key", {}).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("PRIVATE_KEY_MANAGEMENT_BLOCKED");
    await closeConnected(ctx);
  });

  test("unknown and dangerous tools are blocked with W2 safe reason codes", async () => {
    const ctx = await buildConnectedInterceptor();
    const unknown = ctx.interceptor.plan("totally_unknown_tool", {}).outcome;
    const dangerous = ctx.interceptor.plan("write_contract", {}).outcome;

    expect(unknown.kind).toBe("block");
    if (unknown.kind === "block") expect(unknown.error.error_code).toBe("UNMAPPED_TOOL");
    expect(dangerous.kind).toBe("block");
    if (dangerous.kind === "block") expect(dangerous.error.error_code).toBe("DANGEROUS_TOOL_BLOCKED");
    await closeConnected(ctx);
  });

  test("dry_run_transaction is unsupported with W0-BLOCKER-009 semantics", async () => {
    const ctx = await buildConnectedInterceptor();
    const outcome = ctx.interceptor.plan("dry_run_transaction", {}).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("UNSUPPORTED_TOOL");
    await closeConnected(ctx);
  });

  test("schema drift blocks before policy", async () => {
    const ctx = await buildConnectedInterceptor({ driftTools: ["get_balance"] });
    const outcome = ctx.interceptor.plan("get_balance", {}).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("SCHEMA_DRIFT");
    await closeConnected(ctx);
  });

  test("oversized/invalid args are rejected with MISSING_REQUIRED_EVIDENCE", () => {
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg);
    const { interceptor } = buildInterceptor(upstream, cfg.auditPath);
    const huge = { blob: "x".repeat(300 * 1024) };
    const outcome = interceptor.plan("get_balance", huge).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("MISSING_REQUIRED_EVIDENCE");
    cleanup(cfg.auditPath);
  });
});

describe("call interceptor forwarding (handleUpstreamCall)", () => {
  test("schema-compatible default-allow call forwards once and audits", async () => {
    const ctx = await buildConnectedInterceptor();

    const result = await ctx.interceptor.handleUpstreamCall("get_balance", {});
    expect(result.ok).toBe(true);

    const events = ctx.audit.tail(10);
    expect(events.some((e) => e.action === "tool_call_received")).toBe(true);
    expect(events.some((e) => e.action === "tool_call_forwarded")).toBe(true);

    await closeConnected(ctx);
  });

  test("default-block registered call never reaches the upstream and audits a block", async () => {
    const ctx = await buildConnectedInterceptor();

    const result = await ctx.interceptor.handleUpstreamCall("send_transaction", { to: "0x0", value: "1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error_code).toBe("POLICY_BLOCKED");

    const events = ctx.audit.tail(10);
    expect(events.some((e) => e.action === "tool_call_blocked")).toBe(true);
    expect(events.some((e) => e.action === "tool_call_forwarded")).toBe(false);

    await closeConnected(ctx);
  });

  test("forward path when upstream is down yields UPSTREAM_UNAVAILABLE", async () => {
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, () => {
      throw new Error("down");
    });
    await upstream.connect();
    const { interceptor } = buildInterceptor(upstream, cfg.auditPath);

    const result = await interceptor.handleUpstreamCall("get_balance", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error_code).toBe("UPSTREAM_UNAVAILABLE");
    cleanup(cfg.auditPath);
  });
});
