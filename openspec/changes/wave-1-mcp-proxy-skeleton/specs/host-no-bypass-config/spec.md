# Host No-Bypass Config Specification

## Purpose

Define the W1 documentation and attestation that the host MCP configuration wires Compass only, never the Wallet Agent directly. This carries forward `W0-BLOCKER-007`; technical enforcement remains deferred to W6.

## Requirements

### Requirement: Compass-Only Host Configuration Documentation

W1 MUST document a host MCP configuration that launches Compass only, using the `compass-proxy --upstream ... --chain ... --policy ...` shape, and MUST NOT instruct adding Wallet Agent directly to the host.

#### Scenario: Host setup is reviewed

- GIVEN the W1 host configuration documentation
- WHEN a reviewer inspects it
- THEN it shows only a Compass MCP entry (for example `claude mcp add compass-wallet -- compass-proxy ...`)
- AND it explicitly warns against adding Wallet Agent directly during the demo

### Requirement: Upstream Managed Internally

Compass MUST manage the Wallet Agent upstream internally as its own MCP client, so the host never needs an upstream entry, and `compass_status` MUST attest that the upstream is internally managed.

#### Scenario: Status attests internal management

- GIVEN Compass is running with an internally managed upstream
- WHEN the host calls `compass_status`
- THEN the response indicates the upstream is managed by Compass
- AND the host has no direct upstream connection

### Requirement: No-Bypass Enforcement Deferred

W1 MUST record that technical prevention of a host operator adding Wallet Agent directly is not implemented in W1 and remains a carryover blocker for W6.

#### Scenario: Deferred enforcement is recorded

- GIVEN the W1 no-bypass documentation
- WHEN it is reviewed
- THEN it states that enforcement is operational/documented only in W1
- AND it references `W0-BLOCKER-007` as the carryover for W6
