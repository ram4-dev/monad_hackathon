# Tasks: W4 Guarded Forward Pipeline

W4 builds the runtime security gate for `tools/call`. It consumes W1/W2/W3 and must keep the deterministic floor authoritative. It MUST NOT broadcast real mutations as a deliverable, MUST NOT read secrets, and MUST keep the LLM layer veto-only and fail-closed.

## Review Workload Forecast

| Field                   | Value                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| Estimated changed lines | ~1000-1500 source + test lines                                                |
| 400-line budget risk    | High                                                                          |
| Chained PRs recommended | Yes                                                                           |
| Suggested split         | (A) pipeline + policy resolution + digest/idempotency; (B) LLM layer + audit + safe errors |
| Delivery strategy       | chained-prs                                                                   |

**Apply recommendation:** reviewers should focus on (1) the deterministic floor being authoritative, (2) on-chain policy fail-closed, and (3) the LLM layer being veto-only and fail-closed.

## Global Safety and Stop Gates

- [ ] Do not read `.env`, private keys, seeds, tokens, credentials, or secret-manager output.
- [ ] Do not persist raw upstream payloads, raw RPC errors, or raw LLM input/output; sanitize.
- [ ] Keep the deterministic floor authoritative; the LLM layer may only block, never widen.
- [ ] Fail-closed on missing evidence, failed/absent simulation, unresolved/unreadable policy, unavailable LLM.
- [ ] Do not broadcast real mutations as a W4 deliverable; use mock upstream + consent-gated tests only.
- [ ] Idempotency mandatory for any broadcast/execution path.
- [ ] Stop and record a blocker if the W3 identity/policy-contract interface is undefined enough to block W4.

## Tasks

### 1. [ ] Extend types and SafeError

**Files:** `shared/types`, `mcp/proxy/schemas.ts`.
**Steps:** add `GuardedForwardRecord` (with on-chain `policy_source`, `llm_review`), W4 `SafeError` codes, verdict types.
**Acceptance:** types compile; reserved codes documented.

### 2. [ ] On-chain policy resolution (consume W3)

**Files:** `back/services/policy/{policyResolver,onchainPolicyReader,evaluatePolicy}.ts`, `back/services/evm/rpc.ts`.
**Steps:** resolve identity (W3 iface) → contract address; read policy via `eth_call` with cache + freshness; evaluate `allow|block`; fail-closed.
**Acceptance:** unresolved/unreadable → block; decision returns a policy snapshot (address+version/block).
**Stop gate:** if W3 interface is missing, mock it behind an interface and record the dependency.

### 3. [ ] Required-evidence + simulation orchestration

**Files:** `mcp/proxy/callInterceptor.ts`, `back/services/risk/riskChecks.ts`.
**Steps:** required-field validation from `ToolSemantics`; simulation/dry-run for write/sig/approval; risk checks (chain, allowance, gas, evidence).
**Acceptance:** missing evidence/failed simulation → block before policy.

### 4. [ ] Canonical digest + idempotency

**Files:** `back/services/evm/digest.ts`, `back/services/idempotency/idempotencyStore.ts`.
**Steps:** build `candidate_tx_digest` over the constitution field list; idempotency key + store with result reuse.
**Acceptance:** digest mismatch → block/re-simulate; same key → no second execution.

### 5. [ ] LLM final safety review (veto-only, fail-closed)

**Files:** `back/services/llm/{finalSafetyReview,sanitizeContext}.ts`.
**Steps:** sanitize context (no secrets); call LLM; parse structured verdict; treat unsafe/ambiguous/error/timeout as block; run only after deterministic allow.
**Acceptance:** LLM can only block; unavailable → `LLM_SAFETY_UNAVAILABLE` block; verdict audited (redacted).
**Stop gate:** if sanitization cannot guarantee no-secret context, do not send to the LLM — block and record a blocker.

### 6. [ ] Wire the full interceptor + audit

**Files:** `mcp/proxy/callInterceptor.ts`, `back/services/audit/auditLog.ts`.
**Steps:** assemble ordering; forward exactly once after full pass; block path never contacts upstream; write `GuardedForwardRecord` + audit on every terminal path.
**Acceptance:** order enforced; blocked never reaches mock; allowed forwards once.

### 7. [ ] Tests

**Files:** `tests/*.test.ts`, mock on-chain policy reader, mock LLM reviewer, W1 mock upstream.
**Steps:** cover each block stage, allow path, policy fail-closed, LLM veto + fail-closed, digest mismatch, idempotency, per-user isolation, audit redaction.
**Acceptance:** `bun test` green; `bun run typecheck` clean.
**Stop gate:** do not mark complete with failing tests or partial implementation.

### 8. [ ] Apply progress + verify report

**Files:** `apply-progress.md`, `verify.md`, `verify-report.md`.
**Steps:** map each spec requirement to test/code evidence; record carryover (constitution ADR for on-chain policy + LLM authority).
