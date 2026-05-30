import { test, expect, describe } from "bun:test";
import { readFileSync } from "node:fs";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { tempAuditPath, cleanup } from "./fixtures/helpers.ts";

describe("audit log", () => {
  test("appends one JSON line per event and preserves prior events", () => {
    const path = tempAuditPath();
    const audit = new AuditLog(path, "test");
    audit.record({ action: "proxy_started", result: "success" });
    audit.record({ action: "tools_list_served", result: "success" });

    const lines = readFileSync(path, "utf8").split("\n").filter((l) => l.trim());
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]!).action).toBe("proxy_started");
    expect(JSON.parse(lines[1]!).action).toBe("tools_list_served");
    cleanup(path);
  });

  test("each event has an id, timestamp, and the agent id", () => {
    const path = tempAuditPath();
    const audit = new AuditLog(path, "claude_code");
    const ev = audit.record({ action: "tool_call_received", result: "pending", toolName: "get_balance", correlationId: "abc" });
    expect(ev.event_id).toBeTruthy();
    expect(ev.timestamp).toBeTruthy();
    expect(ev.agent_id).toBe("claude_code");
    expect(ev.correlation_id).toBe("abc");
    cleanup(path);
  });

  test("metadata redaction drops non-allowlisted and non-primitive keys", () => {
    const path = tempAuditPath();
    const audit = new AuditLog(path, "test");
    const ev = audit.record({
      action: "tool_call_forwarded",
      result: "success",
      metadata: {
        transport: "stdio", // allowlisted primitive -> kept
        secret_key: "0xdeadbeefprivatekey", // not allowlisted -> dropped
        raw_payload: { to: "0x", value: "1" }, // not allowlisted + object -> dropped
      },
    });
    expect(ev.metadata?.transport).toBe("stdio");
    expect(ev.metadata && "secret_key" in ev.metadata).toBe(false);
    expect(ev.metadata && "raw_payload" in ev.metadata).toBe(false);

    const persisted = readFileSync(path, "utf8");
    expect(persisted).not.toContain("privatekey");
    cleanup(path);
  });

  test("tail returns the most recent N events", () => {
    const path = tempAuditPath();
    const audit = new AuditLog(path, "test");
    for (let i = 0; i < 5; i++) audit.record({ action: "tools_list_served", result: "success" });
    expect(audit.tail(3).length).toBe(3);
    expect(audit.tail(100).length).toBe(5);
    cleanup(path);
  });
});
