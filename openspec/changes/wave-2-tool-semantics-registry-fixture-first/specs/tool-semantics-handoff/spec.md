# Tool Semantics Handoff Specification

## Purpose

Define what Wave 2 MUST hand off to W3 policy/risk/audit and W4 guarded forwarding while explicitly avoiding Wave 1 runtime implementation and all transaction/signature mutation behavior.

## Requirements

### Requirement: W3 Policy and Risk Handoff

The system MUST expose enough registry semantics for W3 to evaluate deny-by-default policy and deterministic risk checks without reclassifying tools from names, descriptions, or LLM output.

#### Scenario: W3 consumes read-only semantics

- GIVEN W3 receives a registry entry with `tool_class=read_only` and `state_effect=none`
- WHEN W3 builds policy and audit expectations
- THEN W3 MUST be able to determine that the tool MAY be allowed with audit if the registry entry is enabled and chain evidence passes
- AND W3 MUST NOT need to infer read-only status from the upstream description

#### Scenario: W3 consumes write-like semantics

- GIVEN W3 receives a registry entry with `tool_class=transaction_execute`, `token_approval`, or `signature`
- WHEN W3 builds policy and risk checks
- THEN W3 MUST see `default_decision=block`
- AND W3 MUST see required policy checks, simulation/evidence requirements, and chain constraints before it can ever return allow

### Requirement: Required Evidence Handoff

The system MUST define required evidence names in registry entries so W3 and W4 can validate missing evidence deterministically. Required evidence names MUST distinguish read evidence, chain evidence, simulation evidence, digest requirements, idempotency requirements, typed-data decode evidence, finite approval evidence, and exact policy allow requirements.

#### Scenario: Downstream detects missing simulation

- GIVEN a write-like registry entry has `requires_simulation=true`
- AND its `required_evidence` includes simulation evidence
- WHEN W3 or W4 evaluates a call without simulation evidence
- THEN the downstream layer MUST be able to block with a missing-evidence reason
- AND it MUST NOT forward the call upstream

#### Scenario: Downstream detects approval evidence requirements

- GIVEN the `approve_token` registry entry requires token, spender, amount, finite approval evidence, and exact policy allow evidence
- WHEN W3 or W4 evaluates an approval without those evidence items
- THEN the downstream layer MUST block before forwarding
- AND unlimited or unknown approvals MUST remain blocked by default

### Requirement: W4 Guarded Forwarding Handoff

The system MUST hand W4 stable tool class, state effect, default decision, required fields, evidence requirements, simulation requirement, and policy check names for every captured P0 mapping. Wave 2 MUST NOT forward or simulate calls itself.

#### Scenario: W4 receives executable transaction semantics

- GIVEN W4 receives the `send_transaction` or `transfer_token` registry entry
- WHEN W4 constructs the guarded forwarding pipeline
- THEN W4 MUST know that the tool requires simulation, digest, idempotency, policy allow, and sanitized audit before forwarding
- AND W4 MUST know that the Wave 2 default decision is block until those later layers pass

#### Scenario: W4 receives simulation semantics

- GIVEN W4 receives the `estimate_gas` or `simulate_transaction` registry entry
- WHEN W4 uses the entry as part of evidence gathering
- THEN W4 MUST know these tools are `simulation` class with `state_effect=none`
- AND W4 MUST still audit their use and respect schema compatibility

### Requirement: Wave 1 Dependency Avoidance

The system MUST keep Wave 2 independent of unavailable Wave 1 runtime pieces. Wave 2 MUST NOT implement MCP server/client transport, upstream process lifecycle, `compass-proxy`, host MCP configuration, `tools/list` runtime mirroring, or `tools/call` forwarding.

#### Scenario: Wave 2 artifacts are reviewed for scope creep

- GIVEN Wave 2 artifacts exist
- WHEN a reviewer looks for Wave 1 runtime implementation
- THEN the artifacts MUST show only registry, resolver, filtering contract, or fixture-based behavior
- AND they MUST NOT claim runtime host connectivity or upstream process management

#### Scenario: A later phase needs runtime filtering proof

- GIVEN Wave 2 has only pure fixture-first proof
- WHEN W1 or W4 needs runtime proof that host-visible `tools/list` is filtered
- THEN that proof MUST be created in W1/W4 integration artifacts
- AND W2 MUST remain a source of semantics, not a runtime proof substitute

### Requirement: Mutation and Signing Non-Execution

The system MUST NOT perform transfers, approvals, signatures, broadcasts, contract writes, or any other external mutation as part of Wave 2. Wave 2 MAY classify mutation-capable tools and name required evidence, but it MUST NOT claim runtime execution safety for them.

#### Scenario: Mutation-capable tool is mapped

- GIVEN `send_transaction`, `transfer_token`, `approve_token`, or `sign_typed_data` has a Wave 2 registry entry
- WHEN the entry is reviewed
- THEN the entry MUST classify the tool and name downstream requirements
- AND the entry MUST NOT assert that a live transfer, approval, signature, or broadcast was performed in Wave 2
- AND the entry MUST preserve W0 mutation-consent blocker context where applicable

### Requirement: Downstream Unsupported Capability Handoff

The system MUST hand off unsupported capability information, especially absent `dry_run_transaction`, so W3/W4/W5 do not depend on unavailable upstream behavior.

#### Scenario: W3/W4 requests dry-run capability

- GIVEN W0 recorded `dry_run_transaction` as absent via `W0-BLOCKER-009`
- WHEN W3 or W4 reads Wave 2 handoff semantics
- THEN they MUST see that `dry_run_transaction` is unsupported or blocked
- AND they MUST use `simulate_transaction` or another accepted future fallback rather than assuming dry-run support

#### Scenario: Later evidence resolves dry-run absence

- GIVEN a future capture proves `dry_run_transaction` exists with real hashes
- WHEN downstream layers want to use it
- THEN the handoff MUST require a reviewed registry update before W3/W4/W5 treat it as enabled

### Requirement: Review and Traceability Handoff

The system MUST make Wave 2 reviewable by tracing each exposed tool decision to W0 evidence, registry semantics, and downstream safety requirements.

#### Scenario: Reviewer audits an exposed tool

- GIVEN a reviewer selects any captured P0 mapped tool
- WHEN they inspect the Wave 2 specs and future registry artifact
- THEN they MUST be able to trace the tool to its W0 fixture/hash evidence
- AND they MUST see its class, state effect, default decision, required fields, required evidence, and policy check names
- AND they MUST see whether runtime proof is out of scope for Wave 2

#### Scenario: Reviewer audits a blocked or unsupported tool

- GIVEN a reviewer selects an unmapped, private-key, keystore, dangerous, schema-drifted, or `dry_run_transaction` tool
- WHEN they inspect the Wave 2 specs and future registry artifact
- THEN they MUST see why the tool is hidden, blocked, unsupported, or disabled before policy
- AND they MUST see which future evidence or phase would be required to change that status
