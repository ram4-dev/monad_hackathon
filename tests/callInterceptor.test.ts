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

describe("call interceptor classification (plan)", () => {
  const cfg = testConfig();
  const upstream = new UpstreamClient(cfg);
  const { interceptor } = buildInterceptor(upstream, cfg.auditPath);

  test("meta-tools are classified as meta", () => {
    expect(interceptor.plan("compass_status", {}).outcome.kind).toBe("meta");
    expect(interceptor.plan("compass_audit_events", {}).outcome.kind).toBe("meta");
  });

  test("provisional read-only tools forward", () => {
    for (const name of ["get_wallet_info", "get_balance", "get_token_balance", "estimate_gas", "simulate_transaction"]) {
      expect(interceptor.plan(name, {}).outcome.kind).toBe("forward");
    }
  });

  test("write/approval/signature tools are blocked with POLICY_BLOCKED", () => {
    for (const name of ["send_transaction", "transfer_token", "approve_token", "sign_typed_data"]) {
      const outcome = interceptor.plan(name, {}).outcome;
      expect(outcome.kind).toBe("block");
      if (outcome.kind === "block") expect(outcome.error.error_code).toBe("POLICY_BLOCKED");
    }
  });

  test("private-key tools are blocked before any upstream contact", () => {
    const outcome = interceptor.plan("import_private_key", {}).outcome;
    expect(outcome.kind).toBe("block");
  });

  test("unknown tools are blocked with UNMAPPED_TOOL", () => {
    const outcome = interceptor.plan("totally_unknown_tool", {}).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("UNMAPPED_TOOL");
  });

  test("dry_run_transaction is not allowlisted (W0-BLOCKER-009)", () => {
    expect(interceptor.plan("dry_run_transaction", {}).outcome.kind).toBe("block");
  });

  test("oversized/invalid args are rejected with MISSING_REQUIRED_EVIDENCE", () => {
    const huge = { blob: "x".repeat(300 * 1024) };
    const outcome = interceptor.plan("get_balance", huge).outcome;
    expect(outcome.kind).toBe("block");
    if (outcome.kind === "block") expect(outcome.error.error_code).toBe("MISSING_REQUIRED_EVIDENCE");
  });
});

describe("call interceptor forwarding (handleUpstreamCall)", () => {
  test("allowlisted read-only call forwards once and audits", async () => {
    const mock = createMockUpstream();
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, mock.factory);
    await upstream.connect();
    const { interceptor, audit } = buildInterceptor(upstream, cfg.auditPath);

    const result = await interceptor.handleUpstreamCall("get_balance", {});
    expect(result.ok).toBe(true);

    const events = audit.tail(10);
    expect(events.some((e) => e.action === "tool_call_received")).toBe(true);
    expect(events.some((e) => e.action === "tool_call_forwarded")).toBe(true);

    await upstream.shutdown();
    await mock.close();
    cleanup(cfg.auditPath);
  });

  test("blocked call never reaches the upstream and audits a block", async () => {
    const mock = createMockUpstream();
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, mock.factory);
    await upstream.connect();
    const { interceptor, audit } = buildInterceptor(upstream, cfg.auditPath);

    const result = await interceptor.handleUpstreamCall("send_transaction", { to: "0x0", value: "1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.error_code).toBe("POLICY_BLOCKED");

    const events = audit.tail(10);
    expect(events.some((e) => e.action === "tool_call_blocked")).toBe(true);
    expect(events.some((e) => e.action === "tool_call_forwarded")).toBe(false);

    await upstream.shutdown();
    await mock.close();
    cleanup(cfg.auditPath);
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
