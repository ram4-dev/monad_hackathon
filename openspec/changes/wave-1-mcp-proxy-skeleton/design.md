# Design: W1 MCP Proxy Skeleton + Upstream Adapter

## Status and intent

W1 is the first implementation wave. It builds the `compass-proxy` runtime that sits between the host and the Wallet Agent upstream, but it intentionally stops short of the security pipeline. W1 delivers transport plumbing, upstream lifecycle, meta-tools, safe errors, and an audit skeleton; it does not deliver the semantics registry (W2), policy/risk (W3), or guarded forwarding with digest/idempotency/simulation (W4).

This design follows the local sources of truth — `docs/constitution.md` (which overrides product spec and wave docs on conflict), `docs/development-waves.md`, and the W1 proposal/specs. The upstream is `https://github.com/wallet-agent/wallet-agent` run as `bunx wallet-agent@latest`. Real Wallet Agent and Monad facts are consumed from W0 evidence rather than re-derived.

## Design principles

1. **Boundary preserved:** Compass is an MCP server to the host and an MCP client to the upstream. The host MCP config wires Compass only; Wallet Agent is never host-visible. (const. §3.3)
2. **Proxy = MCP interceptor, not a network proxy:** W1 intercepts `tools/list` and `tools/call`, preserving MCP semantics over stdio. It is not a TCP/HTTP reverse proxy.
3. **Deny-by-default discovery:** Until the W2 registry exists, the host-facing `tools/list` is empty. Nothing is advertised without future registry filtering.
4. **No unsafe pass-through:** `tools/call` forwards only the provisional read-only/simulation allowlist. Every write, approval, signature, key-management, or unknown tool is blocked before reaching the upstream. (const. invariants 8–9, §6 ordering)
5. **Skeleton, not security:** The `callInterceptor` exposes the exact stages W4 will fill (registry → evidence → simulation → risk → policy → allow/block), but in W1 only shape-validation, the provisional allowlist split, forward/block, and audit are implemented.
6. **Secret-safe by construction:** No `.env`/secret reads; raw upstream stderr and payloads never reach the host, audit, or logs; errors are sanitized into `SafeError`.
7. **Deterministic tests:** A mock upstream built from W0 fixtures backs the test suite. The real upstream is opt-in via `--upstream`.

## Target code layout

Follows constitution §9 (proxy/core/adapter boundary preserved).

```text
.
├── bin/
│   └── compass-proxy.ts          # Entrypoint: parse flags/env, wire audit+upstream+server, start stdio MCP server
├── mcp/
│   ├── proxy/
│   │   ├── server.ts             # MCP server to host: tools/list (empty), tools/call routing
│   │   ├── upstreamClient.ts     # MCP client to upstream over stdio: spawn, handshake, listTools, callTool, shutdown
│   │   ├── toolMirror.ts         # Upstream tools/list cache + host exposure filter (W1: exposes [])
│   │   ├── callInterceptor.ts    # tools/call gate skeleton: validate → classify → forward|block → audit
│   │   └── schemas.ts            # zod schemas for MCP/Compass payloads
│   └── tools/
│       ├── compassStatus.ts      # compass_status meta-tool
│       └── compassAuditEvents.ts # compass_audit_events meta-tool
├── back/
│   └── services/
│       ├── adapters/
│       │   └── walletAgent.ts    # upstream P0 config: command shape, env override, provisional read-only allowlist
│       └── audit/
│           └── auditLog.ts       # append-only JSONL writer + redaction
├── shared/
│   ├── types/index.ts            # ProxyConfig, UpstreamState, AuditEvent, SafeError (W1 subsets)
│   └── constants/index.ts        # error codes, audit action names, provisional allowlist, blocked tool names
├── config/
│   ├── policy.monad.example.json # placeholder; consumed for real by W3
│   └── chains.monad.example.json
└── tests/
    ├── fixtures/mock-upstream.ts # MCP mock built from W0 sanitized tools/list
    ├── upstreamClient.test.ts
    ├── toolsList.test.ts
    ├── callInterceptor.test.ts
    ├── metaTools.test.ts
    ├── safeErrors.test.ts
    └── audit.test.ts
```

### Import rule (const. §9)

| From            | May import                                  | May not import                          |
| --------------- | ------------------------------------------- | --------------------------------------- |
| `mcp/proxy/*`   | `shared/*`, safe `back/services/*`, MCP SDK | secrets, key material, env secret values |
| `back/services/*` | `shared/*`, server SDKs, local storage    | UI internals                            |
| `shared/*`      | pure libraries                              | env vars, DB, network calls with secrets |

## Upstream adapter contract

- **Command:** from `--upstream` or `COMPASS_UPSTREAM_CMD`, default `bunx wallet-agent@latest`. Parsed into argv (shell-style split, no shell interpolation of secrets).
- **Transport:** stdio only (`COMPASS_UPSTREAM_TRANSPORT=stdio`). Any other transport ⇒ startup error surfaced as `UPSTREAM_UNAVAILABLE` with a safe message. (const. §3.3)
- **Framing:** newline-delimited JSON-RPC, matching W0 observation (no Content-Length). Delegated to the MCP SDK stdio client transport.
- **Registry override:** the child process environment includes `npm_config_registry=https://registry.npmjs.org/` unless already set, resolving `W0-BLOCKER-001`. No other env is forwarded beyond an explicit allowlist; secret-bearing vars are not passed through verbatim.
- **Version:** `latest` for P0 demo. The resolved upstream `serverInfo` (name + version) is recorded in `compass_status`. Pinning is an ADR follow-up, out of W1.
- **Handshake:** MCP `initialize` → `notifications/initialized`, then `tools/list`. The internal tool inventory is cached in `toolMirror`.
- **Timeouts:** a connect timeout for handshake and a per-call timeout for `tools/call`. Exceeding either yields `UPSTREAM_UNAVAILABLE` (connect) or `UPSTREAM_ERROR` (call).
- **Restart policy:** none in W1. A dead upstream surfaces `UPSTREAM_UNAVAILABLE`; the proxy stays alive and continues to serve meta-tools. Auto-restart is future work.
- **Shutdown:** graceful — close child stdin, wait briefly, send SIGTERM, escalate to SIGKILL on timeout. Triggered on host disconnect and process signals.
- **stderr:** captured to a bounded in-memory buffer, sanitized, never forwarded to the host. May feed a `debug_ref` only as a sanitized reference, never raw content.

## `tools/call` pipeline (W1 skeleton of W4)

```text
tools/call received
  → validate shape (tool name present, args valid JSON object, size within limit, within timeout)
  → if name ∈ {compass_status, compass_audit_events} ⇒ local meta-tool handler
  → else if name ∈ provisional read-only allowlist ⇒ forward to upstream → near-transparent response
  → else ⇒ SafeError (UNMAPPED_TOOL for unknown; POLICY_BLOCKED for known-but-not-allowlisted) — no forward
  → on upstream timeout / invalid MCP response ⇒ UPSTREAM_UNAVAILABLE / UPSTREAM_ERROR
  → every terminal path writes a sanitized audit event
```

**Provisional read-only allowlist (W1 only):** `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction`. Constrained to `read_only` + `simulation` classes. `dry_run_transaction` is excluded (absent upstream — `W0-BLOCKER-009`). All mutating/signing/approval/key-management tools are explicitly blocked. W2 replaces this allowlist with the real registry and populates the host-facing `tools/list`.

## Error model (W1 subset of `SafeError`, const. §8)

`UNMAPPED_TOOL`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_ERROR`, `MISSING_REQUIRED_EVIDENCE`, `POLICY_BLOCKED` (placeholder for known-but-not-allowlisted), `INTERNAL_ERROR`. `UNSUPPORTED_CHAIN`, `DIGEST_MISMATCH`, `SIMULATION_FAILED`, `SIMULATION_UNAVAILABLE`, `BROADCAST_FAILED` are defined in the type but not emitted by W1 paths (reserved for W3/W4). Every `SafeError` carries a `safe_message` and optional sanitized `debug_ref`; raw upstream errors are never exposed.

## Audit skeleton (const. §8 audit)

Append-only JSONL at `COMPASS_AUDIT_PATH` (default `./.compass/audit.jsonl`). W1 emits a subset of `AuditEvent.action`: `proxy_started`, `upstream_connected`, `upstream_unavailable`, `tools_list_served`, `tool_call_received`, `tool_call_forwarded`, `tool_call_blocked`, `upstream_error`. A redaction allowlist controls `metadata`; the writer never persists private keys, tokens, env values, raw payloads, raw stderr, or stack traces. `compass_audit_events` reads back the tail.

## What W1 consumes from W0

- Upstream command shape and the `npm_config_registry` override (`W0-BLOCKER-001`).
- Confirmed stdio newline-delimited JSON-RPC framing.
- The sanitized `tools/list` (42 tools) and per-tool schemas, used to build the deterministic mock upstream and to validate that the provisional allowlist names exist upstream.
- `dry_run_transaction` absence (`W0-BLOCKER-009`): excluded from the allowlist.
- No RPC provider or chain metadata is needed by W1 code (no chain calls); `--chain` is a config label only.

## What W1 hands off

- **To W2:** `toolMirror`'s upstream schema cache and the host-exposure filter injection point (currently returns `[]`), plus the provisional allowlist that the registry will supersede.
- **To W4:** the `callInterceptor` stage scaffold, the `SafeError` surface, and the audit writer that the guarded pipeline will extend with required-evidence, simulation, risk, digest, and idempotency stages.

## Review risks

- MCP SDK stdio transport must interoperate with Wallet Agent's framing; covered by the real-upstream smoke and by the mock in tests.
- The empty `tools/list` is an intentional, reviewable choice — reviewers should confirm it matches the Q1 decision and the "no exposure without registry" invariant.
- The provisional allowlist is the main security-sensitive surface in W1; reviewers should confirm it is read-only/simulation only and that everything else is blocked, not forwarded.

## Rollback

- Remove the new source directories and the `wave-1-mcp-proxy-skeleton` change to revert W1.
- Revert `openspec/config.yaml` `testing.command` if the toolchain changes.
- Delete `./.compass/audit.jsonl` (git-ignored). No external state is created.

## Validation checklist

- [ ] `bun install`, `bun run typecheck`, `bun test` all pass.
- [ ] Host receives empty `tools/list`.
- [ ] Read-only `tools/call` forwards exactly once and returns near-transparent.
- [ ] Write/approval/signature/key-management/unknown `tools/call` blocked with `SafeError`, no forward.
- [ ] `compass_status` and `compass_audit_events` behave per spec.
- [ ] Upstream-down path yields `UPSTREAM_UNAVAILABLE` with no leak.
- [ ] Audit is append-only and redacted.
- [ ] Host config docs show Compass only.
