# Call Interceptor Pipeline Specification

## Purpose

Define the ordered `tools/call` gate that decides whether a host call is forwarded to the Wallet Agent upstream, and the required-field validation that feeds it. This is the W4 realization of the W1 `callInterceptor` skeleton.

## Requirements

### Requirement: Deterministic Stage Ordering

The interceptor MUST evaluate every `tools/call` in this order and MUST stop at the first failing stage with a block: `registry semantics → required-field/evidence validation → simulation/inspection (for write/signature/approval classes) → risk checks → on-chain policy evaluation → deterministic allow/block`.

#### Scenario: Order is enforced

- GIVEN a `tools/call` for a registered tool
- WHEN the interceptor processes it
- THEN each stage runs in the defined order
- AND the first stage that fails produces a `block` without running later stages

#### Scenario: A failing early stage blocks before policy

- GIVEN a call with missing required evidence
- WHEN the interceptor validates it
- THEN it blocks with `MISSING_REQUIRED_EVIDENCE` before any on-chain policy read or forward

### Requirement: Required-Field Validation From Registry

The interceptor MUST validate the call's required fields and required evidence as declared by the W2 `ToolSemantics` for that tool, before simulation or policy.

#### Scenario: Missing required field

- GIVEN a tool whose `ToolSemantics.required_fields` is not satisfied by the call arguments
- WHEN the interceptor validates the request
- THEN it blocks with a safe error and does not forward

### Requirement: Deterministic Floor Is Authoritative

The deterministic stages MUST be the authoritative security decision. The later LLM safety review MUST only be reachable after a deterministic `allow`.

#### Scenario: LLM never runs on a deterministic block

- GIVEN a call that the deterministic stages block
- WHEN the interceptor finishes
- THEN the LLM final safety review is not invoked
- AND the call is blocked

### Requirement: Single Terminal Decision

Every `tools/call` MUST end in exactly one terminal outcome — meta (handled elsewhere), forward, or block — and MUST write a sanitized audit event for that outcome.

#### Scenario: Terminal outcome is audited

- GIVEN any processed `tools/call`
- WHEN it reaches a terminal outcome
- THEN exactly one of forward/block is recorded
- AND a sanitized audit event captures it
