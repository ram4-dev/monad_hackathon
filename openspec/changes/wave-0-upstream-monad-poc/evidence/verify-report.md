# W0 Verify Report

Capture ID: `w0-20260530T153616Z`  
Verified at: `2026-05-30T15:40:32Z`  
Overall status: `pass_with_blockers`

W0 evidence-mode apply is complete with a debug update: Wallet Agent `tools/list` discovery and schema hashing now work after fixing `bunx` registry resolution. This package is safe to review as a W0 evidence scaffold, RPC citation set, and captured Wallet Agent schema source. It is **not** sufficient for W4/W5 real guarded forwarding assumptions until chain/read/simulation/no-bypass blockers are resolved.

## Capability mapping

| Domain                            | Status               | Evidence summary                                                                                                 | Blockers       |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| `wallet-agent-upstream-discovery` | `pass_with_followup` | Source/command pinned; live tools/list captured; `dry_run_transaction` absent.                                   | W0-BLOCKER-009 |
| `monad-testnet-chain-validation`  | `pass` | Public RPC confirms 10143/MON facts; Wallet Agent add/switch passed. | none |
| `monad-rpc-provider-evidence`     | `pass_with_followup` | Selected quicknode-public with Ankr/Monadinfra fallbacks and official caveats.                                   | W0-BLOCKER-008 |
| `wallet-agent-read-poc`           | `pass_with_optional_skip` | `get_wallet_info` and `get_balance` passed with mock account; token balance optional/skipped. | none |
| `wallet-agent-simulation-poc`     | `pass_with_followup` | Wallet Agent `simulate_transaction` produced inspectable non-mutating evidence; `estimate_gas` returned reserve-balance caveat; `dry_run_transaction` absent. | W0-BLOCKER-009 |
| `external-mutation-consent-gate`  | `pass`               | All mutation/signature/write paths skipped by consent gate.                                                      | W0-BLOCKER-006 |
| `mcp-host-no-bypass-evidence`     | `blocked`            | Boundary statement captured; host config not inspected and no safe excerpt provided.                             | W0-BLOCKER-007 |
| `upstream-blocker-register`       | `pass`               | Structured JSONL and reviewer MD register completed; `W0-BLOCKER-001`/`002` resolved and open blockers retained. | none           |

## Task mapping

| Task                                   | Status             | Evidence                                                                                                                             |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Artifact scaffold                   | pass               | `README.md`, `manifest.json`, `contracts/*.schema.json`                                                                              |
| 2. Official docs/RPC/provider evidence | pass_with_followup | `rpc/provider-evidence.md`, `rpc/provider-behavior.json`, `commands/safe-command-log.md`                                             |
| 3. Wallet Agent availability           | pass               | `manifest.json`, `commands/safe-command-log.md`                                                                                      |
| 4. Wallet Agent tools/list fixtures    | pass_with_followup | `upstream/wallet-agent-tools-list.sanitized.json`, `upstream/tools/*.schema.json`, `W0-BLOCKER-009` for absent `dry_run_transaction` |
| 5. Schema hashing                      | pass_with_followup | `upstream/schema-hash-manifest.json`, hashes for present P0 tools, `W0-BLOCKER-009` for absent `dry_run_transaction`                 |
| 6. Monad chain validation              | pass_with_blockers | `chain/monad-testnet-validation.*`, public RPC `eth_chainId` evidence                                                                |
| 7. Wallet Agent read-only PoC          | pass_with_optional_skip | `reads/get_wallet_info.json`, `reads/get_balance.json`; `get_token_balance` optional/skipped |
| 8. Wallet Agent gas/simulation PoC     | pass_with_followup | `simulation/estimate_gas.json`, `simulation/simulate_transaction.json`, `simulation/payload-inspectability.md`, `W0-BLOCKER-009` |
| 9. External mutation consent gate      | pass               | `consent/mutation-skips.jsonl`; no mutation performed                                                                                |
| 10. MCP host no-bypass                 | blocked_recorded   | `host/no-bypass.md`, `W0-BLOCKER-007`                                                                                                |
| 11. Blocker register                   | pass               | `blockers/blocker-register.*`                                                                                                        |
| 12. Final W0 verify report             | pass               | this file                                                                                                                            |

## Hash verification

Live sanitized Wallet Agent tool fixtures are captured. `schema-hash-manifest.json` includes `input_schema_hash` and `upstream_schema_hash` for every present P0 tool. `dry_run_transaction` is absent from live `tools/list`, so it has null hashes and `W0-BLOCKER-009` rather than fake data.

## Secret-safety review

- No `.env`, shell history, host MCP config, private keys, seed phrases, tokens, credentials, delegated payloads, or secret-manager output were read.
- No raw terminal transcripts were persisted.
- Evidence contains public RPC URLs only and safe public chain data.
- No application/runtime source files were changed by W0 evidence apply.

## Test command

No runnable test command exists in `openspec/config.yaml`; strict TDD is disabled. Verification used evidence artifact parsing, secret-safety scan, and safe public RPC checks.

## Reviewer notes for W2/W3/W4/W5

- W2: use captured sanitized Wallet Agent `tools/list` and schema hashes for present P0 tools; keep `dry_run_transaction` absent/blocked unless recaptured from a newer upstream.
- W3: provider caveats are usable for initial policy/risk design, but reliability/rate-limit assumptions need stronger smoke before demo hardening.
- W4: Wallet Agent simulation is now usable as inspectable non-mutating evidence; preserve reserve-balance and absent dry-run caveats in guarded-forwarding design.
- W5: chain and native MON read coverage can rely on current Wallet Agent evidence; token balance/action coverage still needs safe token/action inputs.
- W6: no-bypass proof remains required (`W0-BLOCKER-007`).

## Debug update — Wallet Agent bunx issue (2026-05-30T16:08:36Z)

Root cause found: local Bun/npm registry configuration resolved `wallet-agent` through a private registry, causing package fetch failure/timeout behavior. Running Wallet Agent with `npm_config_registry=https://registry.npmjs.org/` and newline-delimited JSON-RPC over stdio fixed MCP discovery. `tools/list` is now captured and schema hashes are computed for present P0 tools. `dry_run_transaction` remains absent in live `tools/list` and is tracked as `W0-BLOCKER-009`; chain/read/simulation/no-bypass blockers remain. No secrets were read and no mutation/signing/broadcast/write tools were called.

## Debug update — Monad chain/read/simulation PoC (2026-05-30T16:20:16Z)

Using the user-provided Monad Testnet data (`chainId=10143`, `name=Monad Testnet`, `symbol=MON`) and public RPC `https://testnet-rpc.monad.xyz`, Wallet Agent `add_custom_chain` and `switch_chain` succeeded. A mock-account read PoC succeeded for `get_wallet_info` and `get_balance`. `simulate_transaction` produced inspectable non-mutating failure/revert evidence; `estimate_gas` reached Monad through Wallet Agent/viem and returned a reserve-balance violation for the mock account. `W0-BLOCKER-003`, `W0-BLOCKER-004`, and `W0-BLOCKER-005` are resolved. Remaining open blockers: `W0-BLOCKER-006`, `W0-BLOCKER-007`, `W0-BLOCKER-008`, and `W0-BLOCKER-009`. No secrets were read and no signing/broadcast/transfer/approval/write was performed.
