# Verify Report: W1 MCP Proxy Skeleton + Upstream Adapter

## Summary

W1 is verified against `docs/constitution.md` and `docs/development-waves.md`. The proxy runs as an MCP server to the host and an MCP client to the upstream, exposes an empty `tools/list`, forwards only a provisional read-only allowlist, blocks everything else with safe errors, and writes a redacted append-only audit. Automated tests and a manual stdio smoke confirm the behavior.

## Results

- `bun run typecheck`: **pass** (exit 0).
- `bun test`: **pass** (26 tests, 0 failures, 76 assertions, 6 files).
- Manual smoke — **real upstream (Wallet Agent): pass** — host `tools/list` = 0; `compass_status.upstream = {connected:true, server_name:"wallet-agent", server_version:"0.1.0", upstream_tool_count:42, managed_by_compass:true}`. Confirms the W1 exit gate end-to-end against the real upstream.
- Manual smoke — **failing upstream (resilience): pass** — empty `tools/list`, `upstream.connected=false` with a safe reason, audit chain `proxy_started → upstream_unavailable → tools_list_served`, no leakage.

## Requirement coverage

| Spec / Requirement                                              | Verdict | Evidence                                              |
| --------------------------------------------------------------- | ------- | ----------------------------------------------------- |
| mcp-proxy-server / host server over stdio                       | pass    | manual smoke; `tests/metaTools.test.ts` host path     |
| mcp-proxy-server / empty tools/list before registry             | pass    | `tests/toolsList.test.ts`                             |
| mcp-proxy-server / tool call routing                            | pass    | `tests/metaTools.test.ts`, `tests/callInterceptor.test.ts` |
| mcp-proxy-server / unsupported transport                        | pass    | `tests/upstreamClient.test.ts`                        |
| upstream-adapter / stdio start + registry override              | pass    | `back/services/adapters/walletAgent.ts`; smoke        |
| upstream-adapter / handshake + inventory                        | pass    | `tests/upstreamClient.test.ts` (serverInfo, 42 tools) |
| upstream-adapter / guarded forward + timeout                    | pass    | `tests/callInterceptor.test.ts`, `tests/safeErrors.test.ts` |
| upstream-adapter / stderr sanitization                          | pass    | `mcp/proxy/upstreamClient.ts` bounded buffer; smoke (no leak) |
| upstream-adapter / graceful shutdown                            | pass    | `upstreamClient.shutdown()`; tests call it            |
| provisional-tool-forwarding / shape validation                  | pass    | `tests/callInterceptor.test.ts` oversized args        |
| provisional-tool-forwarding / read-only allowlist only          | pass    | `tests/callInterceptor.test.ts` allowlist + classes   |
| provisional-tool-forwarding / block non-allowlisted             | pass    | `tests/callInterceptor.test.ts` writes/keys/unknown   |
| compass-meta-tools / canonical names + status + audit events    | pass    | `tests/metaTools.test.ts`                             |
| safe-errors-w1 / codes + no leakage                             | pass    | `tests/safeErrors.test.ts`                            |
| audit-skeleton / append-only + redaction + correlation          | pass    | `tests/audit.test.ts`                                 |
| host-no-bypass-config / Compass-only docs + attestation         | pass    | `README.md`; `compass_status.managed_by_compass`      |

## Carryover blockers

- `W0-BLOCKER-007` (carryover to W6): no-bypass technical enforcement deferred.

## Environment note (not a blocker)

Real-upstream connectivity requires `bunx` to be resolvable: `~/.bun/bin` must be on PATH, or `--upstream` must use an absolute path. A non-login shell does not get `~/.bun/bin` on PATH automatically. When `bunx` is unresolvable, Compass safely reports `UPSTREAM_UNAVAILABLE` and keeps serving meta-tools (verified). Host launch guidance: provide a PATH that includes the Bun bin directory.

## Conclusion

W1 exit gate (development-waves.md) met and verified against the real upstream: the host connects to Compass; Compass calls `tools/list` on the upstream internally and discovers 42 tools; no tool is exposed without the (future) registry. Ready to feed W2 (registry) and W4 (guarded forwarding).
