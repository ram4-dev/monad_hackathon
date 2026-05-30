# Tasks: W6 Demo Hardening and Release Readiness

W6 hardens and documents the W1–W5 runtime. It MUST NOT introduce new architecture, MUST keep the demo Compass-only, and MUST NOT read/log/export/commit secrets.

## Review Workload Forecast

| Field                   | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Estimated changed lines | ~500-900 (script + tests + docs)                             |
| 400-line budget risk    | Medium                                                       |
| Chained PRs recommended | Optional                                                     |
| Suggested split         | (A) smoke + tests; (B) runbook + no-bypass + ADRs            |
| Delivery strategy       | single-pr-with-optional-split                                |

## Global Safety and Stop Gates

- [ ] Do not introduce new architecture/tools/pipeline mechanics.
- [ ] Keep the host MCP config Compass-only; never add Wallet Agent directly.
- [ ] Do not read/log/export/commit secrets; keep audit redacted.
- [ ] The smoke must be deterministic and idempotent (policy-contract seed included).

## Tasks

### 1. [x] Demo config + policy-contract seed
**Steps:** chain config example; per-user policy-contract seed/config; host MCP config docs (Compass only).
**Acceptance:** examples present; no secrets; policy lives on-chain (no local rules file).

### 2. [x] End-to-end smoke script
**Steps:** start Compass → connect upstream → configure Monad → deploy/seed policy contract (guarded) → read → simulate → forward safe (on-chain allow) → block dangerous allowance → inspect audit.
**Acceptance:** runs clean-machine; shows allow + block governed by on-chain policy + audit reference; idempotent.

### 3. [x] Critical test suite
**Steps:** registry, on-chain policy read + fail-closed, blocked-never-upstream, digest + mismatch, idempotency, audit redaction, per-user isolation, LLM veto + fail-closed, allowance rules.
**Acceptance:** `npm test` (node --test) green in `packages/coding-agent`; coverage includes fail-closed + isolation, not just happy path.

### 4. [x] Operations runbook
**Steps:** RPC provider + caveats; policy-contract deploy (foundry/hardhat); `eth_call` reads; faucet/account setup (no secrets).
**Acceptance:** a reviewer can reproduce the demo from the runbook.

### 5. [x] No-bypass proof
**Steps:** sanitized host config + tool listing showing Compass only; `compass_status` internal-management attestation.
**Acceptance:** closes `W0-BLOCKER-007`.

### 6. [x] Known limitations + ADRs
**Steps:** ADR for on-chain per-user policy model; ADR for LLM veto-only layer; limitations (latency/cost, identity owned by W3, provider limits, testnet-only).
**Acceptance:** ADRs under `docs/adr/`; divergences from constitution explicitly recorded.

### 7. [x] Apply progress + verify report
**Steps:** map each spec requirement to evidence; record residual blockers.
