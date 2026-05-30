# Verify Report: W4 Guarded Forward Pipeline

## Summary

W4 implements the deterministic `tools/call` gate plus the veto-only LLM safety layer, reusing W2 tool-semantics and W3 policy/policy-source/risk/audit. Verified by automated tests and a live Azure LLM check.

## Results

- `packages/coding-agent` → `npm test` (node --test): **61 pass / 0 fail** (no regressions in W2/W3 suites).
- Root proxy → `bun run typecheck`: **exit 0**; `bun test`: **88 pass / 0 fail**.
- LLM final safety review against the real Azure OpenAI deployment: **verdict `safe`** for a benign read context; secrets are not sent (sanitized context).

## Requirement coverage

| Spec / capability               | Verdict | Evidence |
| ------------------------------- | ------- | -------- |
| call-interceptor-pipeline       | pass    | `guardedForward.js` ordering; guarded-forward tests (allow path, stage blocks) |
| onchain-policy-resolution       | pass    | fail-closed tests (`POLICY_RPC_READ_FAILED`, `POLICY_CONTRACT_UNAVAILABLE`); reuses W3 `policy-source` |
| candidate-tx-digest             | pass    | `candidateTxDigest.test.js` (determinism, covered_fields, mismatch sensitivity) |
| idempotency                     | pass    | `idempotencyStore.test.js` + approve_token retry forwards once |
| guarded-forward-and-block       | pass    | forward-exactly-once + block-never-forwards tests |
| guarded-forward-record-audit    | pass    | record carries `policy_source` snapshot + `llm_review`; audit reused from W3 |
| safe-errors-w4                  | pass    | extended `SAFE_MESSAGES`; codes asserted in tests |
| llm-final-safety-review         | pass    | `finalSafetyReview.test.js` (safe/unsafe/malformed/throw/no-config) + veto + fail-closed + live Azure |

## Key safety properties verified

- Deterministic floor authoritative; LLM runs only after a deterministic allow and can only block.
- Fail-closed on policy-source failure, missing policy, LLM unavailable/ambiguous.
- No forward on any block path; exactly-once forward on allow; idempotent broadcasts.
- No secrets sent to the LLM; sanitized, redacted records/audit.

## Carryover

- Runtime wiring of `guardedForwardBridge.ts` (Monad RPC transport + W3 identity binding) — next integration step.
- Constitution ADR for on-chain policy + LLM-veto divergences (tracked separately).
