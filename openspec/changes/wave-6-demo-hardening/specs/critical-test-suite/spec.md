# Critical Test Suite Specification

## Purpose

Define the critical tests that must pass for release readiness, covering the security-relevant behavior of W2–W5, including fail-closed and per-user isolation, not just happy paths.

## Requirements

### Requirement: Security-Critical Coverage

The suite MUST include tests for: registry filtering + schema drift; on-chain policy read with freshness and fail-closed; blocked calls never reaching the upstream; `candidate_tx_digest` and digest mismatch; idempotency (no double execution); audit redaction; per-user isolation; the LLM veto and its fail-closed behavior; and allowance rules (unlimited blocks / finite exact-match).

#### Scenario: Suite covers the critical behaviors

- GIVEN the critical test suite
- WHEN it is reviewed
- THEN it contains tests for each listed behavior

### Requirement: Fail-Closed Is Tested

The suite MUST assert that unresolved/unreadable policy, failed/absent simulation, and unavailable LLM all result in `block`.

#### Scenario: Fail-closed asserted

- GIVEN fail-closed conditions
- WHEN the corresponding tests run
- THEN each asserts a `block` outcome with no upstream call

### Requirement: Per-User Isolation Is Tested

The suite MUST assert that one user's policy never governs another user's call.

#### Scenario: Isolation asserted

- GIVEN two users with different policies
- WHEN the isolation test runs
- THEN it asserts each call is governed only by its own user's policy

### Requirement: Suite Passes In CI-Like Run

The suite MUST pass via `npm test` (`node --test`) in `packages/coding-agent`.

#### Scenario: Green suite

- GIVEN the repository at release readiness
- WHEN `npm test` runs in `packages/coding-agent`
- THEN the suite succeeds
