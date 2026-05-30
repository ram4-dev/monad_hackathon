# Upstream Blocker Register Specification

## Purpose

Define the W0 register required to make upstream, Monad RPC, schema, safety, and no-bypass blockers visible before implementation waves depend on unresolved assumptions.

## Requirements

### Requirement: Blocker Register Completeness

The W0 blocker register MUST include missing upstream payloads, unsupported P0 tools, schema instability, RPC failures, simulation or dry-run insufficiency, consent-gated skips, host no-bypass uncertainty, and ADR candidates discovered during W0.

#### Scenario: A required W0 evidence item is missing

- GIVEN a W0 domain cannot produce required evidence
- WHEN W0 artifacts are finalized
- THEN the blocker register includes the missing evidence item and its observed cause or safe unknown

### Requirement: Dependency Impact Classification

Each blocker entry MUST identify impacted downstream waves or capabilities, expected severity, current status, and the next decision or validation needed.

#### Scenario: Simulation is unavailable

- GIVEN Wallet Agent simulation is unavailable or insufficient
- WHEN the blocker is recorded
- THEN the entry identifies impact on W4 guarded forwarding and W5 Monad action coverage
- AND it states whether a Compass fallback, ADR, or upstream change is needed

### Requirement: Missing Evidence Prevents Silent Success

W0 MUST NOT be reported as fully successful when required evidence is missing unless the blocker register explicitly records the gap and downstream impact.

#### Scenario: W0 success criteria are reviewed

- GIVEN a success criterion lacks supporting evidence
- WHEN the W0 result is summarized
- THEN the summary either points to evidence satisfying the criterion or to a blocker entry explaining why it remains unresolved

### Requirement: ADR Candidate Capture

The blocker register MUST mark decisions requiring architecture or scope changes as ADR candidates before W2, W4, or W5 implements behavior based on them.

#### Scenario: Wallet Agent lacks inspectable write payloads

- GIVEN Wallet Agent does not expose enough payload detail for Compass inspection, digest, or policy
- WHEN W0 evaluates downstream impact
- THEN the blocker register marks the issue as an ADR candidate or hard blocker before guarded forwarding depends on it

### Requirement: Secret-Safe Blocker Entries

Blocker entries MUST NOT contain `.env` contents, private keys, tokens, credentials, delegated payloads, seed phrases, secret-manager output, or raw sensitive logs.

#### Scenario: A blocker is caused by an authentication or provider issue

- GIVEN the root cause may involve a credential, token, or secret provider setting
- WHEN the blocker is recorded
- THEN the entry describes the issue using sanitized labels or safe error categories
- AND it does not persist the secret value or secret-bearing output
