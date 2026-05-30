# Reproducible Demo Specification

## Purpose

Ensure the Compass demo runs from a clean machine using only Compass in the host MCP config, with the per-user policy living on-chain.

## Requirements

### Requirement: Clean-Machine Reproducibility

The demo MUST run from a fresh checkout with documented setup steps and only Compass configured in the host MCP config.

#### Scenario: Fresh machine runs the demo

- GIVEN a clean machine with the documented prerequisites
- WHEN the operator follows the setup
- THEN the demo runs without undocumented manual steps

### Requirement: Compass-Only Host Configuration

The host MCP configuration used by the demo MUST contain only Compass; Wallet Agent MUST NOT be configured directly.

#### Scenario: Host config has no direct upstream

- GIVEN the demo host MCP config
- WHEN it is inspected
- THEN it contains only a Compass entry and no Wallet Agent entry

### Requirement: No Secrets In Demo Artifacts

Demo config and scripts MUST NOT contain secrets; RPC URLs with credentials, keys, and tokens MUST come from environment and never be committed.

#### Scenario: Demo artifacts are secret-free

- GIVEN the committed demo artifacts
- WHEN they are inspected
- THEN they contain no secrets
