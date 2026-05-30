# Change: W3 Policy, Risk, and Audit Foundation (On-Chain Policy Contract)

## Intent

Wave 3 defines the deterministic safety foundation after Wave 2 tool semantics and before Wave 4 guarded forwarding, with **policy source of truth moved to an on-chain smart contract on Monad Testnet**.

Compass SHALL read policy from a deployed policy contract on Monad Testnet (`chain_id=10143`) and fail closed when policy cannot be safely read/validated.

## Monad references for changed assumptions

- Testnet network/chain facts and reset caveat: https://docs.monad.xyz/developer-essentials/testnets.md
- Deployment flow and keystore guidance: https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
- EVM/gas behavior differences and Monad Foundry recommendation: https://docs.monad.xyz/developer-essentials/differences.md
- Docs index: https://docs.monad.xyz/llms.txt

## Goals

- Define and deploy a policy contract on Monad Testnet (10143) as policy source of truth.
- Expose full policy shape on-chain (policy id/version, allowlists, caps, flags, and related fields needed for W3 decisions).
- Implement read-only policy client behavior in Compass-side W3 modules (ABI-based reads only; no user-tool forwarding).
- Enforce owner-managed, versioned policy updates with emitted contract events.
- Keep W2 handoff contract: W3 consumes resolver outputs and never reclassifies unknown tools.
- Keep deterministic risk checks, safe denial model, and redacted append-only audit.
- Enforce fail-closed behavior for read/RPC/ABI/schema/chain/version failures.

## Non-Goals

W3 will not implement or claim:

- Wave 1 runtime proxy behavior, upstream lifecycle, or runtime tools/list proof.
- Wave 4 guarded forwarding, intercepted runtime no-forward proof, or actual Wallet Agent tool forwarding.
- User transaction signing/broadcasting/mutation paths.
- Mainnet or multichain hardening.

Clarification for this wave:
- **Allowed chain mutation only for W3 policy contract deployment transaction(s)** on Monad Testnet.
- Deployment handling must avoid secret disclosure and follow keystore-safe operational guidance; no `.env`/private-key dumps in artifacts.

## Scope

### In Scope

- OpenSpec artifacts for `wave-3-policy-risk-audit-foundation` aligned to on-chain policy source.
- Policy contract ABI/schema requirements and deployment evidence requirements.
- Package-local W3 modules/tests in later phases under `packages/coding-agent` for:
  - policy contract read client (read-only ABI calls),
  - policy validation/mapping,
  - risk checks,
  - safe errors,
  - append-only redacted audit.
- Local fixtures only as mocks/snapshots of on-chain reads (not authoritative policy).

### Out of Scope for Apply

- Runtime forwarding to Wallet Agent/user tool execution.
- Secrets reading (`.env`, private keys, keystores, secret manager outputs).
- Live user transaction mutation/signing/broadcasting for product tool calls.

## Dependencies and handoffs

- W2 registry/resolver remains input authority for tool semantics/status and pre-policy blocks.
- W3 reads policy contract and evaluates allow/block + risk + safe error + audit.
- W4 consumes W3 outputs before any forwarding.

## Missing definitions to close in design/tasks

- Contract ABI exact shape and pagination/limits strategy for large allowlists.
- Owner model details: owner address artifact, rotation/transfer flow, emergency freeze semantics.
- Upgradeability decision: immutable contract vs proxy upgrade pattern.
- Deployment artifact contract address format/source and verification evidence.
- RPC provider selection/fallback order and timeout policy.
- Cache/freshness policy for policy reads (if any) while preserving fail-closed guarantees.
- Policy update events schema and event-to-audit mapping.
- Testnet reset handling and redeploy/address rollover procedure.
- Deployment secret handling protocol (keystore/account ops without secret disclosure).

## Risks

- Fail-closed can reduce availability during RPC incidents.
- On-chain shape design errors can make policy reads expensive/fragile.
- Testnet resets can invalidate deployed addresses and historical assumptions.
- Owner key governance/rotation not fully specified yet.
- W3 still cannot prove runtime no-forward boundary without W1/W4 integration.

## Success criteria

- W3 requirements/specs reference on-chain policy contract as authoritative source.
- Policy read failures (RPC/ABI/schema/chain/version) deterministically block (`fail closed`).
- Owner-versioned updates are represented and auditable via events.
- W2 pre-policy blocks remain preserved; no W3 reclassification.
- Deployment/verification evidence requirements are explicit in artifacts.

## Validation plan

- Spec/design phase validation: requirement completeness for contract source, fail-closed, events, deployment evidence.
- Apply phase (later): package-local tests plus controlled deployment evidence capture.
- No secret reads or secret values in logs/artifacts.

## Review workload forecast

Expected implementation size is medium-high due to contract ABI+deployment evidence, read client behavior, fail-closed logic, risk/audit integration, and tests.

## Next phase

Proceed to design with explicit contract schema/ABI, deployment evidence plan, fail-closed policy-read behavior, and unresolved definition closures above.
