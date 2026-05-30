# Read-Only Coverage Specification

## Purpose

Cover the read-only Wallet Agent tools (`get_wallet_info`, `get_balance`, `get_token_balance`) so Claude can read Monad Testnet state through Compass without direct upstream access.

## Requirements

### Requirement: Read-Only Tools Allowed And Audited

`get_wallet_info`, `get_balance`, and `get_token_balance` MUST be allowed and audited when targeting chain `10143` with the required fields, as `read_only` (`state_effect=none`).

#### Scenario: Read-only call forwards and is audited

- GIVEN a `get_balance` call with an address/account on chain `10143`
- WHEN W5 evaluates it
- THEN it is forwarded once and audited as read-only

### Requirement: Read-Only Wrong Chain Blocks

A read-only call whose required chain context is not Monad Testnet MUST block.

#### Scenario: Read-only on wrong chain blocks

- GIVEN a read-only call whose chain is not `10143`
- WHEN W5 evaluates it
- THEN it blocks

### Requirement: Read-Only Never Mutates

Read-only coverage MUST NOT require a digest or idempotency key and MUST NOT trigger any state change.

#### Scenario: No digest for read-only

- GIVEN a read-only call
- WHEN W5 processes it
- THEN no `candidate_tx_digest` or idempotency key is required
