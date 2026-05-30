# Token Allowance Coverage Specification

## Purpose

Cover `approve_token` so unlimited/unknown allowances are blocked before the upstream and finite allowances are allowed only on an exact match against the user's on-chain policy.

## Requirements

### Requirement: Unlimited Allowance Always Blocks

An `approve_token` with an unlimited amount (e.g. `uint256.max`) or an unbounded/unknown amount MUST be blocked before reaching the upstream.

#### Scenario: Unlimited approval blocked

- GIVEN an `approve_token` call with `uint256.max`
- WHEN W5 evaluates it
- THEN it blocks before the upstream and is audited

### Requirement: Finite Allowance Requires Exact On-Chain Match

A finite `approve_token` MUST be allowed only when `token + spender + amount + chain (10143)` exactly match an entry in the user's on-chain policy allowlists.

#### Scenario: Exact match allowed

- GIVEN a finite `approve_token` matching exactly an on-chain policy allowlist entry
- WHEN W5 evaluates it
- THEN it is allowed (with simulation, digest, idempotency) and audited

#### Scenario: Non-matching finite allowance blocked

- GIVEN a finite `approve_token` whose token/spender/amount is not allowlisted on-chain
- WHEN W5 evaluates it
- THEN it blocks

### Requirement: Allowance Decision Is Audited With Policy Snapshot

The allowance decision MUST record the on-chain policy snapshot used (contract address + version/block).

#### Scenario: Snapshot recorded

- GIVEN any `approve_token` decision
- WHEN it is audited
- THEN the on-chain policy snapshot is included
