# Change: W1 MCP Proxy Skeleton + Upstream Adapter

## Intent

Implement the first runtime layer of Compass: a `compass-proxy` process that acts as an **MCP server toward the host** (Claude Code / Claude Desktop / Codex / Cursor) and an **MCP client toward the Wallet Agent upstream** over stdio. W1 establishes the transport plumbing, the upstream process lifecycle, the Compass meta-tools, a safe error surface, and an append-only technical audit, while deliberately leaving the semantics registry (W2), policy/risk (W3), and the guarded forward pipeline with digest/idempotency/simulation (W4) for later waves.

W1 is the **first implementation wave**. It must produce running, tested code while preserving every Compass boundary invariant: the host never sees the Wallet Agent directly, nothing is exposed without future registry filtering, and no write/signature/approval is forwarded without the W3/W4 safety stages that do not exist yet.

## Context and Sources

Local sources of truth (constitution overrides product spec and wave docs on conflict):

- `docs/constitution.md` (v0.6)
- `docs/development-waves.md`
- `compass_product_spec_monad_mcp_proxy_v0.2.md`
- `openspec/config.yaml`

W0 evidence consumed by W1:

- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json` — real upstream `tools/list` (42 tools) used to build the deterministic mock upstream.
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/tools/*.schema.json` — per-tool sanitized schemas.
- `openspec/changes/wave-0-upstream-monad-poc/evidence/blockers/blocker-register.md` — `W0-BLOCKER-001` (npm registry override), `W0-BLOCKER-007` (no-bypass), `W0-BLOCKER-009` (`dry_run_transaction` absent).

Upstream MCP source:

- `https://github.com/wallet-agent/wallet-agent` (run as `bunx wallet-agent@latest`).

Official Monad references:

- `https://docs.monad.xyz/llms.txt`
- `https://docs.monad.xyz/guides/monad-mcp.md`

## Scope

### In Scope

- A Bun + TypeScript project scaffold (`package.json`, `tsconfig.json`, test runner) where none existed before.
- `compass-proxy` entrypoint accepting `--upstream`, `--chain`, `--policy` and the `COMPASS_*` env vars from constitution §10.
- MCP server over stdio toward the host.
- MCP client over stdio toward the upstream, with full process lifecycle: start, MCP handshake, connect, disconnect, graceful shutdown.
- `npm_config_registry` passthrough so the upstream resolves from the public registry (`W0-BLOCKER-001`).
- A `tools/list` handler that returns an **empty list** to the host in W1 (no tool is advertised before the W2 registry exists), while still fetching the upstream `tools/list` internally to prove connectivity and populate `compass_status`.
- A `tools/call` interceptor skeleton that: validates request shape, classifies the tool against a **provisional read-only allowlist** derived from W0, forwards allowed read-only/simulation calls near-transparently to the upstream, blocks everything else with a safe error, and audits every terminal path.
- Compass meta-tools `compass_status` and `compass_audit_events`.
- A `SafeError` surface (W1 subset) that never leaks secrets or raw upstream output.
- An append-only JSONL audit writer with a redaction allowlist.
- A deterministic mock upstream built from W0 fixtures for tests, plus support for the real Wallet Agent via `--upstream`.
- Documented host configuration that wires Compass only, never Wallet Agent directly.

### Non-Goals

- No tool semantics registry content or `input_schema_hash` enforcement (W2). W1 only provides the injection point.
- No policy engine, risk checks, or `allow|block` policy decisions beyond the provisional read-only/non-read-only split (W3).
- No `candidate_tx_digest`, idempotency keys, mandatory simulation, or guarded write forwarding (W4).
- No forwarding of writes, token approvals, signatures, broadcasts, or private-key/keystore tools — these are blocked, not forwarded, in W1.
- No chain calls: W1 does not run `add_custom_chain`/`switch_chain` or auto-configure Monad; `--chain` is a recorded config value only.
- No `viem`/RPC fallback simulation (W4/W5).
- No upstream auto-restart, no upstream version pinning (ADR follow-up).
- No technical enforcement preventing a host operator from adding Wallet Agent directly (documented only; W6).
- No secrets read/logged/persisted; no `.env` values, private keys, tokens, or credentials.
- No mainnet, multi-chain production, x402, UI, or external approval surface.

## Capabilities

These domains drive the detailed requirements and acceptance scenarios in `specs/`.

| Capability Domain             | Type | Purpose                                                                                                                                |
| ----------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `mcp-proxy-server`            | New  | Compass exposes an MCP server to the host over stdio; `tools/list` returns empty in W1; server lifecycle and request routing.           |
| `upstream-adapter`            | New  | Compass acts as an MCP client to Wallet Agent over stdio: start, registry override, handshake, `tools/list`, `tools/call`, shutdown.     |
| `provisional-tool-forwarding` | New  | `tools/call` shape validation, provisional read-only allowlist classification, near-transparent forward of allowed calls, block of rest. |
| `compass-meta-tools`          | New  | `compass_status` and `compass_audit_events` as locally-handled Compass meta-tools.                                                       |
| `safe-errors-w1`              | New  | A `SafeError` subset with no secret or raw-upstream leakage.                                                                            |
| `audit-skeleton`              | New  | Append-only JSONL technical audit with redaction allowlist for the W1 action subset.                                                    |
| `host-no-bypass-config`       | New  | Documented Compass-only host configuration; carryover of `W0-BLOCKER-007`.                                                              |

## Affected Areas

- New application source under `bin/`, `mcp/`, `back/services/`, `shared/`, `config/`, `tests/`.
- New project tooling: `package.json`, `tsconfig.json`, `bunfig.toml`, `.gitignore` update.
- `openspec/config.yaml`: enable a runnable Bun `testing.command` now that implementation scaffolding exists.
- New OpenSpec artifacts under `openspec/changes/wave-1-mcp-proxy-skeleton/`.
- W2 will consume the `tools/list` filter injection point and the upstream schema cache.
- W4 will consume the `callInterceptor` skeleton and audit/error surfaces.
- Local runtime only during smoke: Wallet Agent (`bunx wallet-agent@latest`) and Monad Testnet RPC are not contacted by W1 code paths (no chain calls).

## Safety and Consent Requirements

- Do not read `.env`, private keys, seed phrases, tokens, credentials, delegated payloads, or secret-manager output.
- Do not log or persist secret values, raw upstream stderr, or raw sensitive payloads in audit or logs.
- The provisional W1 allowlist MUST contain only non-mutating tools (`read_only` + `simulation`); any mutating, signing, approval, or key-management tool is blocked before forward.
- W1 performs no on-chain action and requires no testnet consent gate, because it forwards no mutation.
- Upstream errors MUST be sanitized into a `SafeError` before reaching the host, audit, or logs.

## Risks

- The MCP TypeScript SDK client/server stdio wiring may need careful framing to match Wallet Agent's newline-delimited JSON-RPC (no Content-Length) observed in W0.
- A provisional allowlist that forwards calls could become an unsafe pass-through if it is allowed to include mutating tools; this is mitigated by constraining it to read-only/simulation and by blocking everything else.
- Returning an empty `tools/list` means the host cannot discover Compass tools in W1; this is intentional and exercised through direct `tools/call` in tests and smoke.
- Real upstream smoke depends on network and the `npm_config_registry` override; tests must not depend on the live upstream.
- The no-bypass guarantee remains operational/documented in W1; technical enforcement is deferred.

## Rollback

- Delete the `wave-1-mcp-proxy-skeleton` OpenSpec change and the new source directories to revert W1 entirely.
- Revert `openspec/config.yaml` `testing.command` if the Bun toolchain choice changes.
- W1 introduces no persistent external state; the only local artifact is `./.compass/audit.jsonl`, which is git-ignored and safe to delete.
- No on-chain or upstream-mutating action is created by W1, so there is nothing to roll back externally.

## Success Criteria

W1 is successful when:

- `compass-proxy` starts as an MCP server over stdio and a host can connect to it.
- Compass connects to a mocked upstream and to Wallet Agent when run with `--upstream`, including the `npm_config_registry` override.
- The host receives an empty `tools/list`; no upstream tool is advertised before registry filtering.
- A `tools/call` for a provisional read-only tool forwards exactly once to the upstream and returns a near-transparent response.
- A `tools/call` for any write, approval, signature, key-management, or unknown tool is blocked with a `SafeError` and never reaches the upstream.
- `compass_status` reports upstream connection state, internal upstream tool count, exposed tool count (0), transport, and chain config label; `compass_audit_events` returns redacted audit events.
- Upstream unavailability yields `UPSTREAM_UNAVAILABLE` with no stderr/secret leakage.
- The audit log is append-only and redacted.
- `bun test` and `bun run typecheck` pass.
- Host configuration documentation shows Compass only, never direct Wallet Agent.
- No secrets are read, logged, or persisted; no proxy-side chain mutation is introduced.
