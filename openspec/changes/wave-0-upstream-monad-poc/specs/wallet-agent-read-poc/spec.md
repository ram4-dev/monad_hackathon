# Wallet Agent Read PoC Specification

## Purpose

Define the W0 evidence required to prove safe read-only Wallet Agent behavior against Monad Testnet.

## Requirements

### Requirement: Read-Only Wallet State Evidence

The W0 evidence set MUST include a read-only Wallet Agent proof for `get_wallet_info` and `get_balance` against Monad Testnet when a safe testnet account is available.

#### Scenario: Safe account is available

- GIVEN a safe testnet account is available without exposing secrets
- WHEN W0 read-only validation runs against Monad Testnet
- THEN evidence includes successful or safely failed `get_wallet_info` and `get_balance` results
- AND the evidence ties the result to `chain_id=10143`

#### Scenario: Safe account is unavailable

- GIVEN no safe account is available for W0
- WHEN read-only validation is finalized
- THEN the missing account dependency is recorded as skipped or blocked with downstream impact

### Requirement: Optional Token Balance Evidence

The W0 evidence set SHOULD include `get_token_balance` evidence when a safe token/account combination is available; otherwise it MUST record that token-balance validation was not performed.

#### Scenario: Token balance can be checked safely

- GIVEN a safe token/account combination is available on Monad Testnet
- WHEN W0 read evidence is reviewed
- THEN `get_token_balance` evidence is included and marked read-only

### Requirement: Read-Only Non-Mutation Boundary

Read-only PoC evidence MUST NOT include any broadcast, transfer, token approval, signature, or other external state mutation.

#### Scenario: Read-only validation is performed

- GIVEN W0 is collecting read-only evidence
- WHEN a Wallet Agent call is classified as part of the read PoC
- THEN the call is accepted only if it is read-only
- AND any state-mutating call is excluded and routed to the external mutation consent gate

### Requirement: Read Evidence Sufficiency

The W0 read PoC evidence MUST state whether Wallet Agent exposes enough safe context for future Compass audit and policy decisions for read-only tools.

#### Scenario: Read context is sufficient

- GIVEN `get_wallet_info` or `get_balance` evidence includes chain and account context safely
- WHEN W0 read readiness is assessed
- THEN the tool is marked suitable for future read-only registry planning

#### Scenario: Read context is insufficient

- GIVEN Wallet Agent read responses omit chain or account context needed by Compass
- WHEN W0 read readiness is assessed
- THEN the omission is recorded as a blocker or fallback requirement

### Requirement: Secret-Safe Read Evidence

The W0 read PoC MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, seed phrases, or secret-manager output.

#### Scenario: Read output includes account-specific details

- GIVEN read-only output includes addresses, paths, or machine-specific details
- WHEN the evidence is persisted
- THEN only safe account identifiers required for validation are retained
- AND secret values or unnecessary local details are redacted
