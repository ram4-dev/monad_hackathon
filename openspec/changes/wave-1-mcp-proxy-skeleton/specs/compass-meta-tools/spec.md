# Compass Meta-Tools Specification

## Purpose

Define the two Compass-owned meta-tools handled locally in W1: `compass_status` and `compass_audit_events`. They use the `compass_` prefix per constitution §3.2 and are never forwarded upstream.

## Requirements

### Requirement: Canonical Meta-Tool Names

Compass meta-tools MUST use the `compass_` prefix and the canonical names `compass_status` and `compass_audit_events`, not legacy alternatives such as `get_audit_events`.

#### Scenario: Meta-tool names are reviewed

- GIVEN the W1 meta-tools
- WHEN their names are inspected
- THEN they are exactly `compass_status` and `compass_audit_events`

### Requirement: compass_status Reports Proxy And Upstream State

`compass_status` MUST return in-memory proxy state: transport, configured chain label, upstream connection state, upstream `serverInfo`, internal upstream tool count, host-exposed tool count (0 in W1), and audit path — without leaking secrets.

#### Scenario: Status with a connected upstream

- GIVEN Compass is connected to an upstream
- WHEN the host calls `compass_status`
- THEN the response includes upstream connected = true, the upstream tool count, exposed tool count = 0, transport = stdio, and the chain config label
- AND no secret value or raw command string with secrets is included

#### Scenario: Status with an unavailable upstream

- GIVEN the upstream failed to connect
- WHEN the host calls `compass_status`
- THEN the response reports upstream connected = false and a safe reason
- AND the proxy still answers the meta-tool

### Requirement: compass_audit_events Returns Redacted Events

`compass_audit_events` MUST return a tail of the append-only audit log with already-redacted events and MUST NOT expose secrets or raw upstream payloads.

#### Scenario: Audit events are returned

- GIVEN audit events were written during the session
- WHEN the host calls `compass_audit_events`
- THEN Compass returns the most recent events from the audit log
- AND every returned event is redacted per the audit allowlist

### Requirement: Meta-Tools Are Never Forwarded

Compass MUST handle meta-tools locally and MUST NOT forward them to the upstream.

#### Scenario: Meta-tool is handled locally

- GIVEN a `tools/call` for `compass_status` or `compass_audit_events`
- WHEN Compass processes it
- THEN the response is produced locally
- AND no upstream `tools/call` is issued for it
