# Risk Checks Specification

## Purpose

Define deterministic Wave 3 risk behavior with on-chain policy contract reads, preserving W2 registry-first semantics and fail-closed safety.

## Requirements

### Requirement: Deterministic Risk Assessment Shape

The system SHALL compute deterministic risk findings from W2 semantics, validated on-chain policy snapshot, and evidence context.

#### Scenario: Same inputs produce same risk output
- GIVEN identical W2 output, on-chain policy snapshot, and evidence
- WHEN risk is computed repeatedly
- THEN blocking findings and reason codes SHALL be stable

### Requirement: Policy Read Risk Gate (Fail Closed)

Risk evaluation SHALL produce blocking findings when policy source cannot be safely read/validated.

#### Scenario: RPC failure blocks
- GIVEN policy read RPC timeout/error
- WHEN risk evaluation starts
- THEN risk SHALL include a blocking policy-read finding
- AND final decision SHALL be `block`

#### Scenario: ABI/schema failure blocks
- GIVEN ABI decode or schema validation fails for policy read
- WHEN risk evaluation starts
- THEN risk SHALL include blocking policy-schema finding
- AND final decision SHALL be `block`

### Requirement: Chain Binding Risk Gate

Risk evaluation SHALL block when policy source chain binding is missing or not Monad Testnet `10143`.

#### Scenario: Wrong chain policy source blocks
- GIVEN policy source bound to chain other than `10143`
- WHEN risk evaluation runs
- THEN risk SHALL include blocking chain-binding finding
- AND final decision SHALL be `block`

### Requirement: W2 Required Evidence Risk Checks

The system SHALL enforce W2 required fields/evidence/simulation gates and SHALL NOT reclassify tools.

#### Scenario: Missing W2 evidence blocks
- GIVEN W2-required evidence is absent
- WHEN risk checks run
- THEN risk SHALL include `MISSING_REQUIRED_EVIDENCE`
- AND final decision SHALL be `block`

### Requirement: Policy Caps/Allowlists Risk Checks (From On-Chain Source)

Gas caps, amount caps, recipient/token/spender allowlists, and approval rules SHALL be evaluated from fetched on-chain policy state.

#### Scenario: Unlimited approval is blocked
- GIVEN approval candidate indicates unlimited amount
- WHEN risk checks run with policy flag enabled
- THEN risk SHALL include blocking unlimited-approval finding
- AND final decision SHALL be `block`

#### Scenario: Non-allowlisted entity blocks
- GIVEN recipient/token/spender not present in on-chain allowlists
- WHEN risk checks run
- THEN risk SHALL include corresponding blocking finding
- AND final decision SHALL be `block`

### Requirement: Deployment/Reset Awareness Risk Gate

If configured policy contract address is not readable after Monad Testnet reset/redeploy events, Wave 3 SHALL fail closed.

#### Scenario: Stale address after testnet reset blocks
- GIVEN configured address no longer exposes valid policy state
- WHEN policy/risk evaluation runs
- THEN risk SHALL include blocking stale-policy-source finding
- AND final decision SHALL be `block`
