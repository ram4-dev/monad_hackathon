# Change: W2 Tool Semantics Registry — Fixture-First

## Problem

Wave 2 needs to define deterministic semantics for every Wallet Agent tool that Compass may expose, but Wave 1 is unavailable. Wave 1 would normally provide the MCP proxy skeleton, host-facing `tools/list` filtering integration, upstream lifecycle, and runtime proof that tools are not exposed before registry filtering.

Compass still needs W2 before W3/W4 can safely build policy, risk, audit, and guarded forwarding. The path forward is to make W2 a **fixture-first, pure Tool Semantics Registry** change that consumes W0 Wallet Agent evidence and schema hashes, without implementing any Wave 1 proxy/runtime behavior.

## Goals

- Define a versioned `ToolSemantics` registry contract aligned with `docs/constitution.md`.
- Use W0 sanitized Wallet Agent `tools/list` fixtures and `schema-hash-manifest.json` as the source for captured P0 tool schemas.
- Map captured P0 Wallet Agent tools to deterministic classes, state effects, default decisions, required fields, required evidence, simulation requirements, and policy check names.
- Prove, at the pure registry/filter-contract level, that unmapped, private-key/keystore, dangerous, and schema-drifted tools are hidden or blocked before policy.
- Preserve the Compass invariant that the registry wins over upstream natural-language descriptions and LLM interpretation.
- Keep W2 independent of Wave 1 so W3 can consume stable tool classes and registry shape while Wave 1 remains unavailable.

## Non-Goals

Wave 1 is unavailable and is explicitly out of scope for this change. W2 must **not** implement or backfill Wave 1.

W2 does not implement:

- MCP proxy runtime or `compass-proxy` entrypoint.
- Host MCP wiring, host configuration, or no-bypass proof.
- Upstream process lifecycle, Wallet Agent subprocess management, or stdio transport.
- Runtime `tools/list` calls against Wallet Agent.
- Runtime proof of host-facing `tools/list` filtering.
- `tools/call` forwarding or guarded forwarding.
- Policy/risk/audit engines.
- `candidate_tx_digest`, digest canonicalization, or idempotency.
- Simulation orchestration beyond naming required evidence/requirements.
- Transfers, approvals, signatures, broadcasts, writes, or any mutation.
- Direct Wallet Agent access from Claude/Codex/Cursor.
- A fake or speculative `dry_run_transaction` entry.

`dry_run_transaction` remains unsupported/blocked unless new upstream evidence appears. W2 must not invent a schema hash or registry mapping for it.

Runtime proof that host-visible `tools/list` is filtered through the registry is deferred until W1/W4 integration.

## Scope

### In Scope

- OpenSpec specs/design/tasks for a fixture-first W2 after this proposal is accepted.
- A pure registry contract based on the constitution's `ToolSemantics` shape.
- Registry entries for W0-captured P0 tools:
  - `add_custom_chain`
  - `switch_chain`
  - `get_wallet_info`
  - `get_balance`
  - `get_token_balance`
  - `estimate_gas`
  - `simulate_transaction`
  - `send_transaction`
  - `transfer_token`
  - `approve_token`
  - `sign_typed_data`
- Explicit unsupported/absent handling for `dry_run_transaction` via `W0-BLOCKER-009`.
- Schema compatibility behavior using W0 `input_schema_hash` and `upstream_schema_hash` values.
- Pure filtering/resolution scenarios over fixture arrays, including:
  - captured and enabled tools resolve to registry semantics;
  - unknown/unmapped tools hide or block before policy;
  - private-key/keystore tools hide or block by default;
  - schema drift disables the affected tool;
  - missing `dry_run_transaction` is not exposed.
- Documentation of how W3/W4 will consume registry classes, state effects, evidence requirements, and policy check names.

### Out of Scope for W2 Apply

- Live Wallet Agent recapture unless explicitly approved in a later phase.
- Runtime integration with an MCP server/client.
- Any chain mutation, write, signing, approval, broadcast, or external state change.
- Host no-bypass validation; this remains tracked by `W0-BLOCKER-007` and is a W6/demo-readiness dependency.

## Dependencies

| Dependency | Status | W2 handling |
| --- | --- | --- |
| W0 schema capture | Available for present P0 tools | Hard input for final registry hashes. Use `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`. |
| W0 sanitized fixtures | Available for present P0 tools | Use as fixture source for pure registry and drift scenarios. |
| W0 Monad chain/read/simulation evidence | Mostly resolved with follow-ups | Use only for semantic classification and required evidence names; do not implement runtime chain behavior in W2. |
| `dry_run_transaction` upstream evidence | Absent | Treat as unsupported/blocked via `W0-BLOCKER-009`; no fake entry/hash. |
| W1 MCP proxy skeleton | Unavailable | Avoid entirely in W2. Runtime filtering proof deferred to W1/W4. |
| W3 policy/risk/audit | Future | W2 exports classes, effects, and policy-check names only; does not evaluate policy. |
| W4 guarded forwarding | Future | W2 supplies registry requirements; no forwarding in this change. |
| W6 no-bypass proof | Open blocker | Keep as operational/demo blocker, not W2 scope. |

## Affected Areas

Proposal-phase changes affect only:

- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/proposal.md`

Expected future W2 artifacts may affect:

- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/**/spec.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/design.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/tasks.md`
- Future registry/source/test files selected during SDD design/apply, likely around a pure tool semantics module and fixture-based contract tests.

No application/runtime source code is changed by this proposal.

## Risks

- **W1 absence:** W2 can prove pure registry behavior but cannot prove host-visible runtime `tools/list` filtering until W1/W4.
- **Schema drift:** Wallet Agent was captured as `wallet-agent` server version `0.1.0` through `bunx wallet-agent@latest`; future `latest` changes can invalidate hashes.
- **Absent dry-run:** `dry_run_transaction` is listed in product/wave intent but absent from W0 live `tools/list`; pretending support would create a false safety guarantee.
- **No test runner configured:** `openspec/config.yaml` has `strict_tdd: false` and no test runner. W2 apply may need a later decision on minimal test scaffolding versus OpenSpec-only/spec-first artifacts.
- **Mutation semantics without mutation evidence:** W0 intentionally skipped transfer/approval/signature/broadcast paths without explicit consent. W2 can classify such tools and name required evidence, but cannot claim safe runtime execution.
- **Review risk:** Registry entries can look repetitive but encode security-critical decisions. Review should focus on default block behavior, hash usage, drift handling, and no accidental runtime scope creep.

## Rollback

- Revert/delete `openspec/changes/wave-2-tool-semantics-registry-fixture-first/` if the W2 direction changes.
- If W0 fixtures/hashes are later found stale, mark W2 registry entries disabled until a recapture updates hashes and specs.
- If Wave 1 becomes available before W2 apply, keep this proposal's pure-registry boundary unless the user explicitly approves expanding W2 to runtime integration.
- If `dry_run_transaction` appears in a later pinned upstream capture, add it through a new evidence update and registry review rather than silently changing this W2 proposal.

## Acceptance Criteria

W2 is successful when future SDD phases produce reviewable artifacts and/or implementation that satisfy:

- Wave 1 remains unavailable and out of scope; no W1 proxy/runtime behavior is implemented by W2.
- Registry semantics are defined from W0 fixtures and schema hashes for all captured P0 tools.
- `dry_run_transaction` is explicitly unsupported/blocked unless real upstream evidence appears.
- Unmapped/private-key/keystore/dangerous tools are hidden or blocked before policy.
- Schema drift disables affected tools until the registry is updated.
- Registry behavior is deterministic and does not depend on natural-language upstream descriptions or LLM judgment.
- W3 can consume stable tool classes, state effects, required evidence, simulation flags, and policy-check names.
- Runtime `tools/list` filtering proof is explicitly deferred to W1/W4 and not claimed in W2.
- No secrets are read or persisted, and no mutation/signing/broadcast/write is performed.

## Review Workload Forecast

| Field | Forecast |
| --- | --- |
| Delivery strategy | Single PR by default, per session preflight. |
| Review budget | No fixed line cap, but high-risk areas must still be flagged. |
| Expected proposal diff | Small docs-only change. |
| Expected full W2 diff | Medium if implementation/test scaffolding is added; small-to-medium if OpenSpec/spec-first only. |
| Chained PR recommendation | Not required for proposal. Re-evaluate before apply if W2 adds package/test scaffolding. |
| Main review focus | Scope boundary, W1 exclusion, hash/drift behavior, default block rules, dry-run absence, and downstream W3/W4 handoff. |

## Next Phase

Proceed to `sdd-spec` for `wave-2-tool-semantics-registry-fixture-first`.

The spec should define testable scenarios for fixture-first registry resolution, schema drift, hidden/blocked unmapped tools, private-key/keystore default block behavior, unsupported `dry_run_transaction`, and W1/W4 runtime-proof deferral.
