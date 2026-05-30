# Operations Runbook Specification

## Purpose

Provide the operational guidance needed to run and reproduce the demo: RPC provider choice/caveats, per-user policy-contract deployment, and on-chain reads.

## Requirements

### Requirement: RPC Provider Guidance

The runbook MUST document the demo RPC provider choice, rate-limit and gas caveats, and fallback providers (from W0 evidence).

#### Scenario: RPC guidance present

- GIVEN the runbook
- WHEN an operator reads it
- THEN it states the provider, caveats, and fallbacks

### Requirement: Policy Contract Deployment Steps

The runbook MUST document how to deploy/seed the per-user policy contract on Monad Testnet (e.g. foundry/hardhat per the Monad deploy guide) and how Compass reads it via `eth_call`.

#### Scenario: Deployment documented

- GIVEN the runbook
- WHEN an operator follows the deployment section
- THEN they can deploy/seed the policy contract and confirm Compass reads it

### Requirement: Monad RPC Caveats Documented

The runbook MUST document Monad RPC behavior caveats (async send, no pending-tx lookup, provisional `latest`, gas estimation) relevant to running the demo.

#### Scenario: Caveats documented

- GIVEN the runbook
- WHEN reviewed
- THEN it lists the Monad RPC caveats that affect the demo

### Requirement: No Secrets In Runbook

The runbook MUST instruct using environment for secrets and MUST NOT contain real keys, tokens, or credentialed URLs.

#### Scenario: Runbook is secret-free

- GIVEN the runbook
- WHEN inspected
- THEN it contains no secrets and points to environment-based configuration
