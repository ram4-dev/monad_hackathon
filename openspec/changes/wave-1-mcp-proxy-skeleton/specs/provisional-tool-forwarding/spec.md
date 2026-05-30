# Provisional Tool Forwarding Specification

## Purpose

Define the W1 `tools/call` interceptor skeleton: shape validation, classification against a provisional read-only allowlist derived from W0, near-transparent forwarding of allowed calls, and blocking of every other tool before it reaches the upstream. This is the W1 stand-in for the W4 guarded forward pipeline and must not become an unsafe pass-through.

## Requirements

### Requirement: Request Shape Validation

Compass MUST validate every `tools/call` for a present tool name, a valid JSON object of arguments, and arguments within a bounded size before any classification or forwarding.

#### Scenario: Malformed call is rejected

- GIVEN a `tools/call` with a missing tool name or non-object/oversized arguments
- WHEN Compass validates the request
- THEN Compass returns a safe `MISSING_REQUIRED_EVIDENCE` or `INTERNAL_ERROR` without forwarding
- AND a sanitized audit event records the rejection

### Requirement: Provisional Read-Only Allowlist

Compass MUST maintain a provisional W1 allowlist that contains only non-mutating tools — `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction` — and MUST NOT include any mutating, signing, approval, broadcast, or key-management tool.

#### Scenario: Allowlist contains only read-only and simulation tools

- GIVEN the W1 provisional allowlist
- WHEN it is inspected
- THEN every entry is classified `read_only` or `simulation`
- AND `dry_run_transaction` is absent because the upstream does not expose it (`W0-BLOCKER-009`)

#### Scenario: Allowlisted read-only call is forwarded

- GIVEN a `tools/call` for a tool in the provisional allowlist
- WHEN it passes shape validation
- THEN Compass forwards it to the upstream and returns a near-transparent response
- AND a `tool_call_forwarded` audit event is recorded

### Requirement: Block Of Non-Allowlisted Tools

Compass MUST block every tool that is not a Compass meta-tool and not in the provisional read-only allowlist, returning a safe error and never forwarding to the upstream.

#### Scenario: Write or approval tool is blocked

- GIVEN a `tools/call` for `send_transaction`, `transfer_token`, `approve_token`, or `sign_typed_data`
- WHEN Compass classifies it
- THEN Compass returns a safe `POLICY_BLOCKED` error and does not forward
- AND a `tool_call_blocked` audit event is recorded

#### Scenario: Private-key or keystore tool is blocked

- GIVEN a `tools/call` for any private-key or keystore-management tool
- WHEN Compass classifies it
- THEN Compass blocks it before any upstream contact

#### Scenario: Unknown tool is blocked

- GIVEN a `tools/call` for a tool name that is neither a Compass meta-tool nor in the provisional allowlist
- WHEN Compass classifies it
- THEN Compass returns `UNMAPPED_TOOL` and does not forward

### Requirement: Interceptor Stage Scaffold For W4

The interceptor MUST expose the stage ordering that W4 will complete (`registry → required evidence → simulation → risk → policy → allow/block`), even though W1 only implements shape validation, the provisional allowlist split, forward/block, and audit.

#### Scenario: Stage scaffold is present

- GIVEN the W1 `callInterceptor`
- WHEN a reviewer inspects the pipeline
- THEN the deferred stages are identified as W4 work
- AND no policy/risk/digest/simulation decision is silently implemented in W1
