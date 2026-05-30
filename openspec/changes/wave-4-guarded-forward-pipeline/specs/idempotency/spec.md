# Idempotency Specification

## Purpose

Define the idempotency guarantee for any broadcast/execution tool so a retry cannot produce a second on-chain effect (constitution invariant 19, §12 PoC step 13).

## Requirements

### Requirement: Idempotency Key For Broadcast/Execution

W4 MUST attach a deterministic `idempotency_key` to any broadcast/execution `tools/call` and MUST record it in the `GuardedForwardRecord`.

#### Scenario: Execution call gets an idempotency key

- GIVEN a broadcast/execution call that passed all gates
- WHEN W4 prepares the forward
- THEN it derives an `idempotency_key` and records it

### Requirement: No Double Execution

A retry with the same `idempotency_key` MUST NOT produce a second execution; W4 MUST reuse the stored result instead of forwarding again.

#### Scenario: Retry reuses the stored result

- GIVEN a call already executed under an `idempotency_key`
- WHEN the same `idempotency_key` is seen again
- THEN W4 returns the stored result and does not issue a second upstream `tools/call`

#### Scenario: Distinct intents get distinct keys

- GIVEN two calls with materially different canonical inputs
- WHEN keys are derived
- THEN the keys differ and both may execute once each

### Requirement: Idempotency Store Safety

The idempotency store MUST NOT persist secrets or raw sensitive payloads; it stores only what is needed to detect a repeat and reuse a sanitized result.

#### Scenario: Store contains no secrets

- GIVEN an executed call recorded in the idempotency store
- WHEN the store entry is inspected
- THEN it contains no private keys, tokens, or raw sensitive payloads
