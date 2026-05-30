# Wallet Agent Simulation PoC Specification

## Purpose

Define the W0 evidence required to prove Wallet Agent gas-estimation and simulation or dry-run behavior for Monad Testnet, or to identify required Compass fallbacks.

## Requirements

### Requirement: Gas Estimation Evidence

The W0 evidence set MUST include `estimate_gas` evidence for a safe Monad Testnet candidate action, or record why Wallet Agent gas estimation is unavailable or insufficient.

#### Scenario: Gas estimation succeeds

- GIVEN a safe candidate action exists on Monad Testnet
- WHEN `estimate_gas` evidence is reviewed
- THEN the evidence includes the gas estimate and enough sanitized transaction context to understand what was estimated
- AND the evidence is tied to `chain_id=10143`

#### Scenario: Gas estimation fails or is unavailable

- GIVEN Wallet Agent or the selected RPC provider cannot provide gas estimation
- WHEN W0 simulation evidence is finalized
- THEN the gap is recorded as a blocker or Compass fallback requirement

### Requirement: Simulation or Dry-Run Evidence

The W0 evidence set MUST validate either `simulate_transaction` or `dry_run_transaction` against Monad Testnet, or explicitly record that upstream simulation is missing, unreliable, or insufficient for Compass guarded forwarding.

#### Scenario: Simulation path works

- GIVEN Wallet Agent exposes a safe simulation or dry-run tool
- WHEN W0 simulation evidence is reviewed
- THEN the evidence shows a successful or safely failed simulation/dry-run tied to a candidate action on `chain_id=10143`

#### Scenario: Simulation path is insufficient

- GIVEN Wallet Agent lacks a usable simulation or dry-run path
- WHEN W0 simulation evidence is reviewed
- THEN W0 records a blocker or fallback requirement before W4 or W5 relies on upstream simulation

### Requirement: Candidate Payload Inspectability

The W0 simulation evidence MUST state whether Wallet Agent exposes enough sanitized candidate payload fields for future `candidate_tx_digest`, policy, risk, audit, and idempotency decisions.

#### Scenario: Candidate payload is inspectable

- GIVEN simulation evidence includes safe fields such as chain, account/source, target, value, data when applicable, and gas context
- WHEN readiness is assessed
- THEN the candidate action is marked suitable for downstream digest and policy planning

#### Scenario: Candidate payload is not inspectable

- GIVEN required candidate fields are missing or opaque
- WHEN readiness is assessed
- THEN the limitation is recorded as a blocker or ADR candidate

### Requirement: Monad Simulation Caveat Coverage

The W0 simulation evidence MUST account for official Monad RPC caveats that can affect `eth_call`, `eth_estimateGas`, full gas limit charging, `eth_maxPriorityFeePerGas` suggestion behavior, transaction validity, and unsupported type 3 blob transactions, citing `https://docs.monad.xyz/reference/json-rpc/overview.md`, `https://docs.monad.xyz/developer-essentials/gas-pricing.md`, and `https://docs.monad.xyz/developer-essentials/transactions.md` where they affect conclusions.

#### Scenario: Simulation result is interpreted

- GIVEN a simulation or gas-estimation result is recorded
- WHEN the result is used to inform downstream work
- THEN the evidence notes relevant Monad provider limits or gas/transaction caveats instead of assuming generic Ethereum behavior

### Requirement: No Broadcast During Simulation PoC

The W0 simulation PoC MUST NOT broadcast or otherwise mutate external state unless the action is explicitly reclassified under the external mutation consent gate.

#### Scenario: A simulation tool may broadcast or mutate

- GIVEN a Wallet Agent tool marketed as simulation can perform a state-mutating action
- WHEN W0 evaluates whether to run it
- THEN it is not run as read-like simulation evidence
- AND it requires explicit external mutation consent before any mutation attempt

### Requirement: Secret-Safe Simulation Evidence

The W0 simulation PoC MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, seed phrases, or secret-manager output.

#### Scenario: Simulation output contains sensitive-looking data

- GIVEN simulation or gas-estimation output contains secret-like values or unnecessary local details
- WHEN the evidence is persisted
- THEN those values are redacted or omitted
- AND only safe fields required for validation remain
