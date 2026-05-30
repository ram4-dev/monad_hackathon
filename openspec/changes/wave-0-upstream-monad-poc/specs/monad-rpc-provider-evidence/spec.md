# Monad RPC Provider Evidence Specification

## Purpose

Define the W0 evidence required to choose a demo Monad Testnet RPC provider and document provider-specific caveats before policy or forwarding work depends on it.

## Requirements

### Requirement: Demo RPC Provider Selection

The W0 evidence set MUST identify the selected demo Monad Testnet RPC provider and at least one fallback candidate, without requiring secret RPC credentials to be disclosed.

#### Scenario: Provider is selected

- GIVEN W0 RPC validation is complete
- WHEN provider evidence is reviewed
- THEN the selected demo provider is identified
- AND fallback candidates are listed or the absence of safe fallbacks is recorded as a blocker

### Requirement: Official Monad RPC Caveats

The W0 evidence set MUST account for Monad RPC behavior documented in official Monad documentation, including JSON-RPC caveats from `https://docs.monad.xyz/reference/json-rpc/overview.md`, gas/pricing behavior from `https://docs.monad.xyz/developer-essentials/gas-pricing.md`, and transaction constraints from `https://docs.monad.xyz/developer-essentials/transactions.md`.

#### Scenario: RPC caveats are reviewed

- GIVEN W0 RPC provider notes are inspected
- WHEN official Monad RPC assumptions affect future Compass behavior
- THEN the notes include caveats for asynchronous send validation, unavailable pending transaction lookup through `eth_getTransactionByHash`, provisional `latest`, provider-specific `eth_call` and `eth_estimateGas` limits, full gas limit charging, `eth_maxPriorityFeePerGas` suggestion behavior, EIP-1559-compatible pricing, and unsupported type 3 blob transactions where applicable

### Requirement: Provider Behavior Evidence

The W0 evidence set MUST record observed or explicitly unavailable evidence for provider rate limits, latency, reliability, gas-estimation behavior, and finality caveats.

#### Scenario: Provider behavior is measured

- GIVEN the selected provider can be queried safely
- WHEN W0 RPC evidence is reviewed
- THEN rate-limit, latency, reliability, gas-estimation, and finality observations are recorded in sanitized form

#### Scenario: Provider behavior cannot be measured

- GIVEN a provider behavior category cannot be validated during W0
- WHEN W0 RPC evidence is finalized
- THEN the missing observation is recorded as a blocker, limitation, or follow-up validation item

### Requirement: Finality and Confirmation Assumptions

The W0 evidence set MUST distinguish low-latency `latest` observations from stronger finality assumptions when future value-settlement or confirmation behavior may depend on them.

#### Scenario: Confirmation evidence is documented

- GIVEN a W0 note discusses transaction visibility or settlement
- WHEN the note is reviewed
- THEN it states whether the evidence is based on `latest`, `finalized`, explorer visibility, or another safe observation source

### Requirement: Secret-Safe Provider Evidence

The W0 RPC provider evidence MUST NOT read or persist `.env` contents, private keys, tokens, credentials, delegated payloads, API keys, or secret-manager output.

#### Scenario: Provider URL contains credentials

- GIVEN an RPC URL or provider setting contains a token, API key, or secret query parameter
- WHEN the provider evidence is persisted
- THEN the secret-bearing value is redacted or replaced by a non-secret provider label
- AND the raw secret value is not stored
