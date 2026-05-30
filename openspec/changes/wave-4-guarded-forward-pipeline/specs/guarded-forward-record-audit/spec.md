# Guarded Forward Record and Audit Specification

## Purpose

Define the `GuardedForwardRecord` and the audit captured for every guarded decision, including the on-chain policy snapshot and the LLM verdict (constitution §8).

## Requirements

### Requirement: Guarded Forward Record

W4 MUST produce a `GuardedForwardRecord` for each guarded decision containing at least: `forward_id`, `audit_event_id`, `tool_name`, `tool_class`, `chain_id=10143`, `candidate_tx_digest` (when applicable), `covered_fields`, `idempotency_key` (for broadcast/execution), and risk/simulation snapshots.

#### Scenario: Record is produced

- GIVEN a guarded decision (forward or block)
- WHEN W4 finalizes it
- THEN a `GuardedForwardRecord` is produced and linked to its audit event

### Requirement: On-Chain Policy Source Snapshot

The record MUST capture the on-chain `policy_source`: `policy_contract_address`, `policy_chain_id=10143`, and a `policy_version`/`policy_block` snapshot identifying which policy governed the decision.

#### Scenario: Decision references the policy snapshot

- GIVEN a decision evaluated against the user's on-chain policy
- WHEN the record is reviewed
- THEN it identifies the policy contract address and its version/block

### Requirement: LLM Verdict Recorded

When the LLM final safety review runs, the record/audit MUST capture whether it ran and its verdict (`safe`/`unsafe`/`unavailable`) with a redacted reason.

#### Scenario: LLM verdict is audited

- GIVEN a deterministic allow followed by the LLM review
- WHEN the decision is recorded
- THEN `llm_review` captures ran=true and the verdict, with a redacted reason

### Requirement: Append-Only Sanitized Audit

Every terminal path MUST write an append-only audit event with redacted metadata; no secrets, raw upstream payloads, raw RPC errors, or raw LLM I/O are persisted.

#### Scenario: Audit is redacted

- GIVEN any terminal decision
- WHEN the audit event is written
- THEN it is append-only and contains no sensitive content
