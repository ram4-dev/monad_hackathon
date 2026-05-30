# MCP Host No-Bypass Evidence Specification

## Purpose

Define the W0 evidence required to support the P0 boundary that demo MCP hosts expose Compass only and do not expose Wallet Agent directly.

## Requirements

### Requirement: Compass-Only Host Configuration Evidence

The W0 evidence set MUST show that the intended demo host MCP configuration exposes Compass as the execution-facing MCP server and does not expose Wallet Agent directly.

#### Scenario: Host configuration is verified

- GIVEN a demo host MCP configuration is available for inspection without exposing secrets
- WHEN W0 no-bypass evidence is reviewed
- THEN the evidence identifies a Compass MCP entry
- AND it does not identify a direct Wallet Agent MCP entry

#### Scenario: Host configuration is unavailable

- GIVEN a safe host configuration cannot be inspected during W0
- WHEN W0 no-bypass evidence is finalized
- THEN the missing proof is recorded as a blocker or operational limitation

### Requirement: Direct Wallet Agent Exposure Fails No-Bypass

W0 no-bypass evidence MUST treat any direct Wallet Agent MCP entry visible to Claude Code, Claude Desktop, Codex, Cursor, or another demo host as a failed no-bypass condition.

#### Scenario: Direct Wallet Agent entry is found

- GIVEN no-bypass evidence finds Wallet Agent configured directly in the host
- WHEN the condition is classified
- THEN W0 records no-bypass as failed
- AND downstream demo readiness remains blocked until the direct entry is removed or isolated outside the demo host

### Requirement: Upstream Boundary Statement

The W0 evidence set MUST state that Wallet Agent is only an upstream candidate behind Compass and that Compass is the only intended MCP execution surface for the host.

#### Scenario: Boundary evidence is reviewed

- GIVEN W0 evidence documents the host/upstream boundary
- WHEN the evidence is read by downstream implementers
- THEN it clearly distinguishes host-facing Compass from upstream Wallet Agent
- AND it does not authorize host bypass of Compass

### Requirement: Host Tool Visibility Evidence

The W0 evidence set SHOULD include safe evidence of host-visible MCP tool surfaces when available, sufficient to show that Wallet Agent tools are not visible directly to the host.

#### Scenario: Host-visible tools can be listed safely

- GIVEN host-visible MCP tools can be listed without secrets
- WHEN no-bypass evidence is reviewed
- THEN the evidence shows Compass-visible tools or placeholders only
- AND Wallet Agent is not visible as a separate direct MCP server

### Requirement: Secret-Safe Host Evidence

Host no-bypass evidence MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, secret-manager output, or secret-bearing host configuration values.

#### Scenario: Host configuration includes environment or local paths

- GIVEN host configuration evidence contains environment variables, local paths, or command arguments
- WHEN the evidence is persisted
- THEN secret values are redacted or omitted
- AND only non-secret information necessary to prove the no-bypass boundary is retained
