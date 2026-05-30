# Compass Proxy — Monad (W1)

Compass is an **MCP security proxy**. It sits between an AI host (Claude Code / Claude Desktop / Codex / Cursor) and an upstream wallet MCP (Wallet Agent), on Monad Testnet. The host talks to Compass; Compass talks to the upstream. The host never addresses the upstream directly.

This repo is at **Wave 1**: the proxy skeleton + upstream adapter. Security stages (registry, policy/risk, guarded forwarding with digest/idempotency/simulation) arrive in W2–W4. See `docs/constitution.md` (source of truth) and `docs/development-waves.md`.

## What W1 does

- Runs as an MCP **server** to the host and an MCP **client** to the upstream, over stdio.
- Exposes an **empty `tools/list`** — nothing is advertised until the W2 registry exists.
- Routes `tools/call`:
  - `compass_status`, `compass_audit_events` → handled locally;
  - a **provisional read-only allowlist** (`get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction`) → forwarded near-transparently to the upstream;
  - everything else (writes, approvals, signatures, key management, unknown) → **blocked** with a safe error, never forwarded.
- Writes an append-only, redacted audit log.

## Requirements

- [Bun](https://bun.sh) (runtime, test runner, package manager).

## Setup

```bash
bun install
bun run typecheck
bun test
```

## Run

```bash
bun run bin/compass-proxy.ts \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./config/policy.monad.example.json
```

Config can also come from env (`docs/constitution.md` §10): `COMPASS_UPSTREAM_CMD`, `COMPASS_UPSTREAM_TRANSPORT=stdio`, `COMPASS_POLICY_PATH`, `COMPASS_AUDIT_PATH` (default `./.compass/audit.jsonl`), `COMPASS_DEMO_AGENT_ID`.

> **PATH:** Compass spawns the upstream by its command name (`bunx`). A non-login shell does not put `~/.bun/bin` on PATH, so spawning bare `bunx` fails with ENOENT. Export `PATH="$HOME/.bun/bin:$PATH"` (or pass an absolute `--upstream` path) so the upstream resolves. Verified: with `bunx` resolvable, `compass_status` reports `upstream.connected=true` and `upstream_tool_count=42`.
>
> If `bunx wallet-agent@latest` cannot resolve packages, prefix with `npm_config_registry=https://registry.npmjs.org/` (W0-BLOCKER-001). When the upstream cannot start for any reason, the proxy stays alive and reports `compass_status.upstream.connected=false` with a safe reason.

## Host configuration — Compass only (no bypass)

Add **only Compass** to the host MCP config. Do **not** add Wallet Agent directly — Compass manages the upstream internally.

```bash
claude mcp add compass-wallet -- compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./config/policy.monad.example.json
```

`compass_status` attests `upstream.managed_by_compass = true`, so the host has no direct upstream connection. Technical enforcement that a host operator cannot add Wallet Agent directly is deferred to W6 (`W0-BLOCKER-007`).

## Project layout

```
bin/compass-proxy.ts        # entrypoint (CLI + MCP server over stdio)
mcp/proxy/                  # server, upstreamClient, toolMirror, callInterceptor, schemas
mcp/tools/                  # compass_status, compass_audit_events
back/services/adapters/     # walletAgent upstream config + W1 classification
back/services/audit/        # append-only JSONL audit
shared/                     # types + constants (W1 subsets of the constitution)
config/                     # policy/chains example placeholders
tests/                      # bun test suite + mock upstream from W0 fixtures
```
