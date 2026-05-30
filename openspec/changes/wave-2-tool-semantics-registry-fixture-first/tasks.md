# Tasks: W2 Tool Semantics Registry — Fixture-First

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-950 if minimal package/test scaffold is added; 180-300 if fallback OpenSpec artifacts only |
| 400-line budget risk | High |
| Chained PRs recommended | Yes originally; overridden by approved size-exception single PR |
| Suggested split | PR 1: package/test scaffold + W0 fixtures + registry data → PR 2: resolver/filter behavior + tests + apply evidence (not used after size-exception approval) |
| Delivery strategy | size-exception single PR (user/parent approved before apply) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

Reason: the accepted Wave 2 end state is still pure and bounded, but the full implementation includes security-critical registry data for 11 tools, fixtures, resolver/filter logic, tests, package scaffolding, and evidence updates. User preference is single PR by default with no fixed line cap; the parent/user resolved the High 400-line forecast as a size-exception single PR for apply. Keep review risk flagged.

## Scope Guardrails

- Do not implement Wave 1: no `compass-proxy`, MCP server/client transport, upstream lifecycle, host config, runtime `tools/list`, runtime `tools/call`, forwarding, policy/risk/audit, digest, idempotency, or no-bypass proof.
- Do not call live Wallet Agent: no `bunx wallet-agent@latest`, MCP `initialize`, `tools/list`, or `tools/call` during W2 apply.
- Do not call Monad RPC, mutate chain state, sign, approve, broadcast, transfer, or write.
- Do not read `.env`, private keys, host MCP configs, tokens, credentials, secret manager output, or unredacted local config.
- Use only W0 sanitized evidence under `openspec/changes/wave-0-upstream-monad-poc/evidence/**` plus W2 specs/design.

## Implementation Tasks

### 0. Pre-apply decision gate

- [x] Confirm delivery decision for the High 400-line budget risk recorded above before code apply.
  - Start: `openspec/changes/wave-2-tool-semantics-registry-fixture-first/tasks.md` forecast is reviewed.
  - Finish: parent/user chooses either `size-exception` single PR or chained PRs.
  - Verification: `apply-progress.md` records the chosen delivery strategy.
  - Rollback: no repo changes beyond SDD artifacts.

### 1. Pre-apply repo structure check

- [x] Inspect only non-secret structure targets before implementation: root `package.json`, `packages/**/package.json`, existing `packages/`, `src/`, `test/`, `tests/`, and current Node availability.
  - Start: no implementation files have been created.
  - Finish: choose one of the paths below and record the choice in `openspec/changes/wave-2-tool-semantics-registry-fixture-first/apply-progress.md`.
  - Preferred path: minimal JavaScript + `node:test` package under `packages/coding-agent/` with no external dependencies.
  - Fallback path: if package scaffolding would force broad repo/tooling changes, create machine-readable artifacts under `openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/` instead.
  - Verification: selected paths are listed before edits; no secret-bearing files are opened.
  - Rollback: remove only the new W2 package/artifacts paths.

### 2. RED — package-local tests and W0 fixture subset

- [x] If the preferred path is feasible, create minimal test scaffold and failing tests before registry/resolver implementation:
  - `packages/coding-agent/package.json` with a package-local `test` script using Node built-in test runner only, for example `node --test test/**/*.test.js`.
  - `packages/coding-agent/test/tool-semantics/fixtures/w0-schema-hash-manifest.fixture.json` copied or minimally derived from `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`.
  - `packages/coding-agent/test/tool-semantics/fixtures/wallet-agent-tools-list.w0.fixture.json` copied or minimally derived from `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json` with only sanitized descriptor/hash fields needed for tests.
  - `packages/coding-agent/test/tool-semantics/fixtures/drifted-tools.fixture.json` with synthetic changed/missing `input_schema_hash` cases.
  - `packages/coding-agent/test/tool-semantics/fixtures/blocked-tools.fixture.json` with sanitized names for `import_private_key`, `create_encrypted_keystore`, `unlock_keystore`, `import_encrypted_private_key`, `remove_private_key`, `write_contract`, and an unmapped benign unknown.
  - `packages/coding-agent/test/tool-semantics/registry.test.js` asserting registry completeness, exact W0 hashes, required fields, write-like default block, and unsupported `dry_run_transaction` null hashes/blocker.
  - `packages/coding-agent/test/tool-semantics/resolver.test.js` asserting known tool visibility, unmapped/private-key/dangerous/schema-drift/dry-run safe reason handling, and visible filtering output.
- [x] Run the package test command and record the expected RED failure due missing implementation modules.
  - Verification: failure is limited to missing `src/tool-semantics/**` exports, not syntax or fixture errors.
  - Rollback: delete `packages/coding-agent/package.json` and `packages/coding-agent/test/tool-semantics/**`.

### 3. GREEN — define pure ToolSemantics types and registry data

- [x] Implement pure JSDoc/JavaScript type boundaries without TypeScript build tooling unless the repo structure check proves TypeScript already exists:
  - `packages/coding-agent/src/tool-semantics/types.js` for documented `ToolClass`, `ToolSemantics`, `UnsupportedCapability`, `ResolutionResult`, and safe reason code shapes.
  - `packages/coding-agent/src/tool-semantics/walletAgentRegistry.js` with exactly 11 W0-captured P0 tools: `add_custom_chain`, `switch_chain`, `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction`, `send_transaction`, `transfer_token`, `approve_token`, `sign_typed_data`.
  - `packages/coding-agent/src/tool-semantics/unsupportedCapabilities.js` with `dry_run_transaction` as `status="absent"`, `safe_reason_code="UNSUPPORTED_TOOL"`, `blocker_ids=["W0-BLOCKER-009"]`, and both schema hashes `null`.
  - `packages/coding-agent/src/tool-semantics/index.js` exporting registry/resolver public API.
- [x] Copy exact W0 `input_schema_hash` and `upstream_schema_hash` values from `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`; do not invent hashes for absent tools.
- [x] Preserve W0 lineage through `evidence_refs` pointing to W0 manifest, W0 sanitized tools list, and the relevant `evidence/upstream/tools/<tool>.schema.json` path.
  - Verification: `registry.test.js` passes registry data assertions.
  - Rollback: remove `packages/coding-agent/src/tool-semantics/types.js`, `walletAgentRegistry.js`, `unsupportedCapabilities.js`, and `index.js`.

### 4. GREEN — implement pure resolver/filter behavior

- [x] Implement `packages/coding-agent/src/tool-semantics/blockedToolRules.js` with deterministic block-only detection for:
  - exact private-key/keystore names: `import_private_key`, `create_encrypted_keystore`, `unlock_keystore`, `import_encrypted_private_key`, `remove_private_key`;
  - key-material indicators such as `privateKey`, `keystore`, `unlock`, import/export/remove private key terms;
  - dangerous/write-like unmapped tools such as `write_contract`, raw send/sign names, NFT transfers, Hyperliquid import/order/cancel/transfer names, or future unknown write indicators.
- [x] Implement `packages/coding-agent/src/tool-semantics/resolver.js` with pure functions:
  - `getToolSemantics(toolName)`;
  - `getUnsupportedCapability(toolName)`;
  - `resolveToolDescriptor(descriptorOrFixture)`;
  - `resolveCallByName(toolName, inputSchemaHash)`;
  - `filterVisibleTools(descriptorsOrFixtures)`.
- [x] Enforce resolution order: unsupported capability → private-key/keystore block → exact registry lookup → unmapped/dangerous block → exact `input_schema_hash` match → `SCHEMA_DRIFT` for mismatch/missing hash → visible result.
- [x] Ensure visible result means only registered and schema-compatible, not policy-allowed or forwardable.
  - Verification: `resolver.test.js` passes known, blocked, drift, unsupported, and filter cases.
  - Rollback: remove `blockedToolRules.js` and `resolver.js`.

### 5. TRIANGULATE — add edge cases without expanding scope

- [x] Extend `registry.test.js` and/or `resolver.test.js` to cover all 11 mapped tools and at least these safe reason codes: `UNMAPPED_TOOL`, `UNSUPPORTED_TOOL`, `PRIVATE_KEY_MANAGEMENT_BLOCKED`, `DANGEROUS_TOOL_BLOCKED`, `SCHEMA_DRIFT`.
- [x] Assert `send_transaction`, `transfer_token`, `approve_token`, and `sign_typed_data` have `default_decision="block"`, `requires_simulation=true`, and downstream evidence/policy check names for simulation, digest/policy, and idempotency where applicable.
- [x] Assert `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, and `simulate_transaction` remain read/simulation class with `state_effect="none"` and do not imply forwarding.
- [x] Assert `add_custom_chain` and `switch_chain` are `chain_management`, `state_effect="local_chain_config"`, and default block until W3/W4 enforce Monad Testnet allowlist evidence.
  - Verification: package-local tests pass without network/subprocesses/env reads.
  - Rollback: remove only the triangulation cases if they reveal a spec ambiguity that requires a new design decision.

### 6. REFACTOR — minimize public API and keep fixture-first boundary

- [x] Review `packages/coding-agent/src/tool-semantics/**` for accidental runtime scope creep.
  - Must not import MCP SDK, Wallet Agent, RPC clients, filesystem secret paths, environment values, policy/risk/audit modules, digest/idempotency code, or subprocess helpers.
  - Must not compute allow/block policy decisions beyond registry visibility and safe reason codes.
- [x] Keep fixtures sanitized and W0-derived; remove any unused raw descriptors or natural-language fields not needed by tests.
- [x] If a canonical hash helper is added, keep it pure and fixture-only; otherwise explicitly record that W2 compares W0 precomputed hashes and defers recomputation to a later reviewed change.
  - Verification: code review can trace every exported behavior to W2 specs/design and W0 evidence.
  - Rollback: revert refactor changes without changing registry semantics.

### 7. Fallback path if package scaffold is too broad

- [ ] If Task 1 selects fallback instead of package code, create these artifacts and skip Tasks 2-6:
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/tool-semantics-registry.wallet-agent.v1.json` with the 11 W0-captured registry entries and unsupported `dry_run_transaction` metadata.
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/resolver-contract.md` documenting pure resolution order and safe reason codes.
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/fixture-compatibility-matrix.md` mapping W0 fixtures/hashes to registry decisions and drift behavior.
- [ ] Record in `apply-progress.md` that fallback is weaker than code/tests and should be converted before W3/W4 implementation.
  - Verification: manual checklist covers all W2 specs.
  - Rollback: remove `openspec/changes/wave-2-tool-semantics-registry-fixture-first/artifacts/**`.

### 8. Evidence and apply-progress recording

- [x] Create/update `openspec/changes/wave-2-tool-semantics-registry-fixture-first/apply-progress.md` with:
  - chosen delivery strategy and whether 400-line size exception or chained split was accepted;
  - selected implementation path: package scaffold or fallback artifacts;
  - exact files added/changed;
  - exact W0 source paths and capture id `w0-wallet-agent-debug-20260530T160836Z`;
  - test command and output if package tests exist;
  - manual fixture-review checklist if fallback artifacts are used;
  - explicit statement that no live Wallet Agent call, Monad RPC call, secret read, host config read, mutation, signing, approval, transfer, broadcast, or write occurred.
- [x] Include known open blockers that remain outside W2 scope:
  - `W0-BLOCKER-007` host no-bypass proof remains W6/demo readiness;
  - `W0-BLOCKER-009` `dry_run_transaction` remains absent/unsupported;
  - runtime host-visible `tools/list` proof remains W1/W4.
  - Verification: apply-progress is enough for a reviewer to reproduce W2's source evidence and boundaries.
  - Rollback: revert only the apply-progress update.

### 9. Verification handoff

- [x] Run/package-test verification if preferred path was used: `cd packages/coding-agent && npm test`.
- [ ] Run manual artifact verification if fallback path was used against: *(not selected; package-local tests used)*
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-registry/spec.md`;
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-resolution/spec.md`;
  - `openspec/changes/wave-2-tool-semantics-registry-fixture-first/specs/tool-semantics-handoff/spec.md`.
- [ ] Record verification output and remaining risks in a future `openspec/changes/wave-2-tool-semantics-registry-fixture-first/verify.md` or `verify-report.md` during the verify phase.
  - Verification: W3/W4 can consume stable registry classes, state effects, evidence requirements, policy check names, schema hashes, unsupported capability metadata, and safe reason codes.
  - Rollback: no code rollback required; verification artifacts can be updated independently.

## Acceptance Checklist

- [x] Wave 1 remains unavailable and out of scope; no runtime MCP/proxy behavior is implemented.
- [x] The 11 W0-captured P0 tools have registry entries with exact W0 hashes.
- [x] `dry_run_transaction` is unsupported/absent with `W0-BLOCKER-009` and null hashes.
- [x] Unknown, unmapped, private-key/keystore, dangerous, and schema-drifted tools hide/block before policy.
- [x] Resolver/filter is pure and fixture-testable with no network, subprocess, env, secret, or filesystem secret dependency.
- [x] Tests or fallback verification prove drift handling and safe reason codes.
- [x] `apply-progress.md` records evidence, commands, non-mutation/secret boundaries, and remaining blockers.
- [x] Runtime `tools/list` filtering proof is explicitly deferred to W1/W4 and not claimed by W2.
