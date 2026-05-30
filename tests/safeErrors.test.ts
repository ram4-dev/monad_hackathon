import { test, expect, describe } from "bun:test";
import { sanitizeToSafeError, makeSafeError, safeErrorToToolResult } from "../mcp/proxy/schemas.ts";
import { CallInterceptor } from "../mcp/proxy/callInterceptor.ts";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { createMockUpstream } from "./fixtures/mock-upstream.ts";
import { testConfig, cleanup } from "./fixtures/helpers.ts";

describe("safe errors", () => {
  test("sanitized errors carry a stable code and a generic safe message", () => {
    const err = sanitizeToSafeError("UPSTREAM_ERROR");
    expect(err.error_code).toBe("UPSTREAM_ERROR");
    expect(err.safe_message.length).toBeGreaterThan(0);
  });

  test("safe error tool result does not leak internals", () => {
    const err = makeSafeError("INTERNAL_ERROR", "An internal error occurred.");
    const result = safeErrorToToolResult(err);
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.error_code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(result)).not.toContain("stack");
  });

  test("upstream call failure becomes UPSTREAM_ERROR without raw upstream content", async () => {
    const mock = createMockUpstream({ failCalls: true });
    const cfg = testConfig();
    const upstream = new UpstreamClient(cfg, mock.factory);
    await upstream.connect();
    const audit = new AuditLog(cfg.auditPath, cfg.agentId);
    const interceptor = new CallInterceptor(upstream, audit);

    const result = await interceptor.handleUpstreamCall("get_balance", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error_code).toBe("UPSTREAM_ERROR");
      expect(JSON.stringify(result.error)).not.toContain("forced failure");
    }

    await upstream.shutdown();
    await mock.close();
    cleanup(cfg.auditPath);
  });
});
