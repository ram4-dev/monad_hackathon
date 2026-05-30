# External Mutation Consent Gate Specification

## Purpose

Define the W0 consent boundary for any testnet transfer, approval, broadcast, signature, or other action that can mutate external state.

## Requirements

### Requirement: Explicit Consent Before External Mutation

The W0 process MUST NOT perform any external state mutation unless the user has explicitly consented to that specific mutation attempt.

#### Scenario: Consent is granted

- GIVEN a W0 action can transfer value, approve tokens, broadcast a transaction, sign a state-relevant payload, or otherwise mutate external state
- WHEN the user explicitly grants consent for that action
- THEN the action MAY proceed within the consented limits

#### Scenario: Consent is missing

- GIVEN a W0 action can mutate external state
- WHEN explicit consent has not been granted
- THEN the action MUST be skipped or blocked
- AND the skipped mutation is recorded with downstream impact

### Requirement: Consent Details

Consent for a W0 external mutation MUST identify the network, RPC provider, account/source constraints, recipient or target, asset, maximum amount, maximum gas or cost boundary when applicable, action type, and expected evidence to record.

#### Scenario: Consent request is complete

- GIVEN W0 needs consent for a testnet transfer or approval
- WHEN the consent request is reviewed
- THEN it names Monad Testnet `chain_id=10143`, the intended provider label, safe account/source constraints, target, asset, maximum amount, cost boundary, action type, and evidence plan

#### Scenario: Consent request is incomplete

- GIVEN a consent request lacks any required boundary
- WHEN W0 evaluates whether mutation can proceed
- THEN consent is treated as not granted

### Requirement: Consent Denial Handling

If consent is denied or not available, W0 evidence MUST record the mutation as skipped by consent gate and MUST mark any dependent validation as blocked or pending.

#### Scenario: User declines mutation

- GIVEN the user declines a testnet mutation
- WHEN W0 final evidence is prepared
- THEN no mutation evidence is claimed
- AND affected downstream dependencies are recorded as blocked, pending, or covered by non-mutating evidence only

### Requirement: Sanitized Mutation Evidence

When an explicitly consented mutation is performed, W0 evidence MUST record only safe evidence required to verify the outcome and MUST NOT persist secrets or unnecessary local details.

#### Scenario: Consented mutation produces a transaction result

- GIVEN a consented testnet mutation returns a transaction hash, receipt, or error
- WHEN the result is persisted
- THEN the evidence includes safe public identifiers and sanitized status
- AND private keys, seed phrases, `.env` values, credentials, tokens, delegated payloads, and secret-manager output are not recorded

### Requirement: W0 Consent Is Not Product Approval UI

The W0 consent gate MUST be treated as a research/apply safety control and MUST NOT be interpreted as approval of an external approval UI, manual signing flow, or runtime human-approval surface for P0 Compass.

#### Scenario: Downstream design reads W0 consent evidence

- GIVEN W0 contains a consented testnet mutation or skipped mutation record
- WHEN downstream P0 behavior is specified
- THEN the record is understood only as W0 operator consent evidence
- AND P0 runtime behavior remains governed by deterministic Compass policy and `allow` or `block` decisions
