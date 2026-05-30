# Monad RPC Behavior Specification

## Purpose

Ensure W5 handles Monad Testnet RPC specifics that differ from generic Ethereum assumptions, so confirmation and idempotency remain correct (W0 evidence; official Monad docs).

## Requirements

### Requirement: Async Send Validation

W5 MUST NOT assume a synchronous broadcast guarantee; send validation is async on Monad and confirmation MUST be handled accordingly.

#### Scenario: Send is treated as async

- GIVEN a broadcast on Monad Testnet
- WHEN W5 handles the result
- THEN it does not assume immediate synchronous confirmation

### Requirement: No Pending Transaction Lookup

W5 MUST NOT rely on `eth_getTransactionByHash` for pending-state results; it MUST rely on idempotency and receipts.

#### Scenario: Pending lookup not relied upon

- GIVEN a just-broadcast transaction
- WHEN W5 tracks it
- THEN it does not depend on a pending-tx lookup for correctness

### Requirement: Provisional Latest And Gas Caveats

W5 MUST account for provisional `latest` block state and Monad gas-estimation caveats (full gas limit charged) and provider rate limits.

#### Scenario: Gas/limits caveats respected

- GIVEN gas estimation and provider limits on Monad Testnet
- WHEN W5 prepares/forwards an action
- THEN it accounts for the documented caveats and provider limits

### Requirement: RPC Failures Are Fail-Closed And Sanitized

RPC failures affecting a guarded decision MUST result in a block and MUST be surfaced as sanitized safe errors.

#### Scenario: RPC failure blocks safely

- GIVEN an RPC failure during evidence/simulation/policy read
- WHEN W5 handles it
- THEN the action blocks and the error is sanitized
