# Known Limitations and ADR Specification

## Purpose

Record the architectural decisions and known limitations of the P0 release, including the divergences from the current constitution introduced by the on-chain policy model and the LLM safety layer.

## Requirements

### Requirement: ADR For On-Chain Per-User Policy

W6 MUST include an ADR documenting the on-chain per-user policy model, why it supersedes the local-JSON-policy assumption, and that it requires a constitution amendment (constitution §3.4 currently scopes on-chain rules out of P0).

#### Scenario: On-chain policy ADR present

- GIVEN the ADR list
- WHEN reviewed
- THEN it includes the on-chain per-user policy decision and the required constitution amendment

### Requirement: ADR For LLM Veto-Only Safety Layer

W6 MUST include an ADR documenting the LLM final safety layer as veto-only and fail-closed, and that it diverges from the current "LLM not a security authority" scope.

#### Scenario: LLM ADR present

- GIVEN the ADR list
- WHEN reviewed
- THEN it documents the LLM layer as veto-only, fail-closed, and the divergence it requires to be ratified

### Requirement: Known Limitations Recorded

W6 MUST record known limitations: on-chain read latency/cost, user-identity scheme owned by W3, RPC provider limits, testnet-only scope, and anything not validated end-to-end.

#### Scenario: Limitations recorded

- GIVEN the known-limitations list
- WHEN reviewed
- THEN it includes latency/cost, identity ownership, provider limits, testnet-only, and unvalidated items

### Requirement: Divergences Are Explicit

Every divergence from `docs/constitution.md` MUST be explicitly listed so reviewers can ratify or reject it.

#### Scenario: Divergences listed

- GIVEN the ADR/limitations
- WHEN compared to the constitution
- THEN each divergence (on-chain policy, LLM veto) is explicitly listed
