# Design: W2 Tool Semantics Registry — Fixture-First

## Status

`designed`

Wave 2 defines a deterministic Tool Semantics Registry and pure resolver/filter contract for Wallet Agent tools using W0 evidence. It deliberately does **not** implement Wave 1 MCP proxy/runtime behavior.

## Context and Constraints

### Inputs read

- `openspec/config.yaml`
- `docs/constitution.md`
- `docs/development-waves.md`
- `compass_product_spec_monad_mcp_proxy_v0.2.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/proposal.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-registry/spec.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-resolution/spec.md`
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-handoff/spec.md`
- `tmp/sdd-wave2-explore.md`
- W0 evidence:
  - `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`
  - `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/registry-readiness.md`
  - `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json`
  - `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/tools/*.schema.json`
  - `openspec/changes/wave-0-upstream-monad-poc/evidence/blockers/blocker-register.md`
  - `openspec/changes/wave-0-upstream-monad-poc/apply-progress.md`
  - `openspec/changes/wave-0-upstream-monad-poc/verify.md`
  - `openspec/changes/wave-0-upstream-monad-poc/verify-report.md`

### Skill/doc constraint

The injected Monad skill requires consulting official Monad docs before changing Monad-specific code/config/tests/docs. This design does not introduce new Monad chain/RPC/gas behavior; it consumes already captured W0 evidence and repo docs that cite official Monad docs. This executor had no web-fetch tool, so no new official docs fetch was performed during design.

### Active constraints

- Wave 1 is unavailable and must not be implemented in W2.
- W2 must use W0 fixtures/hashes; it must not call live Wallet Agent.
- W2 must not read `.env`, private keys, host MCP config, tokens, credentials, or secret manager outputs.
- W2 must not mutate chain state, sign, approve, broadcast, transfer, or write.
- Strict TDD is not active; no repo test runner is configured.
- Single PR is preferred by user; no fixed review line cap, but high-risk review areas must be flagged.

## Design Goals

1. Produce a deterministic, versioned registry of Wallet Agent tool semantics for downstream W3/W4.
2. Preserve W0 schema hashes and evidence lineage for every captured P0 tool.
3. Make unmapped, private-key/keystore, dangerous, unsupported, and schema-drifted tools hidden or blocked before policy.
4. Represent `dry_run_transaction` as unsupported/absent via `W0-BLOCKER-009`; do not invent hashes or an enabled mapping.
5. Keep resolver/filter behavior pure and fixture-testable without MCP server/client runtime.
6. Make the W1 runtime-proof boundary explicit: W2 can prove logical filtering, not host-visible MCP filtering at runtime.

## Non-Goals

W2 does not implement or backfill:

- `compass-proxy` CLI/entrypoint.
- MCP server over stdio.
- MCP client/upstream process lifecycle.
- Host MCP configuration or no-bypass proof.
- Runtime `tools/list` mirroring.
- Runtime `tools/call` forwarding.
- Policy/risk/audit engines.
- Simulation orchestration, digest, idempotency, or guarded forwarding.
- Live Wallet Agent recapture.
- Any mutation/signature/broadcast/approval/transfer/write.

## Architectural Decision: Fixture-First Registry Module

W2 should add a small pure registry/resolver implementation during apply, rather than remain OpenSpec/spec-only.

### Recommendation

**Recommended apply mode:** minimal implementation/test scaffolding.

Rationale:

- Wave 2 is a hard unlock for W3 policy/risk/audit and W4 guarded forwarding; a docs-only registry would leave downstream phases without a reusable contract.
- The implementation can remain pure and fixture-first, avoiding Wave 1 entirely.
- The security-critical behavior is deterministic enough to test with Node built-ins and static fixtures.
- The implementation can be small and reviewable if limited to registry data, resolver/filter functions, fixtures, and tests.

### Guardrail

Because there is currently no configured test runner/package manifest, tasks/apply should include a pre-apply confirmation point if adding a package scaffold would exceed a small, pure-module diff. If the user rejects package/test scaffolding, W2 can fall back to OpenSpec + machine-readable JSON artifacts, but that is a weaker downstream handoff.

## Proposed File Boundaries for Apply

The design keeps implementation centered on a pure domain module and avoids runtime proxy folders.

Preferred target if code scaffolding is accepted:

```text
packages/coding-agent/
  package.json                         # minimal package/test script only if absent
  src/tool-semantics/
    types.ts                           # ToolSemantics, ToolClass, resolution result shapes
    walletAgentRegistry.ts             # W0-backed registry entries for captured P0 tools
    unsupportedCapabilities.ts         # dry_run_transaction absent/unsupported metadata
    blockedToolRules.ts                # deterministic private-key/dangerous/unmapped block rules
    resolver.ts                        # pure resolve/filter functions
    schemaHash.ts                      # canonical_json_v1 hash helper, if tests need recompute
  test/tool-semantics/
    fixtures/
      w0-schema-hash-manifest.json     # minimal copied W0 manifest subset or exact sanitized copy
      wallet-agent-tools-list.w0.json   # sanitized fixture or minimal descriptor subset
      drifted-tools.fixture.json        # synthetic drift cases, no secrets
      blocked-tools.fixture.json        # private-key/dangerous/unmapped cases
    registry.test.ts or registry.test.js
    resolver.test.ts or resolver.test.js
```

If TypeScript tooling is not already present, prefer a tiny JavaScript + `node:test` variant instead of introducing a TypeScript build pipeline. The registry can still be type-documented with JSDoc until the project package structure is formalized.

Alternative, only if package scaffolding is rejected:

```text
openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/
  tool-semantics-registry.wallet-agent.v1.json
  resolver-contract.md
  fixture-compatibility-matrix.md
```

This fallback remains reviewable but does not fully satisfy the constitution's preference that the registry live in code with contract/snapshot tests.

## Data Model

### ToolSemantics

The registry entry shape follows `docs/constitution.md` and the W2 specs:

```ts
type ToolSemantics = {
  registry_version: string;
  upstream: "wallet_agent";
  tool_name: string;
  exposed_name: string;
  upstream_schema_hash: `sha256:${string}`;
  input_schema_hash: `sha256:${string}`;
  tool_class: ToolClass;
  state_effect: "none" | "local_chain_config" | "chain_state" | "signature" | "key_material";
  default_decision: "allow" | "block";
  requires_simulation: boolean;
  required_fields: string[];
  required_evidence: string[];
  policy_checks: string[];
  evidence_refs: string[];
  notes?: string;
};
```

`evidence_refs` is a W2 design addition for traceability; it should point to W0 fixture/manifest paths and does not affect runtime safety decisions.

### UnsupportedCapability

Unsupported or absent upstream capabilities should not be represented as enabled `ToolSemantics` entries.

```ts
type UnsupportedCapability = {
  upstream: "wallet_agent";
  tool_name: string;
  status: "unsupported" | "absent";
  blocker_ids: string[];
  input_schema_hash: null;
  upstream_schema_hash: null;
  evidence_refs: string[];
  safe_reason_code: "UNSUPPORTED_TOOL";
};
```

`dry_run_transaction` uses this shape with `blocker_ids=["W0-BLOCKER-009"]`.

### ResolutionResult

The resolver returns a safe result that downstream W3/W4 can consume without secrets:

```ts
type ResolutionResult =
  | { status: "visible"; tool_name: string; semantics: ToolSemantics; matched_input_schema_hash: string }
  | { status: "hidden" | "blocked" | "disabled" | "unsupported"; tool_name: string; safe_reason_code: SafeReasonCode; blocker_ids?: string[]; evidence_refs?: string[] };

type SafeReasonCode =
  | "UNMAPPED_TOOL"
  | "UNSUPPORTED_TOOL"
  | "PRIVATE_KEY_MANAGEMENT_BLOCKED"
  | "DANGEROUS_TOOL_BLOCKED"
  | "SCHEMA_DRIFT";
```

`status="visible"` means the tool is registered, captured, and schema-compatible. It does **not** mean the call should be forwarded. `default_decision="block"` for write-like tools remains a downstream W3/W4 requirement: visible write-like tools still block until required evidence, simulation, digest/idempotency, policy, and audit are implemented.

## Registry Entries

W2 registry entries are created only for W0-captured P0 tools:

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

The exact hash values come from:

`openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`

The registry must copy the W0 `input_schema_hash` and `upstream_schema_hash` values exactly. It must also preserve W0 lineage via `evidence_refs` such as:

- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/tools/<tool>.schema.json`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json`

## Fixture Consumption

### Source of truth

W0 evidence remains the source of truth:

- Manifest canonicalization: `canonical_json_v1: sanitize first, recursively sort object keys, preserve array order, encode as UTF-8 JSON with no insignificant whitespace`.
- Capture id: `w0-wallet-agent-debug-20260530T160836Z`.
- Server info from W0 registry readiness: `wallet-agent` version `0.1.0`.
- Tool descriptor fixtures live under W0 `evidence/upstream/tools/*.schema.json`.

### No live calls

W2 apply must not run:

- `bunx wallet-agent@latest`
- MCP `initialize`
- MCP `tools/list`
- MCP `tools/call`
- Monad RPC calls
- any shell command that reads secrets or host MCP config

### Fixture strategy

For tests, prefer copying a minimal sanitized W0-derived fixture into the W2/package test area. The fixture should contain only:

- `tool_name`
- descriptor `name`
- descriptor `inputSchema` if needed for hash recomputation
- precomputed `input_schema_hash`
- precomputed `upstream_schema_hash`
- status/blocker ids

This prevents tests from depending on OpenSpec change paths at runtime while preserving traceability back to W0.

## Resolver and Filter Design

### Main functions

```ts
getToolSemantics(toolName: string): ToolSemantics | undefined
getUnsupportedCapability(toolName: string): UnsupportedCapability | undefined
resolveToolDescriptor(descriptorOrFixture: WalletAgentToolDescriptor): ResolutionResult
filterVisibleTools(descriptorsOrFixtures: WalletAgentToolDescriptor[]): ResolutionResult[]
resolveCallByName(toolName: string, inputSchemaHash?: string): ResolutionResult
```

These functions are pure:

- no network
- no subprocesses
- no filesystem secret reads
- no environment variable reads
- no policy/risk/audit side effects

### Resolution order

1. Exact unsupported capability check, e.g. `dry_run_transaction` -> `UNSUPPORTED_TOOL`.
2. Exact private-key/keystore blocklist check.
3. Registry lookup by exact tool name.
4. If missing from registry, return `UNMAPPED_TOOL` or a more specific dangerous/private-key reason.
5. If registry exists, compare `input_schema_hash`.
6. If hash is missing or mismatched, return `SCHEMA_DRIFT` and disable/block before policy.
7. If compatible, return `visible` with the registry semantics.

### Filtering semantics

`filterVisibleTools` returns visible results only for captured, registered, schema-compatible tools. It excludes:

- unsupported/absent tools such as `dry_run_transaction`;
- private-key/keystore management tools;
- unmapped tools;
- dangerous unknown write-like tools;
- schema-drifted tools.

Future W1/W4 can use the same function as the authority for runtime `tools/list`, but W2 does not prove that runtime integration.

## Block and Drift Representation

### Schema drift

A tool is schema-drifted when:

- the tool name matches a registry entry but `input_schema_hash` differs;
- the tool name matches a registry entry but the hash is missing;
- a future canonicalization helper cannot compute the expected hash deterministically.

Result:

- `status="disabled"` or `status="blocked"`;
- `safe_reason_code="SCHEMA_DRIFT"`;
- no fallback to name/description matching;
- downstream W3/W4 must not treat the tool as safe until a reviewed registry update lands.

### Unmapped tools

Any tool absent from the registry is hidden or blocked before policy.

Default result:

- `safe_reason_code="UNMAPPED_TOOL"`.

If the name/schema indicates write/signature/key-management/danger semantics, return a more specific safe code when possible.

### Private-key and keystore tools

Known blocked exact names include:

- `import_private_key`
- `create_encrypted_keystore`
- `unlock_keystore`
- `import_encrypted_private_key`
- `remove_private_key`

W0 sanitized `tools/list` confirms at least `import_private_key` and `remove_private_key` are exposed by Wallet Agent. These must never be enabled by W2.

Conservative detection may also block names/schema fields containing key-material indicators such as `privateKey`, `keystore`, `unlock`, `import_private_key`, or `remove_private_key`. This detection is only used to block; it must never be used to allow.

Result:

- `safe_reason_code="PRIVATE_KEY_MANAGEMENT_BLOCKED"`;
- no secret value or key material is required or inspected.

### Dangerous and unknown write-like tools

Examples include unmapped tools such as `write_contract`, raw send/sign tools, or future unknown write-like tools.

Result:

- `safe_reason_code="DANGEROUS_TOOL_BLOCKED"` when the name/schema indicates state-changing/signing behavior;
- otherwise `UNMAPPED_TOOL`;
- never reaches W3 policy as an allowable candidate.

### `dry_run_transaction`

W0 manifest has:

- `status="absent"`
- `input_schema_hash=null`
- `upstream_schema_hash=null`
- `blocker_ids=["W0-BLOCKER-009"]`

W2 representation:

- not an enabled registry entry;
- unsupported/absent metadata only;
- `safe_reason_code="UNSUPPORTED_TOOL"`;
- no fake schema hash;
- no dry-run coverage claim.

If a later pinned Wallet Agent capture exposes `dry_run_transaction`, add it through a new evidence-backed change and registry review.

## W3/W4 Handoff

W2 exports stable semantics that downstream layers can consume:

- `tool_class`
- `state_effect`
- `default_decision`
- `requires_simulation`
- `required_fields`
- `required_evidence`
- `policy_checks`
- schema hashes
- safe reason codes for blocked/unsupported cases

W3 uses the registry to build policy/risk without reclassifying tools from names, descriptions, or LLM output.

W4 uses the registry/resolver for guarded forwarding preconditions, but must add:

- required evidence validation;
- simulation/inspection orchestration;
- digest/idempotency;
- policy allow/block;
- sanitized audit;
- actual upstream forwarding only after allow.

## Wave 1 Deferral and Claim Boundary

W2 proves only pure registry behavior against fixtures. It cannot and must not claim:

- host-visible MCP `tools/list` is filtered at runtime;
- Claude/Codex/Cursor cannot bypass Compass;
- Wallet Agent is hidden from host config;
- blocked `tools/call` requests do not reach upstream at runtime;
- `compass-proxy` can start or connect to Wallet Agent.

Those proofs belong to W1/W4/W6. `W0-BLOCKER-007` remains open and outside W2 scope.

## Testing and Evidence Strategy

### Minimal test plan if implementation scaffold is accepted

Use only fixture-based tests:

1. Registry completeness: all 11 captured P0 tools exist with exact W0 hashes.
2. Unsupported capability: `dry_run_transaction` is unsupported/absent with `W0-BLOCKER-009` and null hashes.
3. Known tool resolution: captured hash-compatible descriptors resolve to `visible` semantics.
4. Write-like defaults: `send_transaction`, `transfer_token`, `approve_token`, and `sign_typed_data` have `default_decision="block"` and required downstream evidence.
5. Schema drift: same tool name with changed/missing hash returns `SCHEMA_DRIFT`.
6. Unmapped tool: unknown tool returns `UNMAPPED_TOOL` before policy.
7. Private-key tools: known key-management names return `PRIVATE_KEY_MANAGEMENT_BLOCKED`.
8. Dangerous unknown write: `write_contract` or equivalent fixture returns `DANGEROUS_TOOL_BLOCKED`.
9. Filter output: visible output includes only registered, captured, hash-compatible tools.
10. Safe output: resolution results do not include secret-bearing values or raw unredacted dumps.

### No test runner caveat

Since no test runner is configured, tasks should choose one of:

- preferred: add minimal package-local `node:test` runner with no external dependencies;
- fallback: produce OpenSpec verification tables and machine-readable registry artifact without code tests.

### Evidence to record in apply

- Files added and their boundaries.
- Exact W0 manifest capture id and paths used.
- Test command, if added.
- Test output or manual fixture-review checklist.
- Explicit statement that no live Wallet Agent call, RPC call, secret read, or mutation occurred.

## Review Workload Forecast

| Area | Expected review risk | Notes |
| --- | --- | --- |
| Registry entries | High security criticality, medium line count | Repetitive data encodes safety decisions; review hashes/default decisions carefully. |
| Resolver/filter | High security criticality, low-to-medium line count | Review order: unsupported/private-key before policy; no name-only allow. |
| Fixtures/tests | Medium | Ensure fixtures are sanitized W0-derived and no live recapture happened. |
| Package/test scaffold | Medium | Keep no-dependency/minimal; avoid broad runtime project structure. |
| Runtime scope creep | High if present | Any MCP server/client, upstream lifecycle, forwarding, policy/risk/audit, or mutation is out of scope. |

Single PR remains acceptable if apply stays limited to this pure module plus tests/artifacts. If apply expands into MCP runtime, package-wide tooling, or policy/audit implementation, pause and re-scope before implementation.

## Rollback

- Remove `openspec/changes/wave-2-tool-semantics-registry-fixture-first/` artifacts if the design is rejected.
- If implementation scaffold is added, remove `packages/coding-agent/src/tool-semantics/**` and package-local tests.
- If W0 hashes are found stale, mark affected registry entries disabled until recapture and reviewed update.
- If Wave 1 becomes available before W2 apply, keep W2 pure unless the user explicitly approves expanding to runtime integration.

## Open Decisions for Tasks/Apply

1. Confirm whether to add the recommended minimal `packages/coding-agent` pure module/test scaffold or use OpenSpec-only fallback.
2. If package scaffold is accepted, choose TypeScript only if tooling already exists or is intentionally added; otherwise use JavaScript + `node:test` to minimize setup.
3. Decide whether to copy a minimal W0 fixture subset or exact sanitized fixtures into the test area.
4. Decide whether canonical hash recomputation is part of W2 apply or deferred to W1/W4; at minimum, W2 must compare W0 precomputed hashes and fail drift cases.

## Acceptance Mapping

This design satisfies the W2 accepted direction when future tasks/apply produce:

- deterministic registry entries from W0 evidence;
- pure resolver/filter behavior independent of Wave 1;
- explicit unsupported `dry_run_transaction` handling;
- default block/hidden behavior for unmapped/private-key/keystore/dangerous/schema-drifted tools;
- W3/W4 handoff fields and safe reason codes;
- no runtime MCP claims;
- no secrets, live calls, or mutations.
