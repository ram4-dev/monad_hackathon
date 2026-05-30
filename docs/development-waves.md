# Compass Monad — waves de desarrollo

Este plan baja `docs/constitution.md` y `compass_product_spec.md` a waves incrementales con dependencias explícitas. Para este repo, la **constitución manda** cuando hay tensión con el product spec: el P0 apunta a Claude Code vía MCP, Monad testnet, Dynamic embedded EVM wallet y signing backend con Delegated Access.

## Norte P0

Demo objetivo:

```text
Claude Code -> Compass MCP local -> Compass backend
  -> review/policy/audit -> Dynamic delegated signing -> Monad testnet
```

Reglas que condicionan todas las waves:

- No hay raw signing desde Claude ni tool genérica `sign_raw_transaction`.
- La web P0 solo hace onboarding humano: login, wallet embedded EVM, delegación y estado ready.
- Toda ejecución pasa por `review_id`, digest canónico, policy `allow`, idempotencia y audit.
- Los blockers de validación de `docs/constitution.md#13` se resuelven antes de depender de ellos en ejecución real.

## Dependency graph

```text
W0 External validations
  ├─> W1 Contracts, config, storage
  │     ├─> W2 Auth, bootstrap, pairing, setup web
  │     │     ├─> W3 Dynamic delegation + wallet state
  │     │     │     └─> W5 Execution gateway
  │     │     └─> W6 MCP tools and local runtime
  │     └─> W4 Guarded review pipeline
  │           ├─> W5 Execution gateway
  │           └─> W6 MCP tools and local runtime
  └─> W3 Dynamic delegation + wallet state

W5 + W6 -> W7 Demo hardening and release readiness
```

## Wave summary

| Wave | Name                                 | Hard dependencies                                         | Soft dependencies                                           | Unlocks                                                                     |
| ---- | ------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| W0   | External validations                 | none                                                      | none                                                        | Safe technical assumptions for Monad/Dynamic/delegation.                    |
| W1   | Contracts, config, storage           | none                                                      | W0 for final chain values                                   | Shared schemas, DB base, redaction and test foundation.                     |
| W2   | Auth, bootstrap, pairing, setup web  | W1                                                        | W0 for final URLs/chain copy                                | MCP sessions, scoped tokens, setup URL, web onboarding.                     |
| W3   | Dynamic delegation + wallet state    | W0, W1, W2                                                | none                                                        | Ready wallet state and signer capability behind guarded backend interfaces. |
| W4   | Guarded review pipeline              | W1, W2                                                    | W3 for real wallet/delegation context; can start with mocks | `review_intent` safety gate with digest, risk, policy and audit.            |
| W5   | Execution gateway                    | W2, W3, W4                                                | none                                                        | Idempotent guarded signing/broadcast for reviewed transactions.             |
| W6   | MCP tools and local runtime          | W2 for bootstrap/status; W3 wallet; W4 review; W5 execute | none                                                        | Claude Code demo surface.                                                   |
| W7   | Demo hardening and release readiness | W0–W6                                                     | none                                                        | End-to-end confidence, docs, tests and reviewable demo.                     |

## Dependency details

| Wave | Depends on         | Why it depends on them                                                                                                                                      | Can start before dependency is complete?                                                |
| ---- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| W0   | none               | It validates external assumptions before we encode them into architecture.                                                                                  | yes — it is the first track.                                                            |
| W1   | none hard; W0 soft | Schemas, DB and config can be scaffolded with provisional Monad values, but final chain/signing constants should wait for W0 evidence.                      | yes, with provisional config and TODOs tied to W0.                                      |
| W2   | W1                 | Bootstrap, pairing, token hashing, scopes, sessions and audit need W1 schemas/storage/redaction first.                                                      | no for production routes; only sketches/mocks.                                          |
| W3   | W0, W1, W2         | Delegation needs validated Dynamic/Monad behavior from W0, delegation storage schemas from W1, and authenticated pairing from W2.                           | no for real delegation; yes for mocked signer interface only.                           |
| W4   | W1, W2             | Review needs shared action/risk/policy schemas from W1 and authenticated MCP/session context from W2.                                                       | yes, if wallet state/delegation is mocked until W3 lands.                               |
| W5   | W2, W3, W4         | Execution requires authenticated scoped tokens from W2, active delegated signer/wallet from W3, and a valid `review_id` + digest + policy snapshot from W4. | no — this is the critical safety boundary.                                              |
| W6   | W2, W3, W4, W5     | MCP tools wrap the previous backend capabilities: status/bootstrap from W2, wallet state from W3, review from W4 and execute from W5.                       | yes, tool-by-tool: status after W2, wallet after W3, review after W4, execute after W5. |
| W7   | W0–W6              | Hardening verifies the full chain, docs, tests, demo script and safety boundaries.                                                                          | no for final readiness; partial docs can evolve earlier.                                |

## Critical path

```text
W0 validations
  -> W1 contracts/storage
  -> W2 auth/pairing
  -> W3 delegation/wallet state
  -> W5 execution gateway
  -> W6 executable MCP demo
  -> W7 hardening
```

W4 runs after W1/W2 and can progress in parallel with W3 using mocks. W5 is the join point: it must wait for both W3 and W4.

## W0 — External validations

**Goal:** de-risk assumptions that are blockers for P0.

**Deliverables:**

- Confirm `MONAD_CHAIN_ID`, RPC URL behavior, explorer URL and Dynamic Dashboard chain support.
- Validate Dynamic embedded EVM wallet creation/selection for Monad testnet.
- Identify the exact frontend SDK/API that exposes delegated access setup.
- Validate Dynamic delegation webhook signature over raw body and required fields.
- Validate server-side delegated signing + `viem` broadcast on Monad testnet.
- Choose local MCP token storage: `~/.compass/credentials.json` with `0600` or keychain.
- Define canonical digest fields and prove one digest mismatch blocks execution.

**Acceptance:** every constitution section 13 blocker has a PoC result, owner and status. Unknowns become explicit ADR/spec notes before W3/W5 rely on them.

## W1 — Contracts, config, storage

**Goal:** create the stable internal language before wiring flows.

**Deliverables:**

- Zod/TypeScript schemas for `NormalizedAction`, `RiskAssessment`, `PolicyDecision`, `SimulationResult`, `AuditEvent` and `SafeError`.
- Chain/config module centered on `MONAD_CHAIN_ID`; no frontend access to non-`NEXT_PUBLIC_` env vars.
- DB schema/migrations for `mcp_sessions`, `pairing_sessions`, `delegations`, `webhook_events`, `intent_reviews` and `audit_events`.
- Audit metadata allowlists and redaction helpers.
- Test harness and fixtures for policy/risk/auth flows.

**Acceptance:** schemas compile, migrations apply, redaction tests pass, and policy/risk fixtures can be reused by later waves.

## W2 — Auth, bootstrap, pairing, setup web

**Goal:** let a local MCP instance pair with a human-authenticated wallet setup without any signing capability in public routes.

**Deliverables:**

- `POST /api/mcp/bootstrap` with `mcp_session_id`, `pairing_code`, `setup_url` and one-time `poll_token` hashing.
- `GET/POST /api/mcp/bootstrap/[sessionId]` requiring both `mcp_session_id` and `poll_token`.
- `POST /api/mcp/logout` for token revocation.
- `POST /api/setup/session` requiring authenticated Dynamic/app session and verified wallet ownership.
- Minimal setup web page: login, wallet select/create, delegate-access trigger, ready status.
- Rate limiting, TTLs, origin/CORS restrictions and safe error responses.

**Acceptance:** `mcp_session_id` alone cannot retrieve a token, final token is scoped and stored hashed server-side, consumed polling cannot be reused, and setup/bootstrap routes cannot execute intents.

## W3 — Dynamic delegation + wallet state

**Goal:** register delegated signing capability safely, without exposing delegated credentials.

**Deliverables:**

- Dynamic delegation webhook route with raw-body signature verification.
- Idempotent webhook processing by `eventId`.
- Encrypted storage for delegated wallet API key/key share; no plaintext logs or audit metadata.
- Delegation registry with `active | revoked | expired` status.
- `GET /api/wallet/state` for MCP token or web session.
- Delegated signer adapter behind a backend-only interface.

**Acceptance:** duplicate webhook events do not create duplicate delegations, wallet state reports ready/missing/revoked accurately, and tests prove delegated secrets never enter responses, audit events or public logs.

## W4 — Guarded review pipeline

**Goal:** implement the canonical safety gate: review before execution.

**Deliverables:**

- Intent normalization for P0 supported actions: native transfer, ERC20 transfer, ERC20 approval and constrained contract-call intake.
- EVM transaction build/intake and calldata decoder for known ERC20 patterns plus unknown calls.
- Simulation/inspection adapter for Monad RPC with explicit unavailable/failed handling.
- Deterministic risk checks: wrong chain, unexpected value movement, dangerous approvals, unknown contract calls, gas limits, recipient/token policy.
- Demo policy engine with `allow`, `block`, `requires_policy_change`.
- `POST /api/intents/review` returning `review_id`, canonical `candidate_tx_digest`, policy snapshot, expiry and review text.
- Audit events for intent received, reviewed and policy evaluated.

**Acceptance:** tests cover unlimited approval block, wrong chain block, unknown contract block, simulation unavailable behavior, digest generation, policy snapshotting and review expiry.

## W5 — Execution gateway

**Goal:** sign and broadcast only a reviewed, still-valid, policy-allowed transaction.

**Deliverables:**

- `POST /api/intents/execute` requiring token scope, `review_id` and `idempotency_key`.
- Recompute/retrieve reviewed transaction and verify digest match before signing.
- Idempotency lock/result reuse for `(mcp_session_id, idempotency_key)`.
- Delegated signing via W3 signer adapter.
- Broadcast via Monad RPC and safe handling for failed broadcasts.
- Audit events for signed, broadcast, blocked and failed outcomes.

**Acceptance:** retrying the same idempotency key cannot sign twice, expired reviews block, digest mismatch blocks, non-`allow` policy blocks, and every terminal path writes sanitized audit.

## W6 — MCP tools and local runtime

**Goal:** expose the P0 demo through Claude Code without giving the agent signing authority.

**Deliverables:**

- Local MCP server with credential bootstrap/polling and local token storage.
- Tools:
  - `compass_status`
  - `get_wallet_state`
  - `review_intent`
  - `execute_guarded_intent`
  - `get_audit_events`
- Structured outputs aligned with shared schemas.
- Setup response with `setup_url` and `pairing_code` when local credentials are missing.
- No raw signing, raw send or generic transaction execution tool.

**Acceptance:** Claude Code can go from `needs_setup` to `ready`, review a low-risk action, execute only by `review_id`, receive a blocked explanation for a dangerous action, and read audit events.

## W7 — Demo hardening and release readiness

**Goal:** make the demo reliable and reviewable.

**Deliverables:**

- Endpoint auth matrix tests for route/scopes positive and negative cases.
- Audit redaction tests for all event types.
- Smoke/e2e demo script for setup → review → execute → audit.
- Seed demo policy, demo recipient/token config and reset instructions.
- Operator runbook for environment, Dynamic dashboard setup and Monad RPC setup.
- Known limitations doc for product-spec items deferred beyond P0.

**Acceptance:** the full P0 demo can be run from a clean machine without exposing secrets, all critical tests pass, and reviewers can verify the safety boundary without reconstructing the architecture.

## Parallelization guidance

- W0 should start first and feeds risk decisions into W3/W5.
- W1 can begin with provisional Monad config, but W3/W5 must not ship until W0 validates real signing/broadcast.
- W2 and parts of W4 can proceed in parallel after W1, because review can be built with signer mocked.
- W5 should stay single-threaded: it crosses auth, policy, signing, idempotency and audit.
- W6 can expose `compass_status` and `get_wallet_state` early, but `execute_guarded_intent` waits for W5.

## Explicitly deferred from P0

These remain valid product directions, but are not part of the Compass Monad P0 wave chain:

- Full portfolio/dashboard web app.
- Full CLI product beyond debug/fallback needs.
- Solana execution path.
- Manual wallet popup approval per transaction.
- Multi-chain support.
- Teams, roles, policy marketplace and pricing work.
- External threat-intelligence integrations.
- LLM-based security decisions as authority.

## Recommended first implementation order

1. Run W0 PoCs and record outcomes.
2. Land W1 schemas/config/storage with tests.
3. Build W2 bootstrap/pairing and minimal setup web.
4. Build W4 review pipeline against mocked signer/wallet state.
5. Build W3 Dynamic delegation and wallet state.
6. Build W5 execution gateway.
7. Wire W6 MCP end-to-end.
8. Finish W7 hardening/demo docs.
