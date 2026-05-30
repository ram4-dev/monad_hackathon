/** Shared test helpers. */

import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { DEFAULTS } from "../../shared/constants/index.ts";
import type { ProxyConfig } from "../../shared/types/index.ts";

export function tempAuditPath(): string {
  return join(tmpdir(), `compass-audit-${randomUUID()}.jsonl`);
}

export function cleanup(path: string): void {
  try {
    rmSync(path, { force: true });
  } catch {
    // ignore
  }
}

export function testConfig(overrides: Partial<ProxyConfig> = {}): ProxyConfig {
  return {
    upstreamCommand: DEFAULTS.upstreamCommand,
    upstreamTransport: "stdio",
    chainLabel: DEFAULTS.chainLabel,
    policyPath: null,
    auditPath: tempAuditPath(),
    agentId: DEFAULTS.agentId,
    connectTimeoutMs: 5_000,
    callTimeoutMs: 5_000,
    ...overrides,
  };
}
