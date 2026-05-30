# Verify: W1 MCP Proxy Skeleton + Upstream Adapter

How to reproduce W1 verification.

## Automated

```bash
bun install            # installs @modelcontextprotocol/sdk + zod
bun run typecheck      # tsc --noEmit, must exit 0
bun test               # full suite, must be all green
```

Expected: typecheck exits 0; `bun test` reports all tests passing across the 6 test files.

## Manual smoke (real entrypoint over stdio)

A host MCP client spawns the real `compass-proxy` process and exercises the host-facing surface.

1. Resilience path (upstream cannot start) — proves the proxy stays alive and reports a safe state:

```bash
# from repo root (so local node_modules resolves the SDK + zod subpaths)
bun run bin/compass-proxy.ts --upstream "this-binary-does-not-exist" --chain monad-testnet
```

Driven by a host client, expect: `tools/list` count 0; `compass_status.upstream.connected=false`; `reason` is a generic safe message (no raw error); audit contains `proxy_started`, `upstream_unavailable`, `tools_list_served`.

2. Real upstream path:

```bash
# Ensure `bunx` is resolvable — a non-login shell does NOT add ~/.bun/bin to PATH:
export PATH="$HOME/.bun/bin:$PATH"
npm_config_registry=https://registry.npmjs.org/ \
  bun run bin/compass-proxy.ts --upstream "bunx wallet-agent@latest" --chain monad-testnet
```

Verified result (host MCP client over stdio): `tools/list` count 0; `compass_status.upstream = {connected:true, server_name:"wallet-agent", server_version:"0.1.0", upstream_tool_count:42, managed_by_compass:true}`; `exposed_tool_count=0`.

If `bunx` is not on PATH, Compass safely reports `compass_status.upstream.connected=false` with a generic reason and keeps serving meta-tools — that is the expected resilience behavior, not an upstream failure.

## Spec-to-evidence map

| Capability spec               | Evidence (tests/files)                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| `mcp-proxy-server`            | `tests/toolsList.test.ts`; `mcp/proxy/server.ts`; manual smoke (empty list, lifecycle) |
| `upstream-adapter`            | `tests/upstreamClient.test.ts`; `mcp/proxy/upstreamClient.ts`; `back/services/adapters/walletAgent.ts` |
| `provisional-tool-forwarding` | `tests/callInterceptor.test.ts`; `mcp/proxy/callInterceptor.ts`                        |
| `compass-meta-tools`          | `tests/metaTools.test.ts`; `mcp/tools/compassStatus.ts`, `compassAuditEvents.ts`       |
| `safe-errors-w1`              | `tests/safeErrors.test.ts`; `mcp/proxy/schemas.ts`                                     |
| `audit-skeleton`              | `tests/audit.test.ts`; `back/services/audit/auditLog.ts`                               |
| `host-no-bypass-config`       | `README.md` host config section; `compass_status.upstream.managed_by_compass`          |
