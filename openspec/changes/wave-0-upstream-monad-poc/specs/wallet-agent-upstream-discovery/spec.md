# Wallet Agent Upstream Discovery Specification

## Purpose

Define the W0 evidence required to treat Wallet Agent from `https://github.com/wallet-agent/wallet-agent` as the candidate upstream MCP for Compass on Monad Testnet.

## Requirements

### Requirement: Upstream Source Evidence

The W0 evidence set MUST identify `https://github.com/wallet-agent/wallet-agent` as the Wallet Agent MCP upstream source and MUST record the safe command shape used to start it.

#### Scenario: Upstream source is reviewed

- GIVEN W0 discovery evidence is reviewed
- WHEN the reviewer checks which Wallet Agent MCP is in scope
- THEN the evidence identifies `https://github.com/wallet-agent/wallet-agent` as the upstream source
- AND records the safe command shape without secret-bearing local values

### Requirement: P0 Tool Inventory Evidence

The W0 evidence set MUST include a sanitized Wallet Agent `tools/list` inventory for every P0 candidate tool needed by future registry work, including `add_custom_chain`, `switch_chain`, `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction` and/or `dry_run_transaction`, `send_transaction`, `transfer_token`, `approve_token`, and `sign_typed_data` when exposed by the upstream.

#### Scenario: Candidate tool is present

- GIVEN Wallet Agent exposes a P0 candidate tool
- WHEN W0 discovery evidence is reviewed
- THEN the evidence includes that tool name, its upstream description if safe to persist, and its sanitized input schema

#### Scenario: Candidate tool is missing

- GIVEN Wallet Agent does not expose a P0 candidate tool
- WHEN W0 discovery evidence is reviewed
- THEN the missing tool is recorded as absent with downstream impact for W2, W4, or W5

### Requirement: Sanitized Schema Fixtures

The W0 evidence set MUST preserve sanitized schema fixtures for captured Wallet Agent tools so future registry tests can compare real upstream behavior without depending on live discovery.

#### Scenario: Schema fixture is reviewed

- GIVEN a captured Wallet Agent tool schema
- WHEN the fixture is inspected
- THEN it contains the schema shape required for compatibility review
- AND it does not contain secret values, local credentials, or unnecessary machine-specific output

### Requirement: Schema Hash Manifest

The W0 evidence set MUST record provisional `input_schema_hash` and `upstream_schema_hash` values for each captured P0 tool schema in a stable `sha256:<hex>` form.

#### Scenario: Hashes are available for a captured tool

- GIVEN a P0 candidate tool was captured from Wallet Agent
- WHEN the schema hash manifest is reviewed
- THEN the tool has both an `input_schema_hash` and an `upstream_schema_hash`
- AND future schema drift can be detected against those values

### Requirement: Registry Readiness Assessment

The W0 evidence set MUST state whether each captured Wallet Agent tool exposes enough non-secret information for future Compass semantics, inspection, simulation, `candidate_tx_digest`, idempotency, policy, and audit requirements.

#### Scenario: Payload evidence is sufficient

- GIVEN a captured tool exposes the fields needed for future guarded forwarding
- WHEN W0 readiness is assessed
- THEN the tool is marked usable for downstream registry planning

#### Scenario: Payload evidence is insufficient

- GIVEN a captured tool hides or omits fields required for future inspection or policy decisions
- WHEN W0 readiness is assessed
- THEN the gap is recorded as a blocker or ADR candidate before W4 or W5 depends on it

### Requirement: Official MCP Context Citation

The W0 evidence set SHOULD cite the Monad MCP guide (`https://docs.monad.xyz/guides/monad-mcp.md`) when MCP-specific Wallet Agent behavior affects an upstream discovery conclusion.

#### Scenario: MCP behavior affects discovery

- GIVEN a discovery note relies on Wallet Agent MCP behavior
- WHEN the note is reviewed
- THEN it includes the relevant official Monad MCP documentation URL

### Requirement: Secret-Safe Discovery

The W0 discovery process MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, or secret-manager output.

#### Scenario: Discovery output contains sensitive-looking data

- GIVEN a command transcript or schema capture includes sensitive-looking or environment-derived content
- WHEN the evidence is prepared for persistence
- THEN the sensitive value is omitted or redacted
- AND the redaction itself does not disclose the original value
