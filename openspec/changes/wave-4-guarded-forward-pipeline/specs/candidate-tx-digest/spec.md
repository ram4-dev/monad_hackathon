# Candidate Transaction Digest Specification

## Purpose

Define the canonical `candidate_tx_digest` that W4 builds before forwarding any transaction, signature, or broadcast, so the reviewed payload matches what is executed (constitution §8).

## Requirements

### Requirement: Canonical Digest Coverage

For any call that can produce a transaction, signature, or broadcast, W4 MUST build a canonical `candidate_tx_digest` covering at least: `chain_id`, account/`from`, `to`/target, `value`, `data`, tool name, normalized arguments, token/spender/amount when applicable, and the gas/fee fields that could change the effect or approved cost.

#### Scenario: Digest is built for a write

- GIVEN a write/signature/approval call that passed earlier stages
- WHEN W4 prepares to forward
- THEN it computes a `candidate_tx_digest` over the canonical field set
- AND records it in the `GuardedForwardRecord`

#### Scenario: Read-only call needs no digest

- GIVEN a read-only call
- WHEN W4 processes it
- THEN no `candidate_tx_digest` is required

### Requirement: Digest Determinism

The digest MUST be deterministic for the same canonical inputs (stable argument normalization and field ordering).

#### Scenario: Same inputs yield same digest

- GIVEN two calls with identical canonical inputs
- WHEN the digest is computed for each
- THEN both digests are equal

### Requirement: Digest Mismatch Blocks

If the payload to be executed does not match the reviewed digest, W4 MUST block or force re-simulation/re-evaluation before forwarding.

#### Scenario: Mismatch forces re-evaluation

- GIVEN a reviewed digest and a divergent execution payload
- WHEN W4 detects the mismatch
- THEN it blocks with `DIGEST_MISMATCH` or re-runs simulation/evaluation
