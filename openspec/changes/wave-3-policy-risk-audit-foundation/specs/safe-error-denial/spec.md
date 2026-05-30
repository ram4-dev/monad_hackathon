# Safe Error and Denial Specification

## Purpose

Define safe-denial behavior for W3 on-chain policy evaluation so failures are actionable but never leak sensitive payloads.

## Requirements

### Requirement: SafeError Codes Include Policy-Source Failures

Safe denial codes SHALL include policy-source failure categories: invalid policy binding, RPC read failure, ABI decode failure, policy schema invalid, unsupported policy version, stale/dead policy contract address, and unauthorized policy update evidence.

#### Scenario: Policy-source read failure is sanitized
- GIVEN policy read fails at RPC or ABI layer
- WHEN denial is returned
- THEN safe output SHALL include stable policy-source failure code
- AND SHALL NOT include raw provider payload or stack trace

### Requirement: Denial Sanitization Boundary

Safe denials SHALL exclude secrets, private keys, keystore contents, raw RPC traces, raw request dumps, and unredacted tool arguments.

#### Scenario: Raw RPC error is redacted
- GIVEN provider error contains sensitive or verbose internals
- WHEN Wave 3 normalizes denial
- THEN output SHALL include only allowlisted safe fields

### Requirement: Deterministic Fail-Closed Denials

Equivalent policy-source failures SHALL map to deterministic safe denial codes and always produce `block`.

#### Scenario: Same ABI decode failure yields same code
- GIVEN repeated ABI decode failures for policy fetch
- WHEN denials are generated
- THEN same safe code SHALL be returned consistently
- AND decision SHALL be `block`

### Requirement: W2 Pre-Policy Denials Are Preserved

W3 SHALL preserve W2 safe pre-policy block statuses and SHALL NOT reclassify them.

#### Scenario: Unmapped tool remains blocked
- GIVEN W2 returns unmapped/unsupported pre-policy block
- WHEN W3 evaluates
- THEN W3 SHALL return safe blocked denial
- AND SHALL NOT use policy allowlist to rescue the tool
