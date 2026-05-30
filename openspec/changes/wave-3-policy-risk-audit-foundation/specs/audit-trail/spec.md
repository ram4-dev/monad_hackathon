# Audit Trail Specification

## Purpose

Define append-only, redacted audit behavior for Wave 3 policy/risk/safe-denial outcomes, including on-chain policy source reads and policy update correlation.

## Requirements

### Requirement: Append-Only Audit Writer

The system SHALL append audit events without modifying previous events.

#### Scenario: Decision events append in order
- GIVEN existing audit events
- WHEN Wave 3 records new policy/risk/denial outcomes
- THEN new events SHALL append in write order

### Requirement: Policy Source Metadata Allowlists

Audit metadata SHALL include only allowlisted policy-source fields (e.g., chain id, policy contract address, policy id/version, read status, reason codes).

#### Scenario: On-chain read metadata is safe
- GIVEN a policy read event
- WHEN metadata is persisted
- THEN audit MAY include safe source identifiers and status
- AND SHALL NOT include raw RPC payloads, full ABI blobs, secrets, or stack traces

### Requirement: Policy Update Event Correlation

Audit SHALL support correlating policy update events (owner-managed version bumps) with decision-time policy version.

#### Scenario: Decision records version provenance
- GIVEN a decision evaluated under policy version N
- WHEN event is written
- THEN audit SHALL include policy id/version and contract address
- AND support tracing to latest known update event reference when available

### Requirement: Redaction Before Persistence

Audit SHALL redact secrets and sensitive content before persistence.

#### Scenario: Sensitive values are removed
- GIVEN metadata includes secret-like material
- WHEN audit writer persists event
- THEN sensitive values SHALL be omitted/redacted

### Requirement: Fail-Closed Read Errors Are Audited Safely

Policy read/validation failures SHALL be audited as safe blocked outcomes.

#### Scenario: RPC/ABI/schema failure is recorded
- GIVEN policy read fails
- WHEN decision blocks
- THEN audit SHALL record safe failure category and block result
- AND SHALL NOT persist raw provider error dumps
