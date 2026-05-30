# No-Bypass Proof Specification

## Purpose

Provide evidence that the demo host uses Compass only and never the Wallet Agent directly, closing `W0-BLOCKER-007`.

## Requirements

### Requirement: Compass-Only Host Evidence

W6 MUST include a sanitized host MCP configuration and tool listing showing that only Compass is configured and that no direct Wallet Agent entry exists.

#### Scenario: Evidence shows Compass only

- GIVEN the no-bypass evidence
- WHEN reviewed
- THEN it shows only a Compass MCP entry and no direct Wallet Agent entry

### Requirement: Internal Upstream Attestation

`compass_status` MUST attest that the upstream is managed internally by Compass, and the proof MUST reference this attestation.

#### Scenario: Status attests internal management

- GIVEN the running demo
- WHEN `compass_status` is queried
- THEN it reports the upstream as managed by Compass with no host-direct connection

### Requirement: Closes W0-BLOCKER-007

The proof MUST explicitly reference and close `W0-BLOCKER-007`, or record any residual gap.

#### Scenario: Blocker closed

- GIVEN the no-bypass proof
- WHEN reviewed against `W0-BLOCKER-007`
- THEN the blocker is marked closed or any residual gap is recorded
