/**
 * MCP server toward the host (W1).
 *
 * Compass speaks as an MCP server to Claude/Codex/Cursor (constitution §3.3). This module wires
 * the tools/list handler (empty in W1) and the tools/call router: meta-tools are handled
 * locally; everything else goes through the CallInterceptor.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { CallInterceptor } from "./callInterceptor.ts";
import { ToolMirror } from "./toolMirror.ts";
import { UpstreamClient } from "./upstreamClient.ts";
import { safeErrorToToolResult, sanitizeToSafeError } from "./schemas.ts";
import { buildCompassStatus } from "../tools/compassStatus.ts";
import { buildCompassAuditEvents } from "../tools/compassAuditEvents.ts";
import { META_TOOL_STATUS, META_TOOL_AUDIT_EVENTS } from "../../shared/constants/index.ts";
import type { AuditLog } from "../../back/services/audit/auditLog.ts";
import type { ProxyConfig } from "../../shared/types/index.ts";

export type ProxyDeps = {
  config: ProxyConfig;
  upstream: UpstreamClient;
  mirror: ToolMirror;
  interceptor: CallInterceptor;
  audit: AuditLog;
};

function okResult(structured: unknown): {
  content: { type: "text"; text: string }[];
  structuredContent: Record<string, unknown>;
} {
  return {
    content: [{ type: "text", text: JSON.stringify(structured) }],
    structuredContent: structured as Record<string, unknown>,
  };
}

export function createProxyServer(deps: ProxyDeps): Server {
  const server = new Server(
    { name: "compass-proxy", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // tools/list — W1 returns the (empty) host-exposed list and audits that it served.
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = deps.mirror.exposedTools();
    deps.audit.record({
      action: "tools_list_served",
      result: "success",
      metadata: { exposed_tool_count: tools.length, upstream_tool_count: deps.mirror.upstreamToolCount() },
    });
    return { tools };
  });

  // tools/call — route meta-tools locally; everything else through the interceptor.
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};

    try {
      if (name === META_TOOL_STATUS) {
        return okResult(buildCompassStatus(deps.config, deps.upstream, deps.mirror));
      }
      if (name === META_TOOL_AUDIT_EVENTS) {
        return okResult(buildCompassAuditEvents(deps.audit, args));
      }

      const result = await deps.interceptor.handleUpstreamCall(name, args);
      if (result.ok && "forwarded" in result) {
        // Near-transparent: return the upstream result as-is under structuredContent.
        return okResult({ upstream: result.forwarded.result });
      }
      if (!result.ok) {
        return safeErrorToToolResult(result.error);
      }
      // meta outcome reaching here is a defensive internal error
      return safeErrorToToolResult(sanitizeToSafeError("INTERNAL_ERROR"));
    } catch {
      return safeErrorToToolResult(sanitizeToSafeError("INTERNAL_ERROR"));
    }
  });

  return server;
}

/** Connect the proxy server to a host transport (stdio in production). */
export async function startProxyServer(deps: ProxyDeps, transport: Transport): Promise<Server> {
  const server = createProxyServer(deps);
  await server.connect(transport);
  return server;
}
