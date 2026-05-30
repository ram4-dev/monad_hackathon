# Change: W6 Demo Hardening and Release Readiness

## Intent

Make the Compass demo reproducible, safe, and reviewable end-to-end on Monad Testnet, including deploying/seeding the **per-user policy contract** and showing decisions governed by on-chain policy plus the LLM final safety layer. W6 adds the critical test suite, the operations runbook, the no-bypass proof (closing `W0-BLOCKER-007`), and the known-limitations/ADR list — without introducing new architecture.

## Context and Sources

- `docs/constitution.md` (v0.6) — §11 testing, §12 PoC checklist, §3.4 scope.
- `docs/development-waves.md` — W6 section (on-chain per-user policy model).
- W4 (guarded pipeline + LLM veto), W5 (action coverage + policy-contract lifecycle), W0 (RPC/chain facts).
- Official Monad references: `https://docs.monad.xyz/guides/deploy-smart-contract/index.md`, `https://docs.monad.xyz/reference/json-rpc/api.md`, `https://docs.monad.xyz/developer-essentials/testnets.md`.

## Scope

### In Scope

- Chain config examples and a per-user **policy contract seed/config** (policy lives on-chain, not as a local rules file).
- Host setup instructions showing Compass only, never direct Wallet Agent MCP.
- End-to-end smoke script: start Compass; connect Wallet Agent; configure Monad Testnet; deploy/seed the user's policy contract (guarded); read wallet state/balance; simulate; forward a safe action allowed by on-chain policy; block a dangerous allowance per on-chain policy; inspect audit (with the policy-contract reference).
- Critical test suite: registry, on-chain policy read, blocked upstream calls, digest, idempotency, audit redaction, fail-closed, per-user isolation, and the LLM veto.
- Operations runbook: RPC provider choice + caveats, policy-contract deployment (foundry/hardhat), `eth_call` reads.
- Known limitations and ADR list, including the on-chain policy model, user identity (W3), latency/cost of on-chain reads, the fail-closed semantics, and the LLM-as-veto divergence from the current constitution.

### Non-Goals

- No new architecture, tools, or pipeline mechanics (those are W1–W5).
- No mainnet, multi-chain, x402, or UI.
- No secrets read, logged, exported, or committed.

## Capabilities

| Capability Domain        | Type | Purpose                                                                                  |
| ------------------------ | ---- | ---------------------------------------------------------------------------------------- |
| `reproducible-demo`      | New  | Clean-machine demo using only Compass in the host MCP config.                            |
| `e2e-smoke-script`       | New  | Scripted end-to-end flow incl. policy-contract deploy/seed and on-chain-governed decisions. |
| `critical-test-suite`    | New  | Tests for registry, on-chain policy read, blocks, digest, idempotency, redaction, fail-closed, isolation, LLM veto. |
| `operations-runbook`     | New  | RPC + contract deploy + `eth_call` operational guidance and caveats.                     |
| `no-bypass-proof`        | New  | Evidence that the host uses Compass only; closes `W0-BLOCKER-007`.                        |
| `known-limitations-adr`  | New  | ADR/limitations incl. on-chain policy model, identity, latency/cost, fail-closed, LLM veto. |

## Affected Areas

- `config/` examples; a demo policy-contract seed/config; host MCP config docs.
- A smoke script and the critical test suite; runbook docs; ADR list under `docs/adr/`.

## Safety Requirements

- The demo runs from a clean machine using only Compass; Wallet Agent is never in the host MCP config.
- The smoke deploys/seeds the policy contract as a guarded action; no secrets are read/logged/committed.
- The demo must show both an allowed and a blocked decision driven by the on-chain policy, with the policy-contract reference visible in audit.

## Risks

- Demo now depends on contract deployment + RPC reads (latency, provider limits); runbook documents these.
- On-chain policy adds setup steps to the clean-machine demo; smoke script must be deterministic and idempotent.

## Rollback

- Revert W6 docs/scripts/tests; the runtime (W1–W5) is unaffected. The demo policy contract on testnet can be re-seeded; no production rollback applies.

## Success Criteria

- Demo runs from a clean machine using only Compass in the host MCP config.
- Critical tests pass (incl. on-chain policy read, fail-closed, per-user isolation, LLM veto, digest, idempotency, redaction).
- The demo shows `allow|block` decisions governed by the user's on-chain policy contract, with the contract reference in the audit.
- Reviewers can verify the proxy boundary without product history.
- No secrets are read, logged, exported, or committed; the no-bypass proof closes `W0-BLOCKER-007`.
