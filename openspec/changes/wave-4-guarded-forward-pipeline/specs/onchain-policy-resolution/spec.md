# On-Chain Policy Resolution Specification

## Purpose

Define how W4 resolves and reads the **user's on-chain policy contract** on Monad Testnet to make the `allow|block` decision. The user-identity scheme and the policy contract shape are owned by W3; this spec consumes them through an abstract interface and requires fail-closed behavior.

## Requirements

### Requirement: Per-User Policy Resolution

W4 MUST resolve the active user's identity (via the W3 interface) to that user's policy contract address on Monad Testnet (`chain_id=10143`) before evaluating policy.

#### Scenario: User resolves to their policy contract

- GIVEN a `tools/call` with an active user identity (as defined by W3)
- WHEN W4 resolves policy
- THEN it obtains the policy contract address for that user on chain `10143`

#### Scenario: User identity cannot be resolved

- GIVEN a call whose user identity cannot be resolved
- WHEN W4 attempts resolution
- THEN it blocks with `USER_POLICY_UNRESOLVED` and does not forward

### Requirement: On-Chain Policy Read With Freshness

W4 MUST read the user's policy state from the contract via RPC (`eth_call`), MAY cache it, and MUST honor a freshness rule so a stale cached policy is not used beyond its window.

#### Scenario: Policy read succeeds

- GIVEN a resolved policy contract address
- WHEN W4 reads its state within the freshness window
- THEN it obtains a policy snapshot (version/block + rules) used for evaluation

#### Scenario: Policy read fails or contract is unavailable

- GIVEN the policy contract cannot be read (RPC failure, missing contract, malformed state)
- WHEN W4 attempts the read
- THEN it blocks with `POLICY_CONTRACT_UNAVAILABLE` and does not forward

### Requirement: Fail-Closed Evaluation

If the user's policy cannot be resolved or read, W4 MUST block. A missing or unreadable policy MUST NEVER default to allow.

#### Scenario: Unresolved policy never allows

- GIVEN any failure in resolution or reading
- WHEN the deterministic decision is made
- THEN the outcome is `block`

### Requirement: Per-User Isolation

The policy used for a decision MUST be the resolved user's own policy. One user's policy MUST NEVER govern another user's call.

#### Scenario: User A policy does not govern user B

- GIVEN two distinct users A and B with different policy contracts
- WHEN a call from user B is evaluated
- THEN only user B's policy snapshot is used

### Requirement: Raw RPC Errors Are Sanitized

W4 MUST NOT expose raw RPC errors or contract internals through SafeError, audit, or logs.

#### Scenario: RPC error is sanitized

- GIVEN an RPC read returns a verbose or sensitive error
- WHEN W4 surfaces the failure
- THEN only a safe message and optional sanitized `debug_ref` remain
