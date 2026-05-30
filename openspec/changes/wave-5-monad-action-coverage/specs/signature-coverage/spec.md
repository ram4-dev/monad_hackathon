# Signature Coverage Specification

## Purpose

Cover `sign_typed_data` so only mapped EIP-712 typed data is allowed, with expected domain/chain/verifyingContract/primaryType; opaque signatures block.

## Requirements

### Requirement: Typed Data Must Be Mapped

`sign_typed_data` MUST be allowed only for typed data mapped in the registry with expected `domain`, `chainId=10143`, `verifyingContract`, and `primaryType`, and decoded fields available as evidence.

#### Scenario: Mapped typed data allowed

- GIVEN a `sign_typed_data` call matching a mapped typed-data shape on chain `10143`
- WHEN W5 evaluates it
- THEN it is allowed (subject to policy + LLM) and audited

#### Scenario: Unmapped typed data blocks

- GIVEN a `sign_typed_data` call whose domain/chain/verifyingContract/primaryType is not mapped
- WHEN W5 evaluates it
- THEN it blocks

### Requirement: Opaque Signatures Block

Any signature request whose contents cannot be decoded/inspected MUST block before the upstream.

#### Scenario: Opaque signature blocked

- GIVEN a signature request that is opaque or cannot be decoded
- WHEN W5 evaluates it
- THEN it blocks

### Requirement: Wrong Chain In Domain Blocks

A typed-data domain whose `chainId` is not `10143` MUST block.

#### Scenario: Wrong chain domain blocks

- GIVEN typed data whose domain `chainId` is not `10143`
- WHEN W5 evaluates it
- THEN it blocks
