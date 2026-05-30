# MCP Proxy Server Specification

## Purpose

Define how Compass exposes an MCP server to the host (Claude Code / Claude Desktop / Codex / Cursor) over stdio in W1, including the deliberately empty `tools/list` and the request routing for `tools/call`.

## Requirements

### Requirement: Host-Facing MCP Server Over Stdio

Compass MUST run as an MCP server over stdio that the host connects to, started from the `compass-proxy` entrypoint with `--upstream`, `--chain`, and `--policy` inputs (or the equivalent `COMPASS_*` env vars).

#### Scenario: Host connects to Compass

- GIVEN a host MCP configuration that launches `compass-proxy` over stdio
- WHEN the host initializes the MCP connection
- THEN Compass completes the MCP handshake as a server
- AND the host is connected to Compass, not to the Wallet Agent upstream

#### Scenario: Unsupported upstream transport requested

- GIVEN `COMPASS_UPSTREAM_TRANSPORT` is set to a value other than `stdio`
- WHEN `compass-proxy` starts
- THEN startup surfaces a safe `UPSTREAM_UNAVAILABLE` error
- AND no host-visible secret or raw value is leaked

### Requirement: Empty Tools List Before Registry

In W1 the host-facing `tools/list` MUST return an empty list, because the W2 semantics registry does not exist yet and no upstream tool may be advertised before registry filtering.

#### Scenario: Host lists tools in W1

- GIVEN Compass is connected to an upstream (mock or real)
- WHEN the host calls `tools/list`
- THEN Compass returns an empty tool list
- AND Compass still fetched the upstream `tools/list` internally to populate `compass_status`

#### Scenario: No upstream tool is advertised

- GIVEN the upstream exposes many tools
- WHEN the host inspects the advertised tools
- THEN no upstream tool name appears in the host-facing `tools/list`

### Requirement: Tool Call Routing

Compass MUST route every host `tools/call` through the W1 interceptor: Compass meta-tools are handled locally, provisional read-only tools are forwarded, and all other tools are blocked.

#### Scenario: Call is routed to the interceptor

- GIVEN the host issues a `tools/call`
- WHEN Compass receives the call
- THEN the call is dispatched through the `callInterceptor` pipeline
- AND a sanitized audit event records that the call was received

### Requirement: Server Lifecycle Isolation

When the host disconnects or the proxy receives a termination signal, Compass MUST shut down the upstream gracefully without leaking secrets or raw upstream output.

#### Scenario: Host disconnects

- GIVEN an active host MCP connection and a connected upstream
- WHEN the host disconnects
- THEN Compass triggers a graceful upstream shutdown
- AND no raw upstream stderr or secret value is emitted to logs or the host
