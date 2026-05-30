#!/usr/bin/env bun
/**
 * compass-proxy entrypoint (W1).
 *
 * Usage:
 *   compass-proxy --upstream "bunx wallet-agent@latest" --chain monad-testnet --policy ./policy.monad.json
 *
 * Resolves config from CLI flags + COMPASS_* env (constitution §10), starts the audit log,
 * connects the upstream MCP client, and serves the host MCP server over stdio. If the upstream
 * fails to start, the proxy stays alive and still serves the Compass meta-tools.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { UpstreamClient } from "../mcp/proxy/upstreamClient.ts";
import { ToolMirror } from "../mcp/proxy/toolMirror.ts";
import { CallInterceptor } from "../mcp/proxy/callInterceptor.ts";
import { startProxyServer } from "../mcp/proxy/server.ts";
import { AuditLog } from "../back/services/audit/auditLog.ts";
import { DEFAULTS } from "../shared/constants/index.ts";
import type { ProxyConfig, UpstreamTransport } from "../shared/types/index.ts";

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

export function resolveConfig(argv: string[], env: Record<string, string | undefined>): ProxyConfig {
  const flags = parseArgs(argv);
  const transport = (env.COMPASS_UPSTREAM_TRANSPORT ?? DEFAULTS.upstreamTransport) as UpstreamTransport;
  return {
    upstreamCommand: flags.upstream ?? env.COMPASS_UPSTREAM_CMD ?? DEFAULTS.upstreamCommand,
    upstreamTransport: transport,
    chainLabel: flags.chain ?? DEFAULTS.chainLabel,
    policyPath: flags.policy ?? env.COMPASS_POLICY_PATH ?? null,
    auditPath: env.COMPASS_AUDIT_PATH ?? DEFAULTS.auditPath,
    agentId: env.COMPASS_DEMO_AGENT_ID ?? DEFAULTS.agentId,
    connectTimeoutMs: DEFAULTS.connectTimeoutMs,
    callTimeoutMs: DEFAULTS.callTimeoutMs,
  };
}

async function main(): Promise<void> {
  const config = resolveConfig(process.argv.slice(2), process.env);

  const audit = new AuditLog(config.auditPath, config.agentId);
  audit.record({ action: "proxy_started", result: "success", source: "system", metadata: { transport: config.upstreamTransport, chain_label: config.chainLabel } });

  const upstream = new UpstreamClient(config);
  await upstream.connect();
  const state = upstream.getState();
  if (state.connected) {
    audit.record({
      action: "upstream_connected",
      result: "success",
      source: "system",
      metadata: {
        server_name: state.serverName ?? undefined,
        server_version: state.serverVersion ?? undefined,
        upstream_tool_count: state.upstreamToolCount,
      },
    });
  } else {
    audit.record({ action: "upstream_unavailable", result: "failed", source: "system", metadata: { reason_code: "upstream_connect_failed" } });
  }

  const mirror = new ToolMirror(upstream);
  const interceptor = new CallInterceptor(upstream, audit);

  const transport = new StdioServerTransport();
  await startProxyServer({ config, upstream, mirror, interceptor, audit }, transport);

  const shutdown = async (): Promise<void> => {
    await upstream.shutdown();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

// Only run when executed directly (not when imported by tests).
if (import.meta.main) {
  main().catch(() => process.exit(1));
}
