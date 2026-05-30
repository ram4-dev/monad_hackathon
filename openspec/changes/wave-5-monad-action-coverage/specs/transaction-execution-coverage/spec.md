# Transaction Execution Coverage Specification

## Purpose

Cover `transfer_token` and/or `send_transaction` so they execute on Monad Testnet only after simulation, a canonical digest, an on-chain policy `allow`, the LLM veto, and with idempotency.

## Requirements

### Requirement: Execution Requires Full Guard Chain

`send_transaction` and `transfer_token` MUST forward only after: required evidence present, simulation successful, `candidate_tx_digest` built, the user's on-chain policy allows, and the LLM final safety review allows.

#### Scenario: Safe execution forwards once

- GIVEN a `transfer_token` call with full evidence, successful simulation, a digest, an on-chain policy allow, and an LLM safe verdict
- WHEN W5 evaluates it
- THEN it forwards exactly one upstream `tools/call`

#### Scenario: Missing any guard blocks

- GIVEN an execution call missing simulation, digest, policy allow, or LLM allow
- WHEN W5 evaluates it
- THEN it blocks before the upstream

### Requirement: Execution Is Idempotent

An execution call MUST carry an `idempotency_key`; a retry with the same key MUST NOT execute twice.

#### Scenario: Retry does not double-execute

- GIVEN an executed transfer with an `idempotency_key`
- WHEN the same key is retried
- THEN the stored result is reused and no second broadcast occurs

### Requirement: Execution Validated Against On-Chain Policy

Recipient/token/amount/gas for an execution MUST be validated against the user's on-chain policy allowlists/caps.

#### Scenario: Recipient not allowlisted blocks

- GIVEN a transfer to a recipient not in the user's on-chain policy allowlist
- WHEN W5 evaluates it
- THEN it blocks

### Requirement: Consent For Real Testnet Mutation

A real testnet broadcast MUST require explicit consent identifying network, account constraints, recipient/target, asset, and max amount; otherwise it is skipped and recorded.

#### Scenario: No consent skips the mutation

- GIVEN no explicit consent for a testnet broadcast
- WHEN W5 would execute it
- THEN it is skipped and the skip is recorded
