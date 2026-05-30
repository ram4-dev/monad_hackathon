# Chain Management Coverage Specification

## Purpose

Cover `add_custom_chain` and `switch_chain` so they only ever target Monad Testnet (`chain_id=10143`), through the W4 guarded pipeline.

## Requirements

### Requirement: Add Custom Chain Restricted To Monad Testnet

`add_custom_chain` MUST be allowed only for a Monad Testnet configuration: `chain_id=10143`, native currency `MON`, and an allowlisted/configured RPC URL. Any other chain configuration MUST block.

#### Scenario: Monad Testnet config allowed

- GIVEN an `add_custom_chain` call with `chain_id=10143`, `MON`, and an allowlisted RPC
- WHEN W5 evaluates it
- THEN it is allowed and audited

#### Scenario: Non-Monad chain blocked

- GIVEN an `add_custom_chain` call for any chain other than `10143`
- WHEN W5 evaluates it
- THEN it blocks before the upstream

### Requirement: Switch Chain Restricted To 10143

`switch_chain` MUST be allowed only when the target is `chain_id=10143`.

#### Scenario: Switch to Monad Testnet allowed

- GIVEN a `switch_chain` call targeting `10143`
- WHEN W5 evaluates it
- THEN it is allowed and audited

#### Scenario: Switch to other chain blocked

- GIVEN a `switch_chain` call targeting a chain other than `10143`
- WHEN W5 evaluates it
- THEN it blocks
