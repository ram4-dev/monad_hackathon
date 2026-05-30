# User Policy Contract Lifecycle Specification

## Purpose

Cover the lifecycle of the user's on-chain policy contract: reading it (consumed by every guarded action), and deploying/registering/updating it as a guarded on-chain action. The contract shape and user-identity scheme are owned by W3; this spec consumes them through an abstract interface.

## Requirements

### Requirement: Policy Read Consumed By All Actions

Every guarded action MUST evaluate against the user's on-chain policy as read by W4; W5 MUST NOT introduce a local-file policy path.

#### Scenario: Action uses on-chain policy

- GIVEN any guarded action for a user
- WHEN W5 evaluates it
- THEN the decision uses that user's on-chain policy snapshot

### Requirement: Policy Contract Update Is A Guarded Action

Deploying, registering, or updating a user's policy contract MUST itself pass the W4 guard chain (evidence, simulation, `candidate_tx_digest`, on-chain policy/authorization, idempotency, LLM veto) and be audited.

#### Scenario: Policy update is guarded

- GIVEN a request to update the user's policy contract
- WHEN W5 evaluates it
- THEN it passes the guard chain and is audited as an on-chain action
- AND it is idempotent

### Requirement: Owner-Only Policy Modification

A user's policy contract MUST be modifiable only by that user (policy-over-policy). A request to modify another user's policy MUST block.

#### Scenario: Cross-user policy modification blocked

- GIVEN user B requesting to modify user A's policy contract
- WHEN W5 evaluates it
- THEN it blocks

#### Scenario: Owner updates own policy

- GIVEN a user updating their own policy within authorization
- WHEN W5 evaluates it
- THEN it is allowed through the guard chain and audited

### Requirement: Bootstrap Is Explicit And Audited

Creating a user's first policy contract MUST be an explicit, guarded, audited action; until a policy exists, guarded actions for that user are fail-closed (blocked).

#### Scenario: No policy yet blocks actions

- GIVEN a user without a deployed policy contract
- WHEN a guarded action is attempted
- THEN it blocks (fail-closed) until the policy is bootstrapped

### Requirement: Update Audit Records Version Change

A policy update MUST record a sanitized before/after policy version snapshot in the audit.

#### Scenario: Version change recorded

- GIVEN a successful policy update
- WHEN it is audited
- THEN the audit records the prior and new policy version/block (sanitized)
