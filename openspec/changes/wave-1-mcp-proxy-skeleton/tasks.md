# Tasks: W1 MCP Proxy Skeleton + Upstream Adapter

W1 is the first implementation wave. It introduces runnable Compass source code and tests. It MUST NOT implement the W2 registry, W3 policy/risk, or W4 digest/idempotency/simulation/guarded-write-forwarding. It MUST NOT forward any mutating, signing, approval, or key-management tool. It MUST NOT read secrets or perform on-chain actions.

## Review Workload Forecast

| Field                   | Value                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| Estimated changed lines | ~700-1100 source + test lines; OpenSpec docs separate                          |
| 400-line budget risk    | High                                                                           |
| Chained PRs recommended | Optional                                                                       |
| Suggested split         | (A) scaffold + adapter + server, (B) interceptor + meta-tools + audit + tests  |
| Delivery strategy       | single-pr-with-optional-split                                                  |
| Chain strategy          | pending                                                                        |

**Apply recommendation:** a single W1 PR is acceptable but large; reviewers should focus on the `callInterceptor` provisional allowlist (security-sensitive) and the empty `tools/list` decision. External-integration risk is moderate: deterministic tests use a mock upstream; the real upstream is opt-in via `--upstream`.

## Global Safety and Stop Gates

- [x] Do not read `.env`, shell history, private keys, seed phrases, tokens, credentials, delegated payloads, or secret-manager output.
- [x] Do not forward writes, token approvals, signatures, broadcasts, or private-key/keystore tools; block them before upstream contact.
- [x] Do not implement W2 registry content, W3 policy/risk, or W4 digest/idempotency/simulation/guarded-write-forwarding.
- [x] Do not perform any on-chain action or run `add_custom_chain`/`switch_chain` from W1 code.
- [x] Do not forward raw upstream stderr or raw payloads to the host, audit, or logs.
- [x] Stop and record a blocker if MCP SDK stdio framing cannot interoperate with the upstream's newline-delimited JSON-RPC.
- [x] Keep `./.compass/audit.jsonl` git-ignored; never commit audit output.

## Tasks

### 1. [x] Project scaffold

**Files/targets:** `package.json`, `tsconfig.json`, `bunfig.toml`, `.gitignore`, `openspec/config.yaml`.

**Steps:**

- [ ] Initialize a Bun + TypeScript project (`type: module`, strict tsconfig, ESNext, bundler resolution).
- [ ] Add scripts: `dev`, `build`, `test`, `typecheck`.
- [ ] Add dependencies `@modelcontextprotocol/sdk` and `zod`.
- [ ] Update `.gitignore` for `node_modules`, `dist`, `.compass/`.
- [ ] Update `openspec/config.yaml` `testing.command` to the Bun test command and note `strict_tdd` is now evaluable.

**Acceptance evidence:** `bun install` succeeds; `bun run typecheck` runs on an empty/initial source tree.

**Stop gate:** If a dependency cannot resolve from the public registry, record a blocker (relates to `W0-BLOCKER-001`).

**Rollback boundary:** Delete the new tooling files to revert scaffolding.

### 2. [x] Shared types and constants

**Files/targets:** `shared/types/index.ts`, `shared/constants/index.ts`.

**Steps:**

- [ ] Define `ProxyConfig`, `UpstreamState`, `AuditEvent` (W1 subset), and `SafeError` (full code union, W1-emitted subset noted).
- [ ] Define error codes, audit action names, the provisional read-only allowlist, and the default-blocked tool names (private-key/keystore).

**Acceptance evidence:** Types compile; allowlist contains only `read_only`/`simulation` tools.

**Stop gate:** If the allowlist would need a mutating tool, stop — that violates the constitution.

### 3. [x] Audit writer

**Files/targets:** `back/services/audit/auditLog.ts`.

**Steps:**

- [ ] Implement append-only JSONL writer at `COMPASS_AUDIT_PATH` (default `./.compass/audit.jsonl`).
- [ ] Implement `event_id` + timestamp + correlation id; apply the redaction allowlist.
- [ ] Expose a tail reader for `compass_audit_events`.

**Acceptance evidence:** Appends one JSON line per event; no secret/raw payload persisted.

**Rollback boundary:** Audit file is git-ignored and disposable.

### 4. [x] Upstream adapter / MCP client

**Files/targets:** `mcp/proxy/upstreamClient.ts`, `back/services/adapters/walletAgent.ts`.

**Steps:**

- [ ] Parse the upstream command; spawn over stdio with `npm_config_registry` override and an env allowlist.
- [ ] Complete MCP handshake; fetch and cache `tools/list` and `serverInfo`.
- [ ] Implement `callTool` with a per-call timeout; capture stderr to a bounded buffer.
- [ ] Implement graceful shutdown (stdin close → SIGTERM → SIGKILL).

**Acceptance evidence:** Connects to the mock upstream; handshake + inventory cached; timeouts and shutdown behave.

**Stop gate:** If stdio framing cannot interoperate, record a blocker.

### 5. [x] tools/list mirror (empty exposure)

**Files/targets:** `mcp/proxy/toolMirror.ts`.

**Steps:**

- [ ] Cache the upstream inventory; expose `exposedTools()` returning `[]` in W1.
- [ ] Leave a documented injection point where W2 plugs the registry.

**Acceptance evidence:** Host-facing `tools/list` is empty; internal inventory count is available.

### 6. [x] tools/call interceptor

**Files/targets:** `mcp/proxy/callInterceptor.ts`, `mcp/proxy/schemas.ts`.

**Steps:**

- [ ] Validate request shape (name, JSON object args, size, timeout).
- [ ] Route meta-tools locally; forward allowlisted read-only tools; block the rest with the right `SafeError` code.
- [ ] Audit every terminal path; document the deferred W4 stages in the pipeline.

**Acceptance evidence:** Read-only forwards once; writes/approvals/signatures/key-mgmt/unknown blocked without forward.

**Stop gate:** If any non-allowlisted tool would forward, stop — unsafe pass-through.

### 7. [x] Compass meta-tools

**Files/targets:** `mcp/tools/compassStatus.ts`, `mcp/tools/compassAuditEvents.ts`.

**Steps:**

- [ ] `compass_status`: report transport, chain label, upstream state/serverInfo, internal tool count, exposed count (0), audit path, internal-management attestation.
- [ ] `compass_audit_events`: return redacted tail of the audit log.

**Acceptance evidence:** Both handled locally; never forwarded upstream; no secret leakage.

### 8. [x] Host server + entrypoint

**Files/targets:** `mcp/proxy/server.ts`, `bin/compass-proxy.ts`.

**Steps:**

- [ ] Implement the MCP server over stdio; wire `tools/list` (empty) and `tools/call` routing.
- [ ] Implement the entrypoint: parse `--upstream`/`--chain`/`--policy` + `COMPASS_*` env; start audit, upstream, server; handle signals.
- [ ] On upstream start failure, keep the proxy alive and serve meta-tools.

**Acceptance evidence:** Host can connect; meta-tools answer even when the upstream is down.

### 9. [x] Mock upstream + tests

**Files/targets:** `tests/fixtures/mock-upstream.ts`, `tests/*.test.ts`.

**Steps:**

- [ ] Build the mock upstream from `wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json`.
- [ ] Tests: empty `tools/list`; read-only forward once; write/approval/signature/key-mgmt/unknown blocked; meta-tools; upstream-down `UPSTREAM_UNAVAILABLE` with no leak; append-only redacted audit.

**Acceptance evidence:** `bun test` green; `bun run typecheck` clean.

**Stop gate:** Do not mark complete with failing tests or partial implementation.

### 10. [x] Config examples + host docs

**Files/targets:** `config/policy.monad.example.json`, `config/chains.monad.example.json`, change `README.md` or design host-config section.

**Steps:**

- [ ] Add placeholder policy/chains examples (consumed for real by W3).
- [ ] Document Compass-only host config and the no-bypass warning.

**Acceptance evidence:** Docs show Compass only; reference `W0-BLOCKER-007` carryover.

### 11. [x] Apply progress + verify report

**Files/targets:** `openspec/changes/wave-1-mcp-proxy-skeleton/apply-progress.md`, `verify.md`, `verify-report.md`.

**Steps:**

- [ ] Record what was implemented, test results, and carryover blockers (`W0-BLOCKER-007`); note `W0-BLOCKER-001` consumed.
- [ ] Map each spec requirement to evidence (tests/files).

**Acceptance evidence:** Verify report ties requirements to passing tests and code.

**Stop gate:** Do not claim success for any requirement without corresponding test/code evidence.
