# Apply Progress: W2 Tool Semantics Registry — Fixture-First

## Status

`applied`

Wave 2 was applied as a pure fixture-first Tool Semantics Registry module plus package-local `node:test` coverage. Wave 1 remains unavailable and out of scope.

## Delivery / Workload Boundary

| Field | Value |
| --- | --- |
| Delivery strategy | Size-exception single PR |
| Gate resolution | Parent/user resolved the `tasks.md` high 400-line budget risk before apply |
| Chained PRs | Not used for this apply |
| Review risk | High security criticality; review registry hashes/default decisions, resolver order, and no runtime scope creep |
| Approximate W2 package line count | ~815 lines across package source/tests/fixtures |

## Implementation Path

Selected path: **minimal pure JavaScript + Node built-in `node:test` package under `packages/coding-agent/`**.

Fallback OpenSpec-only artifacts were not used because the package-local scaffold was feasible without root package/tooling changes or external dependencies.

## W0 Evidence Sources Used

- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/schema-hash-manifest.json`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/wallet-agent-tools-list.sanitized.json`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/registry-readiness.md`
- `openspec/changes/wave-0-upstream-monad-poc/evidence/upstream/tools/*.schema.json`

Capture id: `w0-wallet-agent-debug-20260530T160836Z`.

Official Monad docs consulted per project skill:

- `https://docs.monad.xyz/llms.txt`
- `https://docs.monad.xyz/developer-essentials/testnets.md`
- `https://docs.monad.xyz/developer-essentials/wallet-developers.md`

No new Monad chain/RPC/gas behavior was introduced; W2 only records downstream evidence/policy names and uses W0 evidence.

## Files Changed

### OpenSpec / SDD

- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/tasks.md`
  - Recorded size-exception single-PR gate resolution.
  - Checked off completed apply tasks and acceptance checklist items.
- `openspec/changes/wave-2-tool-semantics-registry-fixture-first/apply-progress.md`
  - This cumulative apply evidence file.

### Package scaffold

- `packages/coding-agent/package.json`
  - Minimal package-local `npm test` script: `node --test test/**/*.test.js`.

### Pure registry/resolver implementation

- `packages/coding-agent/src/tool-semantics/types.js`
- `packages/coding-agent/src/tool-semantics/walletAgentRegistry.js`
- `packages/coding-agent/src/tool-semantics/unsupportedCapabilities.js`
- `packages/coding-agent/src/tool-semantics/blockedToolRules.js`
- `packages/coding-agent/src/tool-semantics/resolver.js`
- `packages/coding-agent/src/tool-semantics/index.js`

### Fixture-first tests

- `packages/coding-agent/test/tool-semantics/fixtures/w0-schema-hash-manifest.fixture.json`
- `packages/coding-agent/test/tool-semantics/fixtures/wallet-agent-tools-list.w0.fixture.json`
- `packages/coding-agent/test/tool-semantics/fixtures/drifted-tools.fixture.json`
- `packages/coding-agent/test/tool-semantics/fixtures/blocked-tools.fixture.json`
- `packages/coding-agent/test/tool-semantics/registry.test.js`
- `packages/coding-agent/test/tool-semantics/resolver.test.js`

## Completed Tasks

- Resolved apply delivery gate as size-exception single PR.
- Performed pre-apply repo structure check without reading secrets/host configs.
- Added package-local RED tests before implementation.
- Implemented deterministic registry entries for exactly 11 W0-captured P0 tools:
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
- Copied exact W0 `input_schema_hash` and `upstream_schema_hash` values into registry entries.
- Added unsupported `dry_run_transaction` metadata with `W0-BLOCKER-009` and null hashes.
- Added deterministic private-key/keystore/dangerous/unmapped block rules.
- Added pure resolver/filter functions:
  - `getToolSemantics`
  - `getUnsupportedCapability`
  - `resolveToolDescriptor`
  - `resolveCallByName`
  - `filterVisibleTools`
- Triangulated tests for all required safe reason codes:
  - `UNMAPPED_TOOL`
  - `UNSUPPORTED_TOOL`
  - `PRIVATE_KEY_MANAGEMENT_BLOCKED`
  - `DANGEROUS_TOOL_BLOCKED`
  - `SCHEMA_DRIFT`
- Refactored boundary to keep code pure: no network, subprocess, MCP SDK, Wallet Agent runtime, RPC client, policy/risk/audit, digest/idempotency, environment, or filesystem secret dependency.

## TDD / Test Evidence

Strict TDD is not active (`openspec/config.yaml` has `strict_tdd: false` and no global test runner), but W2 used the task plan's RED → GREEN → TRIANGULATE → REFACTOR evidence with package-local `node:test`.

| Cycle | Command | Result | Evidence |
| --- | --- | --- | --- |
| RED | `cd packages/coding-agent && npm test` | Failed as expected | `MODULE_NOT_FOUND: Cannot find module '../../src/tool-semantics'`; failure limited to missing implementation exports after tests/fixtures were created. |
| GREEN | `cd packages/coding-agent && npm test` | Passed | 11/11 tests passed after pure registry/resolver implementation. |
| TRIANGULATE | `cd packages/coding-agent && npm test` | Passed | Tests cover all 11 mapped tools, write-like default block, read/simulation no-state semantics, chain-management default block, unsupported dry-run, schema drift, private-key/keystore block, dangerous/unmapped tools, and visible filtering. |
| REFACTOR | `cd packages/coding-agent && npm test && cd ../.. && git diff --check -- packages/coding-agent openspec/changes/wave-2-tool-semantics-registry-fixture-first` | Passed | 11/11 tests passed; `git diff --check` reported no whitespace errors. |

Latest test output summary:

```text
✔ registry maps exactly the 11 W0-captured P0 tools with exact hashes
✔ write-like tools default block and require downstream evidence before forwarding
✔ read and simulation tools keep no state-effect semantics and do not imply forwarding
✔ chain management entries default block until allowlist evidence exists downstream
✔ dry_run_transaction is unsupported with W0-BLOCKER-009 and no fake hashes
✔ known W0 captured tools resolve visible only when schema-compatible
✔ schema drift and missing hashes disable captured tools before policy
✔ private-key and keystore tools are blocked before policy
✔ dangerous and unmapped tools return safe block reason codes
✔ dry_run_transaction resolves unsupported before policy with blocker metadata
✔ filterVisibleTools returns only registered schema-compatible tools
ℹ tests 11
ℹ pass 11
ℹ fail 0
```

Note: `npm` printed a local config warning: `Unknown user config "always-auth"`. Tests still passed; this warning did not require reading config contents.

## Boundary / Safety Statements

During W2 apply:

- No live Wallet Agent command was run.
- No `bunx wallet-agent@latest` was run.
- No MCP `initialize`, `tools/list`, or `tools/call` was run.
- No Monad RPC call was made.
- No `.env`, private key, token, credential, secret manager output, or unredacted host config was read.
- No host MCP config was read.
- No chain mutation, signing, approval, transfer, broadcast, contract write, or external state change was performed.
- No Wave 1 runtime was implemented: no `compass-proxy`, MCP server/client, upstream lifecycle, host wiring, runtime forwarding, policy/risk/audit engine, digest, idempotency, or no-bypass proof.

## Deviations from Design

- Implemented JavaScript/CommonJS rather than TypeScript to avoid adding TypeScript tooling.
- Did not add a canonical hash recomputation helper. W2 compares W0 precomputed `input_schema_hash` values and disables mismatches/missing hashes. Hash recomputation can be added later through a reviewed change if needed.
- Copied a minimized W0-derived fixture subset for tests rather than full raw descriptors. This keeps tests sanitized and small while preserving manifest/tool-list lineage.

## Remaining Tasks / Deferred Work

- Run formal SDD verify and record a future `verify.md` or `verify-report.md`.
- `W0-BLOCKER-007` host no-bypass proof remains outside W2 and is still a W6/demo-readiness dependency.
- `W0-BLOCKER-009` remains open: `dry_run_transaction` is absent/unsupported until a future pinned upstream capture proves it exists with real hashes.
- Runtime host-visible `tools/list` filtering proof remains deferred to W1/W4.
- W3 must still implement policy/risk/audit over these semantics.
- W4 must still implement guarded forwarding, required evidence validation, digest/idempotency, audit, and actual upstream forwarding.

## Rollback

- Remove `packages/coding-agent/` to drop the W2 implementation/test scaffold.
- Revert `openspec/changes/wave-2-tool-semantics-registry-fixture-first/tasks.md` and this `apply-progress.md` if the apply direction changes.
