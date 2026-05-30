# Change: W5 Monad Action Coverage

## Intent

Cover the P0 Wallet Agent tools safely on Monad Testnet by applying the W4 guarded pipeline to each concrete tool class, and add the **per-user policy contract lifecycle** (deploy/register/update) as a guarded on-chain action. Every action is validated against the user's on-chain policy; dangerous allowances and key-management tools are blocked before the upstream.

W5 is evidence- and behavior-driven: each tool class is validated independently after W4, against the real Wallet Agent + Monad Testnet (or documented fallbacks), under explicit consent for any state mutation.

## Context and Sources

- `docs/constitution.md` (v0.6) — §4.2 Registry P0, §5 Monad config, §6 policy/risk, §12 PoC checklist.
- `docs/development-waves.md` — W5 section (on-chain per-user policy model).
- W0 evidence — upstream schemas, chain validation, RPC provider, simulation evidence, `dry_run_transaction` absent (`W0-BLOCKER-009`).
- W4 — the guarded forward pipeline (registry → evidence → simulation → risk → on-chain policy → LLM veto → forward/block), digest, idempotency, audit.
- W3 — user identity + on-chain policy contract (abstract interface).

Official Monad references: `https://docs.monad.xyz/developer-essentials/testnets.md`, `.../transactions.md`, `.../gas-pricing.md`, `https://docs.monad.xyz/reference/json-rpc/api.md`, `https://docs.monad.xyz/guides/deploy-smart-contract/index.md`.

## Scope

### In Scope

- Chain management: `add_custom_chain` (Monad Testnet config only), `switch_chain` (only `10143`).
- Read-only: `get_wallet_info`, `get_balance`, `get_token_balance`.
- Simulation: `estimate_gas`, `simulate_transaction` (`dry_run_transaction` treated as absent).
- Transaction execution: `transfer_token` and/or `send_transaction` with simulation + digest + on-chain policy + idempotency.
- Token allowances: unlimited `approve_token` blocks before upstream; finite `approve_token` allows only an exact `token + spender + amount + chain` match against the on-chain policy allowlists.
- Signature handling: `sign_typed_data` only for mapped typed data with expected domain/chain/verifyingContract/primaryType; opaque signatures block.
- **Per-user policy contract lifecycle**: read (consumed by all actions), and deploy/register/update as a guarded on-chain action (policy-over-policy: only the owner may modify their own policy), plus bootstrap.
- Monad RPC behavior handling: async send validation, no pending-tx lookup, provisional `latest`, gas-estimation caveats, provider limits.

### Non-Goals

- No new pipeline mechanics (built in W4); W5 applies them per tool.
- No implementation of the policy contract's Solidity beyond what the lifecycle action needs to deploy/update via the upstream/RPC (contract authoring belongs to W3 unless explicitly delegated).
- No demo packaging/runbook (W6).
- No mainnet, no multi-chain, no x402.
- No secrets read/logged; mutations require explicit consent.

## Capabilities

| Capability Domain                | Type | Purpose                                                                                  |
| -------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| `chain-management-coverage`      | New  | `add_custom_chain`/`switch_chain` allowed only for Monad Testnet `10143`.                |
| `read-only-coverage`             | New  | `get_wallet_info`/`get_balance`/`get_token_balance` allowed + audited.                   |
| `simulation-coverage`            | New  | `estimate_gas`/`simulate_transaction`; `dry_run_transaction` absent.                     |
| `transaction-execution-coverage` | New  | `transfer_token`/`send_transaction` with simulation + digest + policy + idempotency.     |
| `token-allowance-coverage`       | New  | Unlimited approval blocks; finite approval only on exact on-chain policy match.          |
| `signature-coverage`             | New  | `sign_typed_data` mapped-only; opaque signatures block.                                  |
| `user-policy-contract-lifecycle` | New  | Deploy/register/update the user's policy contract as a guarded on-chain action.          |
| `monad-rpc-behavior`             | New  | Handle Monad RPC specifics (async send, no pending lookup, provisional latest, limits).  |

## Affected Areas

- Per-tool wiring in the W4 pipeline + `ToolSemantics` (W2) entries for each P0 tool.
- `back/services/evm/*` for Monad RPC behavior and the policy-contract lifecycle action.
- Tests against mock upstream + mock policy reader; real upstream/testnet only under consent.

## Safety Requirements

- Every mutating action passes simulation + digest + on-chain policy + idempotency before forward; the LLM veto applies.
- Unlimited/unknown allowances always block before the upstream; key-management/private-key tools are never exposed.
- Updating a user's policy contract is itself guarded and only permitted to the policy owner; per-user isolation holds.
- Any testnet mutation requires explicit consent (network, account constraints, recipient/target, asset, max amount, expected evidence); otherwise it is skipped and recorded.

## Risks

- Real upstream/testnet behavior may differ from W0 evidence; reconcile and record blockers.
- Policy-contract update is a sensitive recursive action; mis-scoping could let a user weaken their own guardrails — mitigated by policy-over-policy rules + audit.
- Monad RPC caveats (no pending lookup, provisional latest) can affect confirmation/idempotency; handled explicitly.

## Rollback

- Disable a tool's coverage by removing its registry entry (the tool then hides/blocks). No on-chain rollback for already-broadcast mutations; record evidence and stop.

## Success Criteria

- Claude can perform read-only calls through Compass without direct Wallet Agent access.
- A safe Monad Testnet action forwards only after registry/evidence/simulation/on-chain policy/LLM pass.
- Unlimited allowance and key-management tools block before the upstream.
- Finite allowance allows only on an exact on-chain policy match.
- The user policy-contract update runs as a guarded action (digest + idempotency), audited, with per-user isolation.
- Audit includes decision, digest when applicable, on-chain policy snapshot, and upstream result/error.
