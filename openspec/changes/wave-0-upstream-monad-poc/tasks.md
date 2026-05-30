# Tasks: W0 Upstream + Monad PoC

W0 is an evidence-gathering change. Use standard evidence mode (`strict_tdd: false`); do not add Compass runtime/source-code implementation, do not require external state mutation, and do not treat missing evidence as success unless a blocker is recorded.

## Review Workload Forecast

| Field                   | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| Estimated changed lines | ~250-700 evidence/docs lines; application code expected: 0               |
| 400-line budget risk    | Medium                                                                   |
| Chained PRs recommended | No                                                                       |
| Suggested split         | Single W0 evidence PR: scaffold -> captures -> blockers -> verify report |
| Delivery strategy       | single-pr                                                                |
| Chain strategy          | pending                                                                  |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

**Apply recommendation:** a single W0 evidence change is acceptable. Warn reviewers that W0 has **high external-integration risk** because it depends on Wallet Agent, Monad Testnet RPC behavior, safe account availability, and sanitization discipline even when the file diff is small.

## Global Safety and Stop Gates

- [x] Do not read `.env`, shell history, private keys, seed phrases, tokens, credentials, delegated payloads, secret-manager output, or credential-bearing host config.
- [x] Do not persist raw secret-bearing RPC URLs, local wallet paths, account credentials, stack traces with secrets, or unsanitized command transcripts.
- [x] Do not implement Compass proxy/runtime, registry, policy, digest, audit, wallet, or host MCP configuration code in W0.
- [x] Do not call private-key, keystore, raw-signing, raw-send, transfer, approval, broadcast, signature, or write tools unless routed through the explicit W0 consent gate.
- [x] Stop and record a blocker if Monad evidence points to any chain other than Monad Testnet `chain_id=10143` for P0 validation.
- [x] Stop and raise an ADR/update need if current official Monad docs conflict with `docs/constitution.md`.
- [x] If accidental sensitive data is captured, discard the artifact, record only a safe blocker/incident note, and do not continue using that evidence.

## Tasks

Completion status is recorded in each task heading and in the evidence/verify reports. Nested checkboxes remain the original planned substep checklist; they intentionally stay unchecked when the substep was skipped, blocked, or satisfied by a blocker/evidence reference rather than a live upstream success.

### 1. [x] Artifact scaffold

**Files/targets:**
`openspec/changes/wave-0-upstream-monad-poc/evidence/README.md`, `evidence/manifest.json`, `evidence/commands/safe-command-log.md`, `evidence/contracts/*.schema.json`, and directories from `openspec/changes/wave-0-upstream-monad-poc/design.md`.

**Steps:**

- [ ] Create the W0 evidence directory tree exactly under `openspec/changes/wave-0-upstream-monad-poc/evidence/`.
- [ ] Initialize `manifest.json` with `schema_version`, `capture_id`, `captured_at`, sanitization policy, source docs list, and placeholder evidence refs.
- [ ] Initialize append-only placeholders: `consent/mutation-consent-records.jsonl`, `consent/mutation-skips.jsonl`, and `blockers/blocker-register.jsonl`.
- [ ] Add minimal contract schemas/placeholders for tool schema fixtures, schema hash manifest, chain validation, RPC provider evidence, read evidence, simulation evidence, consent records, blocker entries, and host no-bypass evidence.

**Acceptance evidence:**

- [ ] `evidence/README.md` explains W0 scope, safety boundaries, and artifact map.
- [ ] `manifest.json` identifies the evidence package and states `secret_sources_read: false`.
- [ ] Empty/placeholder artifacts use explicit `status: "pending"`, `"skipped"`, or `"unavailable"`; no silent success.

**Commands/evidence placeholders:**

- [ ] Record only safe command templates in `evidence/commands/safe-command-log.md`; do not store raw terminal transcripts before sanitization.

**Stop gate:** If scaffold work would touch application source code or secret-bearing local files, stop and record a blocker.

**Rollback boundary:** Delete `evidence/` scaffold files before any external capture if the layout is wrong or contains unsafe content.

### 2. [x] Official docs, RPC citations, and provider evidence

**Files/targets:**
`evidence/README.md`, `evidence/rpc/provider-evidence.md`, `evidence/rpc/provider-behavior.json`, `evidence/commands/safe-command-log.md`, `evidence/blockers/*`.

**Steps:**

- [ ] During apply, fetch/consult `https://docs.monad.xyz/llms.txt` first, then the smallest relevant official pages: testnets, JSON-RPC overview, gas pricing, transactions, and Monad MCP guide.
- [ ] Cite official docs URLs when interpreting `chain_id=10143`, native `MON`, MCP behavior, RPC caveats, gas/pricing behavior, transaction constraints, and provider limitations.
- [ ] Select one demo Monad Testnet RPC provider label and at least one fallback label when safely available.
- [ ] Record provider behavior observations or explicit unavailability for rate limits, latency, reliability, gas-estimation behavior, and finality/confirmation assumptions.
- [ ] Record caveats for async send validation, no pending tx visibility via `eth_getTransactionByHash`, provisional `latest`, provider-specific `eth_call`/`eth_estimateGas` limits, full gas-limit charging, `eth_maxPriorityFeePerGas` suggestion behavior, EIP-1559-compatible pricing, and unsupported type 3 blob transactions where relevant.

**Acceptance evidence:**

- [ ] Provider evidence names a selected provider label and fallback candidate(s), or records blocker IDs for unavailable fallback evidence.
- [ ] Notes distinguish `latest`, `finalized`, explorer, and other confirmation sources.
- [ ] No raw credentialed URL or secret-bearing provider value is persisted.

**Commands/evidence placeholders:**

- [ ] Safe RPC checks only, such as chain id, safe block/finality observations, fee/gas suggestions, `eth_call`, and `eth_estimateGas`; record provider labels, not secrets.
- [ ] If docs cannot be fetched, record `status: "docs_unavailable"` with downstream impact instead of inventing facts.

**Stop gate:** If current official Monad docs contradict `docs/constitution.md`, pause W0 apply and create/update an ADR or constitution before continuing Monad-specific conclusions.

**Rollback boundary:** Replace provider evidence and manifest refs if provider choice changes; no source-code rollback expected.

### 3. [x] Wallet Agent availability and safe MCP session — completed with blocker `W0-BLOCKER-001`

**Files/targets:**
`evidence/manifest.json`, `evidence/commands/safe-command-log.md`, `evidence/blockers/blocker-register.md`, `evidence/blockers/blocker-register.jsonl`.

**Steps:**

- [ ] Start Wallet Agent only as the upstream MCP candidate from `https://github.com/wallet-agent/wallet-agent` using the safe command template `bunx wallet-agent@latest` through a safe MCP client/inspector.
- [ ] Capture safe availability metadata: upstream source URL, command template, resolved package/version when safely available, MCP initialization status, and sanitized errors.
- [ ] Do not call wallet import/export, keystore, private-key, raw signing, or mutation tools.

**Acceptance evidence:**

- [ ] `manifest.json` records Wallet Agent availability status as `available`, `unavailable`, or `blocked`.
- [ ] `safe-command-log.md` records command shapes and MCP methods only; no local cache paths or secret-bearing environment values.
- [ ] If Wallet Agent cannot start or initialize, blocker entries identify impacted W2/W4/W5 work.

**Commands/evidence placeholders:**

- [ ] Upstream source: `https://github.com/wallet-agent/wallet-agent`.
- [ ] Command template: `bunx wallet-agent@latest`.
- [ ] MCP methods: `initialize`; no private-key/keystore methods.

**Stop gate:** If Wallet Agent requires exposing secrets or importing key material to initialize, stop and record a blocker.

**Rollback boundary:** Stop the Wallet Agent process and remove local PoC-only config not intended for commit.

### 4. [x] Wallet Agent `tools/list` capture and P0 fixture split — completed with blockers `W0-BLOCKER-001`/`W0-BLOCKER-002`

**Files/targets:**
`evidence/upstream/wallet-agent-tools-list.sanitized.json`, `evidence/upstream/tools/*.schema.json`, `evidence/upstream/registry-readiness.md`, `evidence/blockers/*`.

**Steps:**

- [ ] Capture sanitized Wallet Agent `tools/list` output after MCP initialization.
- [ ] Split P0 candidate tool descriptors into per-tool fixtures for: `add_custom_chain`, `switch_chain`, `get_wallet_info`, `get_balance`, `get_token_balance`, `estimate_gas`, `simulate_transaction`, `dry_run_transaction`, `send_transaction`, `transfer_token`, `approve_token`, and `sign_typed_data`.
- [ ] For each present tool, retain safe `name`, safe `description` if needed, and sanitized `inputSchema`.
- [ ] For each missing P0 candidate tool, create an explicit absent/skipped fixture or readiness row and link a blocker ID.
- [ ] Assess registry readiness for future semantics, inspection, simulation, `candidate_tx_digest`, idempotency, policy, and audit needs.

**Acceptance evidence:**

- [ ] Every P0 candidate tool is accounted for as `captured`, `absent`, `skipped`, or `blocked`.
- [ ] Schema fixtures contain no secrets, local credentials, or unnecessary machine-specific output.
- [ ] `registry-readiness.md` identifies usable tools, insufficient payloads, and ADR candidates.

**Commands/evidence placeholders:**

- [ ] MCP methods: `tools/list`; do not call private-key/keystore/mutation tools.
- [ ] Evidence refs: fixture path per P0 candidate tool.

**Stop gate:** If raw `tools/list` output contains sensitive-looking values, sanitize before persistence; if safe sanitization is not possible, discard and record a blocker.

**Rollback boundary:** Regenerate `upstream/` fixtures and readiness notes as a unit if capture or sanitization is wrong.

### 5. [x] Schema hashing and drift manifest — blocked entries recorded

**Files/targets:**
`evidence/upstream/schema-hash-manifest.json`, `evidence/contracts/schema-hash-manifest.schema.json`, `evidence/upstream/tools/*.schema.json`, `evidence/blockers/*`.

**Steps:**

- [ ] Define `canonical_json_v1`: sanitize first, recursively sort object keys, preserve array order, encode as UTF-8 JSON with no insignificant whitespace, and hash the exact reviewed data.
- [ ] Compute `input_schema_hash` over each captured tool's sanitized MCP `inputSchema` object.
- [ ] Compute `upstream_schema_hash` over each captured tool's sanitized retained upstream descriptor.
- [ ] Record hashes as `sha256:<64 lowercase hex>` and include fixture paths, capture status, and blocker IDs for missing tools.
- [ ] Recompute hashes after all fixture edits and verify the manifest still matches.

**Acceptance evidence:**

- [ ] Each captured P0 tool has both `input_schema_hash` and `upstream_schema_hash`.
- [ ] Missing tools are represented with `status: "absent"`/`"blocked"` and blocker refs instead of fake hashes.
- [ ] `schema-hash-manifest.json` states canonicalization and hash algorithm.

**Commands/evidence placeholders:**

- [ ] Hash command/script placeholder recorded in `safe-command-log.md`; any temporary script must not read outside `evidence/upstream/tools/`.

**Stop gate:** If hashes do not recompute from the committed sanitized fixtures, stop and fix fixtures/manifest before continuing.

**Rollback boundary:** Revert the manifest and regenerated fixtures together if canonicalization changes.

### 6. [x] Monad Testnet custom-chain validation — public RPC pass, Wallet Agent flow blocked

**Files/targets:**
`evidence/chain/monad-testnet-validation.md`, `evidence/chain/monad-testnet-validation.json`, `evidence/rpc/provider-evidence.md`, `evidence/blockers/*`.

**Steps:**

- [ ] Use Wallet Agent `add_custom_chain` with Monad Testnet `chain_id=10143`, native symbol `MON`, and an allowlisted/configured RPC provider label.
- [ ] Use Wallet Agent `switch_chain` to select Monad Testnet.
- [ ] Confirm active runtime chain using safe Wallet Agent output and/or safe RPC evidence.
- [ ] Record official testnet docs citation for `chain_id=10143` and `MON`.

**Acceptance evidence:**

- [ ] Evidence shows `add_custom_chain` and `switch_chain` success for `10143`, or records safe failure/blocker IDs.
- [ ] Active chain is confirmed as `10143`, or ambiguity is a blocker before downstream reliance.
- [ ] Monad Mainnet `143` or any non-`10143` chain is not accepted as W0 P0 validation.

**Commands/evidence placeholders:**

- [ ] MCP `tools/call` placeholders: `add_custom_chain`, `switch_chain` with sanitized args.
- [ ] Safe RPC placeholder: `eth_chainId` through selected provider label; no secret URL persisted.

**Stop gate:** If active chain cannot be confirmed as `10143`, skip chain-dependent read/simulation/mutation tasks and record blockers.

**Rollback boundary:** Remove PoC-only upstream custom-chain config after validation if it is local/operator-specific and not intended for commit.

### 7. [x] Wallet Agent read-only PoC — skipped/blocked safely

**Files/targets:**
`evidence/reads/get_wallet_info.json`, `evidence/reads/get_balance.json`, `evidence/reads/get_token_balance.json`, `evidence/blockers/*`.

**Steps:**

- [ ] Run `get_wallet_info` and `get_balance` only when a safe testnet account is available without exposing secrets.
- [ ] Run `get_token_balance` only when a safe token/account combination is available.
- [ ] Classify each call as read-only and tie evidence to `chain_id=10143` when available.
- [ ] State whether responses expose enough safe chain/account context for future Compass audit and read-only registry planning.

**Acceptance evidence:**

- [ ] `get_wallet_info` and `get_balance` have successful or safely failed evidence tied to Monad Testnet, or account dependency is skipped/blocked with downstream impact.
- [ ] `get_token_balance` is included when safe, otherwise explicitly skipped.
- [ ] Read evidence contains no broadcast, transfer, approval, signature, or mutation artifacts.

**Commands/evidence placeholders:**

- [ ] MCP `tools/call` placeholders: `get_wallet_info`, `get_balance`, optional `get_token_balance`.
- [ ] Sanitized output may retain safe public account identifiers only when necessary for validation.

**Stop gate:** If a read task would require importing keys, reading secrets, or mutating state, skip it and route the dependency to blockers or consent gate as appropriate.

**Rollback boundary:** Replace read evidence as a set if account context was over-redacted or unsafe.

### 8. [x] Wallet Agent gas/simulation PoC — direct RPC estimate captured, Wallet Agent simulation blocked

**Files/targets:**
`evidence/simulation/estimate_gas.json`, `evidence/simulation/simulate_transaction.json`, `evidence/simulation/dry_run_transaction.json`, `evidence/simulation/payload-inspectability.md`, `evidence/blockers/*`.

**Steps:**

- [ ] Run `estimate_gas` for a safe Monad Testnet candidate action, or record why gas estimation is unavailable/insufficient.
- [ ] Run either `simulate_transaction` or `dry_run_transaction` only if confirmed read-like and non-mutating.
- [ ] Record sanitized candidate context, gas/simulation outcome, caveats, and tie evidence to `chain_id=10143`.
- [ ] Judge payload inspectability for future `candidate_tx_digest`, policy, risk, audit, and idempotency work.
- [ ] Interpret results with Monad RPC/gas/transaction caveats from official docs rather than generic Ethereum assumptions.

**Acceptance evidence:**

- [ ] `estimate_gas` evidence exists or has a blocker/fallback requirement.
- [ ] At least one simulation/dry-run path exists or upstream simulation insufficiency is recorded as blocker/Compass fallback requirement.
- [ ] `payload-inspectability.md` states whether required fields are available and marks ADR candidates when fields are opaque/missing.
- [ ] No simulation evidence includes a broadcast or other state mutation.

**Commands/evidence placeholders:**

- [ ] MCP `tools/call` placeholders: `estimate_gas`, `simulate_transaction` or `dry_run_transaction`.
- [ ] Candidate action placeholder must use sanitized account/target/value/data/gas fields only.

**Stop gate:** If a purported simulation tool may broadcast, sign, transfer, approve, or write, do not run it as simulation; route it to the consent gate.

**Rollback boundary:** Delete unsafe simulation artifacts and regenerate after choosing a non-mutating candidate.

### 9. [x] Optional external mutation consent gate — all mutation skipped

**Files/targets:**
`evidence/consent/mutation-consent-records.jsonl`, `evidence/consent/mutation-skips.jsonl`, optional sanitized mutation evidence refs, `evidence/blockers/*`.

**Steps:**

- [ ] Default all transfers, approvals, broadcasts, signatures, and writes to skipped/blocked.
- [ ] Before any optional mutation attempt, obtain explicit user consent that names: Monad Testnet `chain_id=10143`, provider label, safe account/source constraints, recipient/target, asset, maximum amount, maximum gas/cost boundary, action type, expected evidence, and single-use/expiration boundary.
- [ ] Treat incomplete consent as not granted.
- [ ] If consent is denied or absent, record a skip and downstream impact; do not claim mutation evidence.
- [ ] If consent is granted, persist only safe public identifiers and sanitized status; never persist secrets or unnecessary local details.
- [ ] State that W0 consent is an apply safety control, not P0 product approval UI or manual signing surface.

**Acceptance evidence:**

- [ ] `mutation-skips.jsonl` records default skipped mutation paths when no consent is granted.
- [ ] Any consent record includes all required fields and evidence boundary.
- [ ] Transfer/approval evidence remains optional; W0 read/simulation success does not require external state mutation.

**Commands/evidence placeholders:**

- [ ] Optional MCP calls only after consent: `transfer_token`, `send_transaction`, `approve_token`, `sign_typed_data`, or other write-like tool.
- [ ] If no consent, command placeholder is `not run: skipped by W0 consent gate`.

**Stop gate:** Missing or ambiguous consent means no mutation. Do not ask downstream code to compensate with approval UI; P0 remains deterministic `allow|block`.

**Rollback boundary:** Consented on-chain testnet mutations cannot be rolled back; stop further mutation, record sanitized outcome, and continue only with fresh consent or non-mutating evidence.

### 10. [x] MCP host no-bypass evidence — boundary recorded, proof blocked

**Files/targets:**
`evidence/host/no-bypass.md`, `evidence/host/host-visible-tools.sanitized.json`, `evidence/blockers/*`.

**Steps:**

- [ ] Record the boundary statement: Wallet Agent is only an upstream candidate behind Compass; Compass is the only intended host-facing MCP execution surface.
- [ ] Prefer a user-provided sanitized host MCP config excerpt or safe host-visible MCP tool listing.
- [ ] Show that the intended demo host identifies Compass and does not identify a direct Wallet Agent MCP entry.
- [ ] If host config/tool visibility cannot be inspected safely, record an operational limitation or blocker.
- [ ] If direct Wallet Agent access is found in Claude Code, Claude Desktop, Codex, Cursor, or another demo host, record no-bypass failure and block demo readiness until removed/isolated.

**Acceptance evidence:**

- [ ] `no-bypass.md` distinguishes host-facing Compass from upstream Wallet Agent and does not authorize bypass.
- [ ] Host-visible evidence is sanitized and retains only information needed to prove the boundary.
- [ ] Missing safe host evidence or direct Wallet Agent exposure has blocker IDs.

**Commands/evidence placeholders:**

- [ ] Safe host-visible listing/config excerpt provided by operator; do not read secret-bearing config files directly.
- [ ] Evidence path: `host-visible-tools.sanitized.json` when listing is available.

**Stop gate:** If proving no-bypass requires reading credentials or secret-bearing host config, skip proof and record a blocker instead.

**Rollback boundary:** Remove host evidence and request a safer sanitized excerpt if local paths or secrets were over-captured.

### 11. [x] Blocker register consolidation

**Files/targets:**
`evidence/blockers/blocker-register.md`, `evidence/blockers/blocker-register.jsonl`, all evidence artifacts with blocker refs.

**Steps:**

- [ ] Consolidate blockers from discovery, schema, RPC, chain, read, simulation, consent, and no-bypass tasks.
- [ ] Ensure blocker categories include missing upstream payloads, unsupported P0 tools, schema instability, RPC failures, simulation/dry-run insufficiency, consent-gated skips, host no-bypass uncertainty, and ADR candidates when discovered.
- [ ] For each blocker, record `blocker_id`, domain, summary, status, severity, impacted waves/capabilities, safe cause, next decision/validation, ADR candidate flag, and evidence refs.
- [ ] Ensure every missing W0 success criterion maps to a blocker rather than silent success.

**Acceptance evidence:**

- [ ] `blocker-register.md` is readable for reviewers and downstream wave owners.
- [ ] `blocker-register.jsonl` has one structured entry per blocker.
- [ ] Entries contain no `.env` contents, private keys, tokens, credentials, delegated payloads, seed phrases, secret-manager output, or raw sensitive logs.

**Commands/evidence placeholders:**

- [ ] No external commands required; use evidence refs from prior tasks.

**Stop gate:** If a blocker cause involves credentials/provider auth, describe it with sanitized labels or safe error categories only.

**Rollback boundary:** Blocker register can be regenerated from evidence refs; do not delete blockers just to make W0 appear successful.

### 12. [x] Final W0 verify report

**Files/targets:**
`evidence/verify-report.md`, `evidence/manifest.json`, `evidence/README.md`, all W0 spec requirement refs.

**Steps:**

- [ ] Map every W0 spec requirement/scenario to evidence path(s) or blocker ID(s).
- [ ] Recompute schema hashes and confirm `schema-hash-manifest.json` matches sanitized fixtures.
- [ ] Confirm Monad Testnet validation is either proven for `10143`/`MON` or blocked with impact.
- [ ] Confirm provider evidence includes selected/fallback labels and official caveats or blockers.
- [ ] Confirm read and simulation outcomes are present or explicitly blocked/skipped.
- [ ] Confirm optional mutation is either skipped by consent gate or explicitly consented and sanitized.
- [ ] Confirm no-bypass evidence exists or a blocker/operational limitation is recorded.
- [ ] Confirm no Compass application/source-code implementation files changed as part of W0.
- [ ] Perform a secret-safety review over committed W0 evidence artifacts only; if unsafe data appears, stop and replace/delete the artifact.

**Acceptance evidence:**

- [ ] `verify-report.md` states `pass`, `pass_with_blockers`, or `blocked` for each W0 capability domain.
- [ ] `manifest.json` lists final evidence refs and blocker refs.
- [ ] Verify report states no runnable test command exists yet and W0 used evidence-based verification.
- [ ] Verify report includes reviewer notes for downstream W2/W3/W4/W5 handoff.

**Commands/evidence placeholders:**

- [ ] Optional if available: OpenSpec validation command/result.
- [ ] Safe diff evidence: list changed files/diffstat only, confirming W0 evidence/docs changes and application code unchanged.

**Stop gate:** Do not mark W0 complete if required evidence is missing without a blocker ID and downstream impact.

**Rollback boundary:** Revert/delete unsafe or incomplete evidence artifacts; W0 has no application-code rollback path because it should not modify runtime code.

## Apply Results

W0 apply completed in standard evidence mode with overall status `pass_with_blockers`. See `evidence/verify-report.md` and `apply-progress.md`. Live Wallet Agent `tools/list`, Wallet Agent chain/read/simulation PoCs, schema hashes, and host no-bypass proof remain blocked with explicit blocker IDs.
