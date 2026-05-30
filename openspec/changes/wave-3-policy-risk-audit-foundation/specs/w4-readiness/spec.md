# W4 Readiness Specification

## Purpose

Define W3 handoff to W4 where pre-forwarding decisions depend on W2 semantics plus on-chain Monad Testnet policy contract reads.

## Requirements

### Requirement: Reusable On-Chain-Policy Decision Primitives

W3 SHALL expose reusable primitives that combine W2 resolution, on-chain policy fetch/validation, deterministic risk, safe denial shaping, and audit-ready metadata.

#### Scenario: W4 consumes W3 outputs
- GIVEN W4 provides W2-resolved tool call and evidence
- WHEN W4 invokes W3 primitives
- THEN W3 SHALL return `allow|block`, safe reason codes, policy id/version, and sanitized audit metadata

### Requirement: Fail-Closed Pre-Forwarding Gate

When on-chain policy cannot be safely read/validated, W3 SHALL return `block` so W4 can stop before forwarding.

#### Scenario: Policy read failure blocks before forwarding
- GIVEN RPC/ABI/schema/chain/version policy-read failure
- WHEN W4 asks W3 for pre-forwarding decision
- THEN W3 SHALL return `block`
- AND W4 SHALL treat this as non-forwardable

### Requirement: Guarded Forwarding Still Out of Scope for W3

W3 SHALL NOT implement runtime forwarding/interception/no-forward runtime proof.

#### Scenario: W3 allow does not forward
- GIVEN W3 returns `allow`
- WHEN artifacts are reviewed
- THEN W3 SHALL only prove decision readiness
- AND SHALL NOT execute Wallet Agent forwarding/sign/broadcast

### Requirement: Deployment Address and Version Handoff

W4 readiness artifacts SHALL include policy contract address and expected policy version compatibility rules required by W3 decision code.

#### Scenario: Address/version contract handoff is explicit
- GIVEN W3 artifacts are consumed by W4 planning
- WHEN handoff is reviewed
- THEN expected contract address source, chain binding, and version compatibility SHALL be explicit
