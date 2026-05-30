# Apply Progress: W5 Monad Action Coverage

## Status

Implemented in `packages/coding-agent` (pure JS) on top of W4, and verified. `npm test` (node --test) is green (82 tests, including all prior W2/W3/W4 suites — nothing broken); the root `bun test` runner (which also picks up the package JS suites) reports 109 pass / 0 fail.

## What was built (on top of W4 + reusing W2/W3)

New modules under `packages/coding-agent/src/`:

- `action-coverage/` — flows each P0 Wallet Agent tool through the W4 guarded pipeline:
  - `evidenceExtractors.js` — per-tool `args → evidence` (chain/recipient/token/spender/amount/simulation/typed-data), satisfying the registry `required_fields`/`required_evidence` while the real risk gates use the structured fields.
  - `consentGate.js` — mutations (`transaction_execute`, `token_approval`, `signature`, `contract_write`) require explicit consent (network/account/target/asset/max_amount); otherwise the call is **skipped and recorded**, never forwarded.
  - `actionCoverage.js` — `coverToolCall(...)` resolves the registry hash, applies the consent gate, builds evidence, and delegates to W4 `guardedForward`.
- `monad-rpc/` — Monad Testnet RPC behavior:
  - `monadRpcBehavior.js` — async send classification, no-pending-lookup guard, provisional `latest`, sanitized fail-closed markers.
  - `jsonRpcTransport.js` — fetch JSON-RPC `request(...)`; refuses pending-tx lookups.
  - `simulationEvidence.js` — `eth_call` + `eth_estimateGas` → simulation/gas evidence; fail-closed (`failed`/`unavailable`) on RPC error.
- `policy-contract-lifecycle/` — `coverPolicyUpdate(...)`: deploy/bootstrap/update of the user's policy contract as a guarded on-chain action — owner-only (policy-over-policy), consent + simulation required, candidate digest, veto-only LLM, idempotent, audited with before/after policy version. Cross-user modification blocks (`POLICY_OWNER_ONLY`); update with no existing policy fails closed (`USER_POLICY_UNRESOLVED`).
- `safe-errors`: added `POLICY_OWNER_ONLY`, `MONAD_RPC_UNAVAILABLE`.

## Reuse (not reinvented)

W2 `tool-semantics`; W3 `policy`/`policy-source`/`risk`/`audit`; W4 `guarded-forward`/`digest`/`idempotency`/`llm`. The deterministic per-tool decisions (chain allowlist, recipient/token/spender allowlists, caps, unlimited-approval block, simulation requirement, typed-data rule) live in W3 risk and are exercised per tool here.

## Verification results

- `packages/coding-agent`: `npm test` → 82 pass / 0 fail (new: monad-rpc 6, action-coverage 8, policy-contract-lifecycle 7).
- Root `bun test`: 109 pass / 0 fail.

## Invariants proven by tests

- Read-only flows forward once; mutations without consent are skipped (no forward).
- Transfer with consent + simulation forwards once; missing simulation fails closed (no forward).
- Unlimited `approve_token` blocks (`POLICY_UNLIMITED_APPROVAL_BLOCKED`); finite exact-match allows.
- Non-allowlisted recipient blocks; unmapped tool blocks.
- Monad RPC: pending lookups refused; send treated as async; simulation fail-closed on RPC error.
- Policy contract: owner-only update allowed + version recorded; cross-user blocked; bootstrap once; idempotent; LLM veto blocks.

## Out of scope / remaining integration

- Real Monad Testnet end-to-end requires a deployed `CompassPolicy` contract (`packages/coding-agent/contracts/` + foundry deploy) and the live RPC URL/identity binding; the modules consume these via DI and are exercised here with mocks. Deploying + a live smoke is W6 demo-hardening.
- Divergences requiring a constitution ADR (on-chain policy, LLM veto) tracked separately.
