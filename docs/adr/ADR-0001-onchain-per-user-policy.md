# ADR-0001: On-chain per-user policy as policy source of truth

- Status: Proposed (requires constitution amendment)
- Date: 2026-05-30
- Waves: W3 (contract + read), W4 (decision), W5 (coverage + lifecycle), W6 (demo)

## Context

The constitution v0.6 (§3.4, §6) scoped policy as a **local JSON file** evaluated in-process and
listed on-chain rule state as out of P0. During implementation the product decision changed: the
policy must **live on Monad Testnet as a per-user policy contract** (`CompassPolicy`), and Compass
reads it to decide `allow|block`, failing closed when it cannot be read.

## Decision

- Policy source of truth is the deployed `CompassPolicy` contract on Monad Testnet (`chain_id=10143`).
- Compass resolves the user's identity → their policy contract, reads it (ABI/RPC), and evaluates
  deterministically. Any read/RPC/ABI/schema/chain/version failure → **block (fail-closed)**.
- Updating a user's policy is itself a guarded on-chain action (owner-only; policy-over-policy).
- No local-file policy path is used at runtime.

## Consequences

- Adds RPC latency + failure modes to the decision path; mitigated by caching + freshness + fail-closed.
- Requires contract deployment + funded deployer for demos; testnet reset → redeploy.
- Diverges from constitution §3.4 — this ADR records the divergence and **requires a constitution
  amendment** to ratify. Until ratified, the waves docs flag the divergence explicitly.

## Alternatives considered

- Local JSON policy (original P0): simpler, but does not meet the per-user on-chain requirement.
- Off-chain DB policy: avoids RPC cost but loses on-chain auditability/ownership guarantees.
