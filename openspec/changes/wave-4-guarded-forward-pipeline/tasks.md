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

**Files:** `packages/coding-agent/src/safe-errors/safeError.js` (extend W3 codes), `packages/coding-agent/src/guarded-forward/guardedForwardRecord.js` (new).
**Steps:** add `GuardedForwardRecord` (with on-chain `policy_source`, `llm_review`), W4 `SafeError` codes, verdict shapes (JSDoc; pure JS).
**Acceptance:** module loads; reserved codes documented; matches W3 safe-errors style.

### 2. [ ] On-chain policy resolution (consume W3)

**Files:** reuse W3 — `packages/coding-agent/src/policy-source/*` (read client/cache/snapshot/config/ABI/errors) + `packages/coding-agent/src/policy/evaluatePolicy.js`; new wiring in `packages/coding-agent/src/guarded-forward/`.
**Steps:** resolve identity (W3 binding) → contract address; read policy via W3 `policyContractClient` (`eth_call`) with cache + freshness; evaluate `allow|block` via W3 `evaluatePolicy`; fail-closed.
**Acceptance:** unresolved/unreadable → block; decision returns a policy snapshot (address+version/block).
**Stop gate:** if W3 interface is missing, mock it behind an interface and record the dependency.

### 3. [ ] Required-evidence + simulation orchestration

**Files:** `packages/coding-agent/src/guarded-forward/guardedForward.js` (new); reuse W2 `packages/coding-agent/src/tool-semantics/resolver.js` and W3 `packages/coding-agent/src/risk/riskChecks.js`.
**Steps:** required-field validation from `ToolSemantics`; simulation/dry-run for write/sig/approval; risk checks (chain, allowance, gas, evidence).
**Acceptance:** missing evidence/failed simulation → block before policy.

### 4. [ ] Canonical digest + idempotency

**Files:** `packages/coding-agent/src/digest/candidateTxDigest.js`, `packages/coding-agent/src/idempotency/idempotencyStore.js` (new).
**Steps:** build `candidate_tx_digest` over the constitution field list; idempotency key + store with result reuse.
**Acceptance:** digest mismatch → block/re-simulate; same key → no second execution.

### 5. [ ] LLM final safety review (veto-only, fail-closed)

**Files:** `packages/coding-agent/src/llm/{finalSafetyReview,sanitizeContext}.js` (new). Reads Azure OpenAI config from env (see `.env.example`); never hardcoded.
**Steps:** sanitize context (no secrets); call LLM; parse structured verdict; treat unsafe/ambiguous/error/timeout as block; run only after deterministic allow.
**Acceptance:** LLM can only block; unavailable → `LLM_SAFETY_UNAVAILABLE` block; verdict audited (redacted).
**Stop gate:** if sanitization cannot guarantee no-secret context, do not send to the LLM — block and record a blocker.

### 6. [ ] Wire the full interceptor + audit

**Files:** `packages/coding-agent/src/guarded-forward/guardedForward.js`; reuse W3 `packages/coding-agent/src/audit/*`; new root bridge `mcp/proxy/guardedForwardBridge.ts` (W2 `toolSemanticsBridge.ts` pattern).
**Steps:** assemble ordering; forward exactly once after full pass; block path never contacts upstream; write `GuardedForwardRecord` + audit on every terminal path.
**Acceptance:** order enforced; blocked never reaches mock; allowed forwards once.

### 7. [ ] Tests

**Files:** `packages/coding-agent/test/**/*.test.js`, mock on-chain policy reader, mock LLM reviewer, W1 mock upstream.
**Steps:** cover each block stage, allow path, policy fail-closed, LLM veto + fail-closed, digest mismatch, idempotency, per-user isolation, audit redaction.
**Acceptance:** `npm test` (node --test) green in `packages/coding-agent`.
**Stop gate:** do not mark complete with failing tests or partial implementation.

### 8. [ ] Apply progress + verify report

**Files:** `apply-progress.md`, `verify.md`, `verify-report.md`.
**Steps:** map each spec requirement to test/code evidence; record carryover (constitution ADR for on-chain policy + LLM authority).
