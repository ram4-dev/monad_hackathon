# Apply Progress: W4 Guarded Forward Pipeline

## Status

Implemented at the `packages/coding-agent` package level and verified. `npm test` (node --test) is green (61 tests, including the pre-existing W2/W3 suites — nothing broken); the root proxy still typechecks (`bun run typecheck` exit 0) and its suite is green (88 tests). The LLM final safety layer was confirmed end-to-end against the real Azure OpenAI deployment.

## What was built (reusing W2/W3)

New modules under `packages/coding-agent/src/` (pure JavaScript, CommonJS, matching W2/W3):

- `guarded-forward/guardedForward.js` — the orchestrator. Order: W2 `resolveCallByName` → on-chain policy resolution (fail-closed) → W3 `evaluatePolicy` (which composes required-evidence + risk + policy) → deterministic allow/block → `candidate_tx_digest` (write/sig/approval classes) → **LLM final safety review (veto-only)** → idempotent forward (DI). Never forwards on a block.
- `guarded-forward/guardedForwardRecord.js` — `GuardedForwardRecord` with on-chain `policy_source` snapshot + `llm_review`.
- `digest/candidateTxDigest.js` — canonical keccak256 digest (reuses W3 `policy/keccak256`) + `covered_fields`.
- `idempotency/idempotencyStore.js` — `runOnce(key, fn)`; no double execution; concurrent-safe.
- `llm/finalSafetyReview.js` — veto-only, fail-closed reviewer; `llm/sanitizeContext.js` strips secrets; `llm/azureClient.js` reads Azure config from env (`.env.example`).
- `safe-errors/safeError.js` — extended `SAFE_MESSAGES` with W4 codes (`USER_POLICY_UNRESOLVED`, `POLICY_CONTRACT_UNAVAILABLE`, `DIGEST_MISMATCH`, `LLM_SAFETY_BLOCKED`, `LLM_SAFETY_UNAVAILABLE`, `UPSTREAM_*`).

Runtime seam: `mcp/proxy/guardedForwardBridge.ts` (TS) exposes the orchestrator to the W1 proxy following the W2 `toolSemanticsBridge.ts` pattern.

## Reuse (not reinvented)

W2 `tool-semantics/` resolver; W3 `policy-source/` (on-chain read client/cache/snapshot/config), `policy/evaluatePolicy.js` (registry+risk+policy), `risk/`, `audit/`, `safe-errors/`.

## Verification results

- `packages/coding-agent`: `npm test` → 61 pass / 0 fail (digest 5, idempotency 5, llm 7, guarded-forward 7, + 37 pre-existing W2/W3).
- Root: `bun run typecheck` exit 0; `bun test` → 88 pass / 0 fail.
- LLM integration: `finalSafetyReview` against the real Azure deployment returned `verdict: safe` for a benign read context (no secrets sent).

## Invariants proven by tests

- Allowed read-only call forwards exactly once; record carries the on-chain policy snapshot + LLM verdict.
- Policy-source failure / missing policy source → fail-closed block, never forwards (`POLICY_RPC_READ_FAILED`, `POLICY_CONTRACT_UNAVAILABLE`).
- Non-allowlisted tool → `POLICY_TOOL_NOT_ALLOWED`, no forward.
- LLM veto turns a deterministic allow into a block (`LLM_SAFETY_BLOCKED`); LLM unavailable → `LLM_SAFETY_UNAVAILABLE`; neither can widen a block (LLM only runs after a deterministic allow).
- `approve_token` within policy builds a digest and is idempotent across retries (forward executed exactly once).
- Sanitized LLM context keeps tx fields but redacts secret-looking keys.

## Out of scope / remaining integration

- Live wiring of `guardedForwardBridge.ts` into the runtime `tools/call` path requires the Monad RPC transport (`{ config, transport }` reading the deployed policy contract) and the W3 user-identity binding. The orchestrator consumes these via DI; the runtime injection is the next integration step (W5 covers per-tool/real-testnet behavior).
- Divergences requiring a constitution ADR (tracked separately): on-chain per-user policy model and the LLM-as-final-veto layer.
