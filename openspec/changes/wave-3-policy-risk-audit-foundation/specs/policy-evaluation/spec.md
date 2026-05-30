# Policy Evaluation Specification

## Purpose

Define Wave 3 deterministic policy evaluation where **policy source of truth is a deployed smart contract on Monad Testnet (chain_id 10143)** after Wave 2 resolution and before Wave 4 forwarding.

Monad references:
- https://docs.monad.xyz/developer-essentials/testnets.md
- https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
- https://docs.monad.xyz/developer-essentials/differences.md

## Requirements

### Requirement: Policy Contract Chain Binding and Address

The system SHALL bind policy reads to a configured policy contract address on Monad Testnet (`chain_id=10143`) and SHALL reject any policy source on other chains.

#### Scenario: Policy contract binding is valid
- GIVEN a configured policy contract address and chain id `10143`
- WHEN Wave 3 initializes policy read context
- THEN binding SHALL be accepted
- AND policy reads SHALL use only the bound address/chain pair

#### Scenario: Wrong chain binding fails closed
- GIVEN missing/malformed address or chain id not equal to `10143`
- WHEN policy read context initializes
- THEN Wave 3 SHALL return `block`
- AND safe denial SHALL indicate policy-source binding failure

### Requirement: Full On-Chain Policy Source of Truth

The system SHALL treat on-chain contract state as the authoritative policy source, including policy id/version, tool allowlist, recipient allowlist, token allowlist, spender limits/caps, gas/amount caps, and required flags.

#### Scenario: Valid on-chain policy is accepted
- GIVEN policy contract state includes required fields and valid values
- WHEN Wave 3 reads and validates policy
- THEN policy SHALL be accepted as authoritative
- AND derived snapshot fixtures MAY be used only for test reproducibility

#### Scenario: Invalid policy schema fails closed
- GIVEN on-chain read returns missing/invalid required fields
- WHEN Wave 3 validates policy shape
- THEN Wave 3 SHALL return `block`
- AND policy SHALL NOT fallback to a local authoritative policy object

### Requirement: ABI Read Client (Read-Only)

Wave 3 SHALL use a read-only ABI client to fetch policy state and SHALL NOT mutate chain state during policy evaluation.

#### Scenario: Read-only fetch succeeds
- GIVEN valid RPC response and ABI-compatible return values
- WHEN Wave 3 fetches policy
- THEN policy data SHALL be available for evaluation
- AND no state-changing transaction SHALL be emitted by policy evaluation flow

#### Scenario: RPC/ABI read failure fails closed
- GIVEN RPC timeout/error, ABI decode failure, or malformed response
- WHEN Wave 3 fetches policy
- THEN Wave 3 SHALL return `block`
- AND safe denial SHALL indicate policy read failure category

### Requirement: Owner-Managed Versioned Updates

Policy updates SHALL be owner-managed and versioned on-chain, and update events SHALL be emitted for audit correlation.

#### Scenario: Owner update increments version
- GIVEN owner performs a valid policy update transaction
- WHEN contract state is updated
- THEN `policy_version` SHALL advance deterministically
- AND a policy update event SHALL be emitted

#### Scenario: Unauthorized update is rejected
- GIVEN non-owner attempts policy update
- WHEN update transaction executes
- THEN contract SHALL reject the change
- AND version/state SHALL remain unchanged

### Requirement: W2 Resolver Output Is Policy Input Authority for Tool Semantics

The system SHALL consume Wave 2 resolver outputs as authority for tool semantics/status and SHALL NOT reclassify tools from names/descriptions/schemas/LLM output.

#### Scenario: Unknown or blocked tool stops before policy
- GIVEN Wave 2 returns pre-policy block for unknown/unmapped/unsupported/schema-drifted tool
- WHEN Wave 3 evaluates
- THEN Wave 3 SHALL preserve block outcome
- AND Wave 3 SHALL NOT rescue via policy allowlist checks

### Requirement: Policy Decision Shape

The system SHALL return only `allow` or `block` decisions with safe reason code, policy id/version, and safe explanation.

#### Scenario: Allowed decision includes policy identity
- GIVEN W2 semantics pass and on-chain policy gates pass
- WHEN Wave 3 evaluates
- THEN decision SHALL be `allow`
- AND decision SHALL include `policy_id` and `policy_version`

#### Scenario: Blocked decision includes safe denial
- GIVEN any policy gate fails or policy source validation fails
- WHEN Wave 3 evaluates
- THEN decision SHALL be `block`
- AND denial details SHALL be sanitized

### Requirement: Fail-Closed Policy Source Behavior

Wave 3 SHALL fail closed on policy source failures, including address/chain mismatch, RPC failure, ABI decode failure, schema validation failure, stale/incompatible version handling failure, or missing required fields.

#### Scenario: Version incompatibility blocks
- GIVEN fetched on-chain policy version is incompatible with expected evaluator version rules
- WHEN Wave 3 validates compatibility
- THEN Wave 3 SHALL return `block`
- AND safe denial SHALL include compatible-version failure category

### Requirement: Deployment and Verification Evidence

Wave 3 artifacts SHALL include policy contract deployment and verification evidence for Monad Testnet with safe operational handling.

#### Scenario: Deployment evidence is captured
- GIVEN policy contract deploy is performed for W3
- WHEN evidence is prepared
- THEN artifacts SHALL include deployed address, chain id `10143`, tx hash, and verification reference
- AND artifacts SHALL NOT include private keys, keystore contents, or secret values

### Requirement: Fixture Usage Is Non-Authoritative

Local fixtures SHALL only represent snapshots/mocks of on-chain policy reads for tests.

#### Scenario: Fixture differs from chain
- GIVEN local fixture and on-chain read disagree
- WHEN Wave 3 runs in policy-evaluation mode
- THEN on-chain policy SHALL win
- AND mismatch SHALL produce block or test failure depending on context
