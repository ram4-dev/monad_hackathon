# Safe Errors (W4) Specification

## Purpose

Define the W4 extensions to the `SafeError` model (constitution §8) for the new failure modes introduced by on-chain policy resolution, simulation, digest, and the LLM safety layer — with no leakage.

## Requirements

### Requirement: W4 Safe Error Codes

W4 MAY emit these `SafeError` codes in addition to the W1 set: `USER_POLICY_UNRESOLVED`, `POLICY_CONTRACT_UNAVAILABLE`, `DIGEST_MISMATCH`, `SIMULATION_FAILED`, `SIMULATION_UNAVAILABLE`, `LLM_SAFETY_BLOCKED`, `LLM_SAFETY_UNAVAILABLE`, plus the existing `POLICY_BLOCKED`, `MISSING_REQUIRED_EVIDENCE`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_ERROR`, `INTERNAL_ERROR`.

#### Scenario: Each W4 failure maps to a stable code

- GIVEN a W4 failure condition (policy unresolved, contract unavailable, digest mismatch, simulation failed/unavailable, LLM block/unavailable)
- WHEN W4 surfaces it
- THEN it carries the corresponding stable `error_code` and a safe message

### Requirement: No Leakage In Errors

A `SafeError` MUST NOT contain secrets, private keys, tokens, raw upstream payloads, raw RPC errors, raw LLM I/O, or stack traces. Only a sanitized `safe_message` and optional sanitized `debug_ref` are allowed.

#### Scenario: Policy/LLM/RPC errors are sanitized

- GIVEN a failure whose underlying detail is sensitive or verbose
- WHEN W4 converts it to a `SafeError`
- THEN the underlying detail is removed and only safe fields remain

### Requirement: Fail-Closed Codes Map To Block

`USER_POLICY_UNRESOLVED`, `POLICY_CONTRACT_UNAVAILABLE`, `SIMULATION_UNAVAILABLE`, `SIMULATION_FAILED`, `LLM_SAFETY_UNAVAILABLE`, and `LLM_SAFETY_BLOCKED` MUST all correspond to a `block` outcome (no forward).

#### Scenario: Fail-closed code never forwards

- GIVEN any of the fail-closed codes is produced
- WHEN the decision is finalized
- THEN the outcome is `block` and no upstream `tools/call` is issued
