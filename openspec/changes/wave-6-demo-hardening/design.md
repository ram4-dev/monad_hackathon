# Design: W6 Demo Hardening and Release Readiness

## Status and intent

W6 packages and hardens the W1–W5 runtime into a reproducible, reviewable demo on Monad Testnet, with the per-user policy living on-chain. It introduces no new architecture: it deploys/seeds the policy contract, scripts the end-to-end flow, adds the critical test suite, writes the operations runbook, proves no-bypass, and records limitations/ADRs.

Source of truth: `docs/constitution.md` (overrides), the on-chain-policy `docs/development-waves.md`, and W4/W5.

## Design principles

1. **No new architecture.** W6 only hardens, documents, and proves; behavior comes from W1–W5.
2. **Clean-machine reproducibility.** The demo runs from a fresh checkout with only Compass in the host MCP config.
3. **On-chain policy visible.** The demo shows decisions governed by the user's on-chain policy contract, with its reference in the audit.
4. **Deterministic, idempotent smoke.** The smoke script can be re-run safely; the policy-contract seed is idempotent.
5. **Secret-safe.** No secrets read/logged/exported/committed; audit stays redacted.

## End-to-end smoke flow

```text
1. start Compass (host MCP config: Compass only)
2. connect Wallet Agent upstream (internally managed)
3. configure Monad Testnet (chain 10143)
4. deploy/seed the user's policy contract (guarded on-chain action; idempotent)
5. read wallet state / balance (read-only)
6. simulate / estimate_gas
7. forward a SAFE action allowed by the on-chain policy (+ LLM safe verdict)
8. block a DANGEROUS allowance per the on-chain policy (unlimited approve)
9. inspect audit: shows policy-contract reference (address + version/block) and LLM verdict
```

## Critical test suite

- Registry filtering + drift (W2), on-chain policy read + freshness + fail-closed (W4), blocked-never-reaches-upstream (W4), digest + digest-mismatch (W4), idempotency no-double-execute (W4), audit redaction (W3/W4), per-user isolation (W4/W5), LLM veto + fail-closed (W4), allowance unlimited-blocks / finite-exact-match (W5).

## Operations runbook

- RPC provider choice + rate-limit/gas caveats (W0 evidence).
- Policy-contract deployment via foundry/hardhat (Monad deploy guide), and `eth_call` reads.
- Faucet/account setup for the demo account (no secrets committed).
- Known Monad RPC caveats (async send, no pending lookup, provisional latest).

## No-bypass proof

- Sanitized host MCP config + tool listing showing Compass only (no direct Wallet Agent), closing `W0-BLOCKER-007`. `compass_status` attests internal upstream management.

## Known limitations / ADR list

- ADR: on-chain per-user policy model (supersedes local-policy assumption; constitution amendment).
- ADR: LLM as final veto-only safety layer (diverges from "LLM not a security authority"; veto-only, fail-closed).
- Limitations: on-chain read latency/cost, user-identity scheme owned by W3, provider rate limits, testnet-only.

## Review risks

- Confirm the demo truly uses Compass only (no-bypass).
- Confirm the smoke is idempotent and shows both allow and block governed by on-chain policy.
- Confirm tests cover fail-closed and per-user isolation, not just the happy path.

## Rollback

- Revert W6 docs/scripts/tests; runtime unaffected.

## Validation checklist

- [ ] Clean-machine demo runs with Compass-only host config.
- [ ] Smoke shows deploy/seed + allow + block governed by on-chain policy + audit reference.
- [ ] Critical tests pass (incl. fail-closed, isolation, LLM veto).
- [ ] Runbook covers RPC + contract deploy + eth_call.
- [ ] No-bypass proof present; ADRs/limitations recorded.
- [ ] No secrets read/logged/exported/committed.
