# Design: W5 Monad Action Coverage

## Status and intent

W5 applies the W4 guarded pipeline to each P0 Wallet Agent tool on Monad Testnet and adds the per-user policy-contract lifecycle as a guarded on-chain action. It does not change pipeline mechanics; it defines, per tool class, the required evidence, simulation requirement, policy checks, and the safe/blocked behaviors. Validation is evidence-driven against W0 facts, the mock upstream/policy reader, and the real upstream/testnet under consent.

Source of truth: `docs/constitution.md` (overrides), the on-chain-policy `docs/development-waves.md`, W0 evidence, and the W4 pipeline.

## Design principles

1. **Reuse the W4 gate; do not fork it.** Each tool class plugs into the same ordered pipeline with its registry-declared evidence/simulation/policy.
2. **Default deny.** Anything not registered/allowlisted blocks; unlimited/unknown allowances and key-management tools always block before the upstream.
3. **On-chain policy is the rule source.** Allowlists (recipients/tokens/spenders) and caps come from the user's on-chain policy snapshot, not a local file.
4. **Mutations are consent-gated and evidence-backed.** Simulation + digest + idempotency before any broadcast; explicit consent for testnet mutations.
5. **Policy-over-policy.** Updating a user's policy contract is itself guarded; only the policy owner may modify their own policy.
6. **Respect Monad RPC reality.** Async send, no pending-tx lookup, provisional `latest`, gas caveats, provider limits.

## Per-tool coverage matrix (consumes W2 registry + W4 gate)

| Tool | Class | Evidence / simulation | Decision rule (on-chain policy) |
| --- | --- | --- | --- |
| `add_custom_chain` | chain_management | chain_id=10143, MON, RPC allowlisted | allow only Monad Testnet config |
| `switch_chain` | chain_management | target chain_id=10143 | allow only `10143` |
| `get_wallet_info` | read_only | active chain, account | allow + audit |
| `get_balance` | read_only | address/account, chain 10143 | allow + audit |
| `get_token_balance` | read_only | address/account, token, chain 10143 | allow + audit |
| `estimate_gas` | simulation | tx candidate, chain 10143 | allow + audit |
| `simulate_transaction` | simulation | full tx candidate, chain 10143 | allow + audit |
| `send_transaction` | transaction_execute | full tx candidate + simulation + digest | allow only if on-chain policy permits; idempotent |
| `transfer_token` | transaction_execute | chain/from/token/recipient/amount/gas + simulation | allow only if recipient/token/amount/gas match on-chain policy; idempotent |
| `approve_token` | token_approval | chain/owner/token/spender/finite amount | unlimited → block; finite → allow only exact token+spender+amount+chain match |
| `sign_typed_data` | signature | domain/chainId=10143/verifyingContract/primaryType/decoded | allow only mapped typed data; opaque → block |

`dry_run_transaction` is absent upstream (`W0-BLOCKER-009`) — not covered; `simulate_transaction` is the simulation path.

## Per-user policy contract lifecycle

- **Read:** consumed by every guarded action via W4's `onchainPolicyReader`.
- **Deploy/register:** bootstrapping a user's first policy contract is a guarded on-chain action (simulation + digest + idempotency + audit). Whether the contract bytecode is provided by W3 or here is reconciled with W3.
- **Update:** modifying a user's policy is guarded and restricted to the policy owner (policy-over-policy); per-user isolation enforced; audited with before/after policy version snapshots (sanitized).

## Monad RPC behavior handling

- Async send validation: no synchronous broadcast guarantee; confirmation handled accordingly.
- No pending-tx lookup via `eth_getTransactionByHash` for pending state; rely on idempotency + receipts.
- Provisional `latest`; gas estimation caveats (full gas limit charged); provider rate limits.

## Handoff

- **From W4:** the gate, digest, idempotency, audit, LLM veto.
- **From W2:** registry entries per tool.
- **From W0:** schemas, chain validation, RPC provider, simulation evidence.
- **To W6:** the validated action set used in the end-to-end demo + tests.

## Review risks

- Confirm unlimited allowance always blocks and finite requires exact on-chain match.
- Confirm policy-contract update cannot let a user silently weaken guardrails beyond policy-over-policy rules.
- Confirm Monad RPC caveats do not break idempotency/confirmation assumptions.

## Rollback

- Remove a tool's registry entry to disable coverage. No on-chain rollback for broadcast mutations; record evidence and stop.

## Validation checklist

- [ ] Each read-only/simulation tool allowed + audited.
- [ ] Execution tools forward only after simulation + digest + on-chain policy + idempotency + LLM allow.
- [ ] Unlimited approval blocks; finite approval exact-match only.
- [ ] `sign_typed_data` mapped-only; opaque blocks.
- [ ] Policy-contract update guarded, owner-only, per-user isolated, audited.
- [ ] Monad RPC caveats handled; consent recorded for any testnet mutation.
