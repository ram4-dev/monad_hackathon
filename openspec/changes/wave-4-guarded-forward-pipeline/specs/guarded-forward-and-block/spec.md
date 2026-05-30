# Guarded Forward and Block Specification

## Purpose

Define the forward and block terminal paths: an allowed call forwards exactly one upstream `tools/call`; a blocked call never contacts the upstream and returns a safe explanation.

## Requirements

### Requirement: Forward Exactly Once After Full Pass

W4 MUST forward the original `tools/call` to the Wallet Agent upstream exactly once, and only after the deterministic stages allow AND the LLM final safety review allows.

#### Scenario: Allowed call forwards once

- GIVEN a call that passed deterministic stages and the LLM review
- WHEN W4 forwards it
- THEN exactly one upstream `tools/call` is issued with the reviewed payload

#### Scenario: Forward uses the reviewed payload

- GIVEN a built `candidate_tx_digest`
- WHEN W4 forwards
- THEN the forwarded payload matches the reviewed digest

### Requirement: Block Never Contacts Upstream

W4 MUST NOT issue any upstream `tools/call` for a blocked decision, at any stage (evidence, simulation, risk, policy, or LLM).

#### Scenario: Blocked call proven not to reach upstream

- GIVEN a call blocked at any stage
- WHEN W4 finishes
- THEN no upstream `tools/call` was issued
- AND a safe explanation is returned to the host

### Requirement: Safe Explanation On Block

A blocked decision MUST return a `SafeError` with a stable code and a sanitized message, without leaking internal or upstream detail.

#### Scenario: Block returns a safe error

- GIVEN a blocked call
- WHEN the host receives the result
- THEN it contains a `SafeError` with a code and safe message and no sensitive content
