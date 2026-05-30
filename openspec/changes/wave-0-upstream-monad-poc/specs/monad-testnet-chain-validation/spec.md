# Monad Testnet Chain Validation Specification

## Purpose

Define the W0 evidence required to prove Wallet Agent can target the intended Monad Testnet runtime boundary.

## Requirements

### Requirement: Official Monad Testnet Facts

The W0 evidence set MUST validate Monad Testnet against official Monad testnet documentation (`https://docs.monad.xyz/developer-essentials/testnets.md`) by confirming `chain_id=10143` and native currency `MON` for P0.

#### Scenario: Chain facts match official docs

- GIVEN W0 chain validation evidence is reviewed
- WHEN the expected network facts are compared with official Monad Testnet documentation
- THEN the evidence confirms `chain_id=10143`
- AND the evidence confirms native currency symbol `MON`

### Requirement: Wallet Agent Custom Chain Flow

The W0 evidence set MUST show whether Wallet Agent can add and select Monad Testnet using `add_custom_chain` and `switch_chain` with `chain_id=10143`, `MON`, and an allowlisted or configured RPC provider.

#### Scenario: Custom chain flow succeeds

- GIVEN Wallet Agent is available for W0 validation
- WHEN Monad Testnet is added and selected
- THEN the evidence records successful `add_custom_chain` and `switch_chain` outcomes for `chain_id=10143`

#### Scenario: Custom chain flow fails

- GIVEN Wallet Agent cannot add or select Monad Testnet
- WHEN W0 chain validation is completed
- THEN the failure is recorded as a blocker with the safe error or observed limitation

### Requirement: Runtime Chain Confirmation

The W0 evidence set MUST confirm the active runtime chain after switching by using safe, sanitized evidence from Wallet Agent and/or Monad Testnet RPC.

#### Scenario: Active chain is confirmed

- GIVEN Wallet Agent reports or uses an active chain after switching
- WHEN runtime evidence is reviewed
- THEN the active chain is confirmed as `10143`

#### Scenario: Active chain is ambiguous

- GIVEN the active chain cannot be confirmed from safe evidence
- WHEN W0 chain validation is reviewed
- THEN W0 records a blocker before any downstream wave relies on chain-specific behavior

### Requirement: Non-Monad Chains Are Not Accepted

The W0 validation result MUST NOT treat any chain other than Monad Testnet `10143` as a successful P0 chain validation, including Monad Mainnet `143`.

#### Scenario: A non-P0 chain appears in evidence

- GIVEN chain validation evidence includes a chain id other than `10143`
- WHEN the evidence is classified
- THEN it is not accepted as P0 Monad Testnet validation
- AND the mismatch is recorded as a blocker or out-of-scope finding

### Requirement: Secret-Safe Chain Evidence

The W0 chain validation evidence MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, or secret-manager output.

#### Scenario: RPC or account context is documented

- GIVEN chain validation evidence needs to identify an RPC provider or account context
- WHEN the evidence is persisted
- THEN public provider names or sanitized identifiers MAY be recorded
- AND secret URL parameters, credentials, private keys, and `.env` values are not recorded
