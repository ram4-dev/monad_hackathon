# Tasks: Wave 3 Policy, Risk, and Audit Foundation

## Review Workload Forecast

| Field                   | Value                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estimated changed lines | 1,400–2,200 additions/deletions                                                                                                                                    |
| 400-line budget risk    | High                                                                                                                                                               |
| Chained PRs recommended | Yes                                                                                                                                                                |
| Suggested split         | PR 1 contract/Foundry → PR 2 policy-source client/config/snapshot → PR 3 decision/risk/safe-errors → PR 4 audit/evidence/runbook → PR 5 gated live deploy evidence |
| Delivery strategy       | ask-on-risk                                                                                                                                                        |
| Chain strategy          | pending                                                                                                                                                            |

Decision needed before apply: Resolved — user accepted single PR despite high review risk.
Chained PRs recommended: Yes
Chain strategy: single-pr-accepted
400-line budget risk: High

Single-PR default is risky: this change spans Solidity, Foundry, ABI artifacts, read-only RPC/ABI client behavior, policy/risk/safe-error logic, audit persistence, deployment evidence, and tests. If the user still chooses a single PR, keep the same slices as review sections/commits and require focused review for each boundary.

## Scope Guardrails

- Do not include, edit, import from, or depend on `packages/dashboard/` for Wave 3.
- Do not read secrets: no `.env`, private keys, keystore contents, password files, shell history, or secret-manager outputs.
- Do not run deployment commands during normal apply/verification. Live Monad Testnet deployment is a separate gated task requiring explicit user approval.
- Do not implement Wave 4 guarded forwarding, live Wallet Agent forwarding, user transaction signing/broadcasting, UI/manual approval, host no-bypass proof, mainnet, or multichain hardening.
- Preserve Wave 2 handoff: consume `packages/coding-agent/src/tool-semantics/*` resolver outputs and never reclassify unknown/unmapped/unsupported/schema-drifted/private-key/dangerous tools in W3.
- Local fixtures are mocks/snapshots only; they are never runtime policy authority.

## Implementation Tasks

### 0. Pre-apply confirmations and docs refresh

- [x] 0.1 Confirm delivery shape before coding because forecast is High and chained PRs are recommended despite single-PR default.
  - Files/targets: this `tasks.md`, parent/user delivery decision.
  - Verification: decision recorded before `sdd-apply` starts.
  - Rollback: keep planning artifacts only; no code changes.
- [x] 0.2 Refresh Monad official docs before implementing Monad-specific code/config/docs.
  - Files/targets: cite in `packages/coding-agent/contracts/README.md` and deployment evidence/runbook.
  - Required docs: `https://docs.monad.xyz/llms.txt`, `https://docs.monad.xyz/developer-essentials/testnets.md`, `https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md`, `https://docs.monad.xyz/developer-essentials/differences.md`.
  - Verification: implementation notes/runbook cite exact URLs; pause for ADR/constitution update if docs conflict with `docs/constitution.md`.

### 1. Contract slice: immutable on-chain policy source

- [x] 1.1 RED: add Foundry contract tests for `CompassPolicy` before Solidity implementation.
  - Files: `packages/coding-agent/contracts/test/CompassPolicy.t.sol`, `packages/coding-agent/contracts/foundry.toml`.
  - Cover: constructor identity on chain `10143` where mocked/possible, owner-only updates, unauthorized rejection, version increments, `PolicyUpdated`/`PolicyFrozen`/ownership events, freeze/unfreeze, bounds, duplicate rejection, zero-address rejection, pagination, invariant flags.
  - Verification: `cd packages/coding-agent/contracts && forge test` fails for missing/incomplete contract; if Foundry is unavailable, record `forge --version` unavailable in evidence and continue with Node tasks only.
- [x] 1.2 GREEN: implement package-local immutable policy contract.
  - Files: `packages/coding-agent/contracts/src/CompassPolicy.sol`.
  - Include: schema constant `keccak256("compass.policy.v1")`, `deploymentChainId`, owner model, `PolicyCaps`, `PolicyFlags`, bounded arrays/mappings, paginated getters, `updatePolicy`, `setFrozen`, ownership transfer, validation.
  - Verification: `cd packages/coding-agent/contracts && forge test` passes locally when Foundry is available.
- [x] 1.3 TRIANGULATE: add deploy/read/update helper scripts without executing live deploy.
  - Files: `packages/coding-agent/contracts/script/DeployCompassPolicy.s.sol`, `UpdateCompassPolicy.s.sol`, `ReadCompassPolicy.s.sol`.
  - Requirements: placeholders only for RPC/account inputs; no private-key flags in committed examples; scripts must verify chain id before broadcast/read.
  - Verification: `cd packages/coding-agent/contracts && forge build` succeeds when Foundry is available; no broadcast artifacts committed.
- [x] 1.4 REFACTOR/HANDOFF: commit ABI fragment for JS read client.
  - Files: `packages/coding-agent/src/policy-source/compassPolicyAbi.js`.
  - Verification: ABI includes only required read/write/event fragments from design; JS tests import it without requiring Foundry outputs.

### 2. Policy source config, read client, snapshot, and cache slice

- [x] 2.1 RED: add config and snapshot validation tests.
  - Files: `packages/coding-agent/test/policy-source/policySourceConfig.test.js`, `policySnapshot.test.js`, fixtures under `packages/coding-agent/test/policy-source/fixtures/`.
  - Cover: malformed/missing address/RPC/chain, schema id mismatch, unsupported version, frozen policy, invalid flags, duplicate/over-bound lists, decimal-string BigInt normalization.
  - Verification: `cd packages/coding-agent && npm test` fails until modules exist.
- [x] 2.2 RED: add mocked read-only ABI client tests.
  - Files: `packages/coding-agent/test/policy-source/policyContractClient.test.js`.
  - Cover: success path, `eth_chainId` mismatch, empty code/stale address, RPC timeout/error, ABI decode failure, pagination across page size 64, fallback endpoint ordering, no wallet/signer/private-key utilities.
  - Verification: `cd packages/coding-agent && npm test` fails until client exists.
- [x] 2.3 GREEN: implement policy source config and safe source errors.
  - Files: `packages/coding-agent/src/policy-source/policySourceConfig.js`, `policySourceErrors.js`, `index.js`.
  - Requirements: config source order from design; no hardcoded runtime RPC default; safe errors redact RPC URLs and env values.
  - Verification: config tests pass.
- [x] 2.4 GREEN: implement read-only policy contract client behind a mockable transport.
  - Files: `packages/coding-agent/src/policy-source/policyContractClient.js`.
  - Dependency decision target: decide whether to add `viem` to `packages/coding-agent/package.json` or keep transport-only implementation for W3.
  - Verification: mocked client tests pass; no real Monad RPC calls in unit tests.
- [x] 2.5 GREEN: implement snapshot normalization/validation and optional fresh-cache helper.
  - Files: `packages/coding-agent/src/policy-source/policySnapshot.js`, `policyCache.js`.
  - Requirements: default `cache_ttl_ms=0`; stale cache never used; in-memory only if enabled; fail closed on invalid snapshot.
  - Verification: snapshot/cache tests pass with mocked time.

### 3. Policy decision, tool keys, risk, and safe-denial slice

- [x] 3.1 RED: add deterministic tool-key and W2 handoff tests.
  - Files: `packages/coding-agent/test/policy/policyToolKeys.test.js`, `evaluatePolicy.test.js`.
  - Cover: `keccak256(utf8(tool_name))` snapshots for all W2 P0 tools, W2 `status !== visible` preserved before policy, no policy rescue for `UNMAPPED_TOOL`, `UNSUPPORTED_TOOL`, `PRIVATE_KEY_MANAGEMENT_BLOCKED`, `DANGEROUS_TOOL_BLOCKED`, `SCHEMA_DRIFT`.
  - Verification: `cd packages/coding-agent && npm test` fails until policy modules exist.
- [x] 3.2 RED: add risk and safe-error tests.
  - Files: `packages/coding-agent/test/risk/riskChecks.test.js`, `packages/coding-agent/test/safe-errors/safeError.test.js`.
  - Cover: policy-source failures, wrong chain, missing W2 evidence, non-allowlisted tool/recipient/token/spender, over-cap amount/gas, unlimited approval, simulation unavailable/failed, opaque signature/typed-data mismatch, deterministic reason codes and redaction.
  - Verification: tests fail until modules exist.
- [x] 3.3 GREEN: implement policy decision shape and evaluator.
  - Files: `packages/coding-agent/src/policy/policyDecision.js`, `policyToolKeys.js`, `evaluatePolicy.js`, `index.js`.
  - Requirements: return only `allow|block`; include safe reason code, policy id/version, content hash/source metadata when available; no forwarding/signing/broadcasting.
  - Verification: policy tests pass.
- [x] 3.4 GREEN: implement deterministic risk checks.
  - Files: `packages/coding-agent/src/risk/riskTypes.js`, `riskChecks.js`, `policySourceRisk.js`, `index.js`.
  - Requirements: pure functions over W2 result + validated snapshot/source failure + evidence; critical/high blocking findings per design.
  - Verification: risk tests pass.
- [x] 3.5 GREEN: implement safe error and redaction utilities.
  - Files: `packages/coding-agent/src/safe-errors/safeError.js`, `redact.js`, `index.js`.
  - Requirements: stable codes for all W3 policy-source/policy/risk failures; exclude raw RPC payloads, stack traces, secrets, full ABI blobs, unredacted args.
  - Verification: safe-error tests pass.

### 4. Audit and evidence/runbook slice

- [x] 4.1 RED: add audit writer/redaction tests.
  - Files: `packages/coding-agent/test/audit/auditWriter.test.js`, `auditRedaction.test.js`.
  - Cover: append-only JSONL order, metadata allowlists for `policy_source_read`, `policy_source_read_failed`, `policy_snapshot_validated`, `risk_scored`, `policy_evaluated`, `tool_call_blocked`, `policy_update_observed`, secret/RPC/stack redaction, audit-write failure causes fail-closed for policy-gated calls.
  - Verification: `cd packages/coding-agent && npm test` fails until audit modules exist.
- [x] 4.2 GREEN: implement audit event builders, redaction, and append-only writer.
  - Files: `packages/coding-agent/src/audit/auditEvent.js`, `auditRedaction.js`, `auditWriter.js`, `index.js`.
  - Requirements: no raw RPC URLs/API keys/provider dumps/full ABI/secret values; include policy id/version/contract/content hash where available.
  - Verification: audit tests pass; policy evaluator tests cover `AUDIT_WRITE_FAILED` block behavior if evaluator writes audit directly.
- [x] 4.3 Add deployment evidence schema/example and non-secret current handoff placeholder.
  - Files: `packages/coding-agent/deployments/monad-testnet/compass-policy.example.json`, optional `compass-policy.current.json` only after approved deployment, `openspec/changes/wave-3-policy-risk-audit-foundation/evidence/deployments/monad-testnet/.gitkeep`.
  - Verification: JSON parses; example uses zero/placeholder addresses and no secrets.
- [x] 4.4 Add contract/deployment runbook.
  - Files: `packages/coding-agent/contracts/README.md`.
  - Include: Monad docs citations, Foundry install/build/test commands, secret-safe keystore/account flow, deploy command templates with placeholders, verification evidence checklist, testnet reset/redeploy procedure, forbidden secret handling.
  - Verification: runbook contains no private-key examples or secret-bearing env dumps.

### 5. Gated live Monad Testnet deployment evidence slice

- [ ] 5.1 GATED / NOT RUN: obtain explicit user approval before any live deploy.
  - Files/targets: parent/user approval record; no repo files changed before approval except runbook/evidence templates.
  - Approval must specify: owner public address, initial caps, allowed tool list, recipients, tokens, spender limits, typed-data rules, content hash/manifest, RPC endpoint source, explorer/verification target.
  - Secret protocol: operator uses Foundry keystore/account or prompt-based secure signer outside repo; task executor must not read `.env`, private keys, keystores, or secret-manager outputs.
  - Verification: without approval, mark live deployment `not_run` and do not create real deployment evidence. Apply result: no live deployment approval/parameters were provided, so no deploy or broadcast command was run.
- [ ] 5.2 GATED / NOT RUN after approval only: run secret-safe deploy and verification flow, then capture sanitized evidence.
  - Files: `openspec/changes/wave-3-policy-risk-audit-foundation/evidence/deployments/monad-testnet/YYYYMMDDTHHMMSSZ-compass-policy.json`, `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json`.
  - Commands: use runbook templates; never include `--private-key` values or secret env values in artifacts; verify `eth_chainId == 0x279f` before broadcast.
  - Verification: evidence includes address, tx hash, block, ABI/source hashes, owner public address, policy identity, post-deploy read checks, verification reference/status, and safety booleans all without secrets.
  - Rollback: if deploy fails or evidence cannot be sanitized, do not update `compass-policy.current.json`; retain only a redacted failure note if safe. Apply result: not run; no real deployment evidence or current deployment artifact created.

### 6. Final verification and review readiness

- [x] 6.1 Run package tests.
  - Command: `cd packages/coding-agent && npm test`.
  - Expected: all Node `node:test` suites pass; no unit test calls real Monad RPC or reads secrets.
- [x] 6.2 Run Solidity tests/build when Foundry is available.
  - Commands: `cd packages/coding-agent/contracts && forge test`; optionally `forge build`.
  - Fallback: if Foundry is unavailable, record toolchain-unavailable status in `openspec/changes/wave-3-policy-risk-audit-foundation/evidence/verification/forge-toolchain-unavailable.txt` and do not claim contract tests passed.
- [x] 6.3 Validate OpenSpec artifacts when CLI is available.
  - Command: `openspec validate wave-3-policy-risk-audit-foundation --strict`.
  - Fallback: manually review `proposal.md`, `design.md`, `specs/**/spec.md`, and this `tasks.md` against `openspec/config.yaml` and record findings in `evidence/verification/manual-openspec-review.txt`.
- [x] 6.4 Produce review evidence.
  - Files: `openspec/changes/wave-3-policy-risk-audit-foundation/evidence/verification/package-test-output.txt`, `forge-test-output.txt` when available, optional deploy evidence only from gated task.
  - Verification: artifacts contain command summaries/output without secrets, raw RPC URLs, private keys, keystore contents, or stack traces with sensitive data.
- [x] 6.5 Review non-goals before handoff to W4.
  - Targets: changed files under `packages/coding-agent/` and `openspec/changes/wave-3-policy-risk-audit-foundation/` only; explicitly exclude `packages/dashboard/`.
  - Verification: no W4 forwarding, Wallet Agent calls, signing, user broadcast, UI approval, mainnet/multichain behavior, or host no-bypass proof added in W3.
