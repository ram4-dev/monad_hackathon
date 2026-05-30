# Apply Progress: W1 MCP Proxy Skeleton + Upstream Adapter

## Status

Implemented and verified. All tasks complete; `bun run typecheck` exits 0 and `bun test` is fully green (26 tests, 6 files).

## What was built

- Bun + TypeScript project scaffold (`package.json`, `tsconfig.json`) — first runnable code in the repo.
- `bin/compass-proxy.ts` — entrypoint resolving CLI flags + `COMPASS_*` env, starting audit, upstream, and the host MCP server over stdio; stays alive when the upstream fails.
- `mcp/proxy/upstreamClient.ts` — MCP client over stdio with handshake, `tools/list` cache, per-call timeout, bounded stderr capture, graceful shutdown, npm registry override (`W0-BLOCKER-001`).
- `mcp/proxy/server.ts` — host MCP server: empty `tools/list`, `tools/call` routing.
- `mcp/proxy/toolMirror.ts` — upstream inventory cache; host exposure returns `[]` (W2 injection point).
- `mcp/proxy/callInterceptor.ts` — shape validation → classify → forward/block → audit (W4 stage scaffold documented).
- `mcp/proxy/schemas.ts` — `SafeError` helpers and sanitization.
- `mcp/tools/compassStatus.ts`, `compassAuditEvents.ts` — Compass meta-tools.
- `back/services/adapters/walletAgent.ts` — command parsing, secret-safe env, W1 tool classification + provisional read-only allowlist.
- `back/services/audit/auditLog.ts` — append-only JSONL audit with redaction allowlist.
- `shared/types`, `shared/constants` — W1 subsets of the constitution shapes.
- `config/policy.monad.example.json`, `config/chains.monad.example.json` — placeholders (consumed for real by W3).
- Tests + mock upstream built from the W0 sanitized `tools/list` (42 tools).
- `openspec/config.yaml` updated: `test_runner: bun`, `testing.command: bun test`.

## Verification results

- `bun run typecheck`: exit 0.
- `bun test`: 26 pass / 0 fail / 76 expect() calls.
- **Manual smoke — real upstream (Wallet Agent), PASS:** host `tools/list` = 0; `compass_status.upstream` = `{connected:true, managed_by_compass:true, server_name:"wallet-agent", server_version:"0.1.0", upstream_tool_count:42, reason:null}`. Run as a host MCP client spawning the real `compass-proxy` entrypoint over stdio with `--upstream "bunx wallet-agent@latest"`. This meets the W1 exit gate: Compass connects to the real upstream internally and discovers its 42 tools while exposing none to the host.
- **Manual smoke — failing upstream, PASS (resilience):** with an upstream that cannot be found, host `tools/list` = 0; `compass_status.upstream.connected=false` with a generic safe reason (no raw error leaked); audit recorded `proxy_started`, `upstream_unavailable`, `tools_list_served`.

## Blockers

- **`W0-BLOCKER-001` (consumed):** the upstream child env injects `npm_config_registry=https://registry.npmjs.org/`.
- **`W0-BLOCKER-007` (carryover):** technical no-bypass enforcement remains deferred to W6; W1 documents Compass-only host config and attests internal upstream management via `compass_status`.

## Environment note (not a blocker)

The real-upstream smoke initially reported `connected:false`. Root cause was **PATH**, not the upstream: the documented command is `bunx wallet-agent@latest`, but `bunx` lives in `~/.bun/bin`, which is not on the PATH of a non-login shell (it is only appended to `.bashrc`). Spawning bare `bunx` then fails with ENOENT and Compass correctly reports a safe `UPSTREAM_UNAVAILABLE`. With `~/.bun/bin` on PATH (or an absolute `--upstream` path), the real-upstream smoke passes (42 tools). Operational guidance: ensure the host launches `compass-proxy` with a PATH that includes the Bun bin directory, or pass an absolute upstream command. (An earlier note misattributed this to a `zod/v3`/`zod/v4` upstream packaging issue; that error only occurred when running an ad-hoc smoke script outside the repo, i.e. without local `node_modules`, and is unrelated to Compass or Wallet Agent.)
- **`W0-BLOCKER-009` (respected):** `dry_run_transaction` is excluded from the provisional allowlist because the upstream does not expose it.

## Out of scope confirmed not implemented

W2 registry content, W3 policy/risk, W4 digest/idempotency/simulation/guarded-write-forwarding, chain calls, upstream auto-restart, version pinning, no-bypass enforcement.
