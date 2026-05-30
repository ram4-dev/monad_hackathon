# End-to-End Smoke Script Specification

## Purpose

Define the scripted end-to-end flow that demonstrates Compass governing Monad Testnet actions via the user's on-chain policy and the LLM final safety layer.

## Requirements

### Requirement: Full Demo Flow

The smoke script MUST perform, in order: start Compass; connect Wallet Agent upstream; configure Monad Testnet; deploy/seed the user's policy contract (guarded); read wallet state/balance; simulate; forward a safe action allowed by the on-chain policy; block a dangerous allowance per the on-chain policy; inspect audit.

#### Scenario: Smoke runs the full flow

- GIVEN a clean environment
- WHEN the smoke script runs
- THEN each step executes in order and produces observable output

### Requirement: Shows Allow And Block Governed By On-Chain Policy

The smoke MUST demonstrate at least one allowed action and one blocked action, both governed by the user's on-chain policy.

#### Scenario: Allowed and blocked both shown

- GIVEN the smoke run
- WHEN it completes
- THEN it shows a safe action forwarded (on-chain allow) and a dangerous allowance blocked (on-chain policy)

### Requirement: Audit Shows Policy Contract Reference

After the run, the audit MUST show the on-chain policy-contract reference (address + version/block) and the LLM verdict for the forwarded action.

#### Scenario: Audit reference present

- GIVEN a completed smoke run
- WHEN the audit is inspected
- THEN it includes the policy-contract reference and the LLM verdict

### Requirement: Idempotent Smoke

Re-running the smoke MUST be safe; the policy-contract seed and any execution MUST be idempotent.

#### Scenario: Re-run is safe

- GIVEN a previously completed smoke run
- WHEN it is run again
- THEN it does not double-deploy or double-execute
