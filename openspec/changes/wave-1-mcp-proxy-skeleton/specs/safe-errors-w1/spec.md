# Safe Errors (W1) Specification

## Purpose

Define the W1 subset of the Compass `SafeError` model (constitution §8) and the rule that no secret or raw upstream output is ever exposed through errors.

## Requirements

### Requirement: W1 Safe Error Codes

Compass MUST return errors as a `SafeError` with a stable `error_code`. W1 may emit `UNMAPPED_TOOL`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_ERROR`, `MISSING_REQUIRED_EVIDENCE`, `POLICY_BLOCKED`, and `INTERNAL_ERROR`.

#### Scenario: Each W1 error path maps to a stable code

- GIVEN a terminal error condition reachable in W1
- WHEN Compass produces the error
- THEN it carries one of the W1 `error_code` values
- AND it includes a human-readable `safe_message`

### Requirement: Reserved Codes Not Emitted In W1

The `SafeError` type MAY define codes reserved for later waves (`UNSUPPORTED_CHAIN`, `DIGEST_MISMATCH`, `SIMULATION_FAILED`, `SIMULATION_UNAVAILABLE`, `BROADCAST_FAILED`), but W1 code paths MUST NOT emit them.

#### Scenario: Reserved code is not produced by W1

- GIVEN a W1 execution path
- WHEN any error is produced
- THEN the error code is not one of the reserved W3/W4 codes

### Requirement: No Secret Or Raw Upstream Leakage

A `SafeError` MUST NOT contain secrets, private keys, tokens, env values, raw upstream payloads, raw stderr, or stack traces. Only a sanitized `safe_message` and optional sanitized `debug_ref` are allowed.

#### Scenario: Upstream error is sanitized

- GIVEN the upstream returns an error with sensitive or verbose content
- WHEN Compass converts it to a `SafeError`
- THEN the raw upstream content is removed
- AND only a safe message and optional sanitized reference remain

#### Scenario: Unexpected internal failure

- GIVEN an unexpected exception in Compass
- WHEN it is surfaced
- THEN it becomes an `INTERNAL_ERROR` `SafeError` with no stack trace or secret content
