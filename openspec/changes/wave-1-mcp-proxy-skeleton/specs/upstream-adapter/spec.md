# Upstream Adapter Specification

## Purpose

Define how Compass acts as an MCP client toward the Wallet Agent upstream over stdio in W1: process start, npm registry override, MCP handshake, `tools/list`/`tools/call`, timeouts, stderr handling, and graceful shutdown.

## Requirements

### Requirement: Stdio Upstream Process Start

Compass MUST start the upstream MCP process from the configured command (`--upstream` or `COMPASS_UPSTREAM_CMD`, default `bunx wallet-agent@latest`) over stdio, and MUST treat any non-`stdio` transport as unsupported in W1.

#### Scenario: Upstream starts over stdio

- GIVEN a valid upstream command and `COMPASS_UPSTREAM_TRANSPORT=stdio`
- WHEN Compass starts the upstream
- THEN the upstream process is spawned with stdio pipes
- AND Compass connects as an MCP client over those pipes

#### Scenario: Upstream command cannot start

- GIVEN the upstream command fails to spawn or exits immediately
- WHEN Compass attempts to connect
- THEN Compass surfaces a safe `UPSTREAM_UNAVAILABLE` error
- AND the proxy stays alive to serve Compass meta-tools

### Requirement: Public Registry Override

Compass MUST inject `npm_config_registry=https://registry.npmjs.org/` into the upstream process environment when it is not already set, so the upstream resolves from the public registry, addressing `W0-BLOCKER-001`.

#### Scenario: Registry override is applied

- GIVEN the host environment does not set `npm_config_registry`
- WHEN Compass starts `bunx wallet-agent@latest`
- THEN the upstream child environment includes `npm_config_registry=https://registry.npmjs.org/`
- AND no secret-bearing environment variable is forwarded verbatim outside an explicit allowlist

### Requirement: MCP Handshake And Tool Inventory

Compass MUST complete the MCP handshake (`initialize` then `notifications/initialized`) and fetch the upstream `tools/list`, caching the inventory and the upstream `serverInfo` for `compass_status`.

#### Scenario: Handshake and inventory succeed

- GIVEN the upstream process started over stdio
- WHEN Compass performs the MCP handshake
- THEN Compass records the upstream `serverInfo` name and version
- AND Compass caches the upstream tool inventory count for `compass_status`

#### Scenario: Handshake exceeds the connect timeout

- GIVEN the upstream does not complete the handshake within the connect timeout
- WHEN the timeout elapses
- THEN Compass surfaces a safe `UPSTREAM_UNAVAILABLE` error

### Requirement: Guarded Upstream Call Forwarding

Compass MUST forward an upstream `tools/call` only when the interceptor allows it, MUST apply a per-call timeout, and MUST return a near-transparent upstream response for allowed calls.

#### Scenario: Allowed read-only call forwards once

- GIVEN a provisional read-only tool call passes interception
- WHEN Compass forwards it to the upstream
- THEN exactly one upstream `tools/call` is issued
- AND the upstream response is returned to the host near-transparently

#### Scenario: Upstream call times out or returns an invalid response

- GIVEN a forwarded call exceeds the per-call timeout or returns a malformed MCP response
- WHEN Compass processes the result
- THEN Compass surfaces a safe `UPSTREAM_ERROR`
- AND no raw upstream payload or stderr is exposed

### Requirement: Stderr Sanitization

Compass MUST capture upstream stderr to a bounded buffer and MUST NOT forward raw stderr to the host, audit, or logs.

#### Scenario: Upstream writes to stderr

- GIVEN the upstream emits diagnostic output on stderr
- WHEN Compass handles it
- THEN the raw stderr is never sent to the host or persisted in audit
- AND any reference kept is a sanitized `debug_ref`, not raw content

### Requirement: Graceful Shutdown

Compass MUST shut the upstream down gracefully: close child stdin, wait, send SIGTERM, and escalate to SIGKILL on timeout.

#### Scenario: Proxy shuts down the upstream

- GIVEN a connected upstream
- WHEN the proxy is asked to stop
- THEN Compass closes stdin, waits, sends SIGTERM, and escalates to SIGKILL if the process does not exit
- AND the shutdown is recorded without secret leakage
