/**
 * compass_status meta-tool (handled locally, never forwarded upstream).
 *
 * Reports in-memory proxy state: transport, chain config label, upstream connection state and
 * serverInfo, internal upstream tool count, host-exposed tool count (0 in W1), audit path, and
 * the internal-management attestation for the no-bypass guarantee. No secrets are included.
 */

import type { ProxyConfig } from "../../shared/types/index.ts";
import type { UpstreamClient } from "../proxy/upstreamClient.ts";
import type { ToolMirror } from "../proxy/toolMirror.ts";

export type CompassStatus = {
  proxy: { name: "compass-proxy"; version: string; wave: "W1" };
  transport: string;
  chain_label: string;
  policy_path: string | null;
  audit_path: string;
  upstream: {
    connected: boolean;
    managed_by_compass: true;
    server_name: string | null;
    server_version: string | null;
    upstream_tool_count: number;
    reason: string | null;
  };
  exposed_tool_count: number;
  notes: string[];
};

export function buildCompassStatus(
  config: ProxyConfig,
  upstream: UpstreamClient,
  mirror: ToolMirror,
): CompassStatus {
  const state = upstream.getState();
  return {
    proxy: { name: "compass-proxy", version: "0.1.0", wave: "W1" },
    transport: config.upstreamTransport,
    chain_label: config.chainLabel,
    policy_path: config.policyPath,
    audit_path: config.auditPath,
    upstream: {
      connected: state.connected,
      managed_by_compass: true,
      server_name: state.serverName,
      server_version: state.serverVersion,
      upstream_tool_count: state.upstreamToolCount,
      reason: state.reason,
    },
    exposed_tool_count: mirror.exposedTools().length,
    notes: [
      "W1: tools/list is intentionally empty; the W2 registry will populate it.",
      "Upstream is managed internally by Compass; the host has no direct upstream connection.",
    ],
  };
}
