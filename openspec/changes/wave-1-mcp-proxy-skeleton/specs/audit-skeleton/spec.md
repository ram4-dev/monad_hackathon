# Audit Skeleton Specification

## Purpose

Define the W1 append-only technical audit: a local JSONL writer emitting a subset of the constitution `AuditEvent` actions with a redaction allowlist. This is the foundation W4 extends with policy/digest/idempotency fields.

## Requirements

### Requirement: Append-Only Local Audit Log

Compass MUST write audit events to an append-only JSONL file at `COMPASS_AUDIT_PATH` (default `./.compass/audit.jsonl`) and MUST NOT rewrite or truncate prior events.

#### Scenario: Events are appended

- GIVEN audit is enabled
- WHEN Compass records multiple events during a session
- THEN each event is appended as a single JSON line
- AND earlier events remain unchanged

### Requirement: W1 Audit Action Subset

Compass MUST emit at least these audit actions in W1: `proxy_started`, `upstream_connected`, `upstream_unavailable`, `tools_list_served`, `tool_call_received`, `tool_call_forwarded`, `tool_call_blocked`, `upstream_error`.

#### Scenario: Forward path is audited

- GIVEN an allowlisted read-only call is forwarded
- WHEN the call completes
- THEN a `tool_call_forwarded` event is recorded with non-secret metadata

#### Scenario: Block path is audited

- GIVEN a non-allowlisted tool call is blocked
- WHEN the block decision is made
- THEN a `tool_call_blocked` event is recorded with the safe error code

### Requirement: Redaction Allowlist

Each audit event's `metadata` MUST be governed by a redaction allowlist; the writer MUST NOT persist private keys, tokens, env values, raw upstream payloads, raw stderr, or stack traces.

#### Scenario: Sensitive content is excluded

- GIVEN an event whose source data contains sensitive-looking content
- WHEN the event is written
- THEN only allowlisted, non-secret fields are persisted
- AND the redaction does not disclose the original sensitive value

### Requirement: Event Correlation

Each audit event MUST carry a unique `event_id` and timestamp, and tool-call events SHOULD carry a correlation reference so a received call and its forward/block outcome can be linked.

#### Scenario: Call and outcome are correlated

- GIVEN a `tool_call_received` event and its `tool_call_forwarded` or `tool_call_blocked` outcome
- WHEN the audit log is reviewed
- THEN the two events can be correlated for the same call
