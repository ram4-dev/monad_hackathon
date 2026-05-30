# LLM Final Safety Review Specification

## Purpose

Define the final safety layer: after all deterministic checks pass, an LLM receives the full sanitized context of the action and decides whether it is safe to forward the transaction/execution. This is **defense-in-depth, veto-only**: it can only further block, never approve something the deterministic floor blocked. It is fail-closed.

> Divergence note: `docs/development-waves.md` "Explicitly out of P0" and `docs/constitution.md` currently list "LLM as security authority" as out of P0. This capability adds the LLM as an additional veto over the deterministic decision (not as the sole authority) and requires a constitution amendment / ADR, tracked separately.

## Requirements

### Requirement: Runs Only After A Deterministic Allow

The LLM final safety review MUST run only after the deterministic stages (registry → evidence → simulation → risk → on-chain policy) have produced an `allow`. It MUST NOT run on a deterministic `block`.

#### Scenario: Not invoked on deterministic block

- GIVEN a call blocked by any deterministic stage
- WHEN the interceptor finishes
- THEN the LLM review is never invoked

#### Scenario: Invoked on deterministic allow

- GIVEN a call the deterministic stages allow
- WHEN the interceptor continues
- THEN the LLM final safety review is invoked before the forward

### Requirement: Veto-Only Authority

The LLM review MUST be able to change a deterministic `allow` into a `block`, and MUST NEVER change a deterministic `block` into an `allow`.

#### Scenario: LLM can block an allowed call

- GIVEN a deterministic `allow`
- WHEN the LLM returns `unsafe`
- THEN the call is blocked with `LLM_SAFETY_BLOCKED` and not forwarded

#### Scenario: LLM cannot widen a block

- GIVEN a deterministic `block`
- WHEN any LLM verdict exists or is bypassed
- THEN the outcome remains `block`

### Requirement: Sanitized Context Input

The LLM MUST receive only sanitized context: tool name + registry semantics, normalized arguments, `candidate_tx_digest`, a simulation result summary, and the on-chain policy snapshot summary. Secrets, private keys, seeds, tokens, and raw payloads MUST NOT be sent to the LLM.

#### Scenario: No secrets reach the LLM

- GIVEN the context assembled for review
- WHEN it is sent to the LLM
- THEN it contains no private keys, seeds, tokens, or raw sensitive payloads

#### Scenario: Sanitization cannot be guaranteed

- GIVEN context that cannot be sanitized with confidence
- WHEN W4 prepares the review
- THEN it does not send to the LLM and blocks (fail-closed)

### Requirement: Structured Verdict

The LLM MUST return a structured verdict `{ verdict: "safe" | "unsafe", reason: string }`. Only an explicit `safe` allows the forward to proceed.

#### Scenario: Explicit safe proceeds

- GIVEN a well-formed `safe` verdict
- WHEN W4 evaluates it
- THEN the forward proceeds to the next step

#### Scenario: Ambiguous or malformed verdict blocks

- GIVEN a verdict that is `unsafe`, malformed, empty, or unparseable
- WHEN W4 evaluates it
- THEN the call is blocked

### Requirement: Fail-Closed On Unavailability

If the LLM is unavailable, errors, or times out, W4 MUST block with `LLM_SAFETY_UNAVAILABLE`.

#### Scenario: LLM unavailable blocks

- GIVEN the LLM provider is unreachable or times out
- WHEN W4 runs the review
- THEN it blocks with `LLM_SAFETY_UNAVAILABLE` and does not forward

### Requirement: Verdict Is Audited (Redacted)

W4 MUST record that the LLM review ran and its verdict in the `GuardedForwardRecord`/audit, with a redacted reason; raw LLM input/output MUST NOT be persisted.

#### Scenario: Verdict recorded without raw I/O

- GIVEN a completed LLM review
- WHEN the decision is audited
- THEN `llm_review` records ran=true and the verdict with a redacted reason
- AND no raw LLM prompt or completion is persisted
