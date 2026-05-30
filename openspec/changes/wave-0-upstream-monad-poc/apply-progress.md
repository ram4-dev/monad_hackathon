# Apply Progress: wave-0-upstream-monad-poc

Updated: `2026-05-30T15:40:32Z`

## Mode

- Standard evidence mode; strict TDD not active.
- No runnable test command configured.
- Delivery boundary: single W0 evidence/docs PR acceptable; no runtime/source-code changes.

## Completed tasks

- Created W0 evidence directory tree and contract schema placeholders.
- Recorded official Monad docs and Wallet Agent upstream source (`https://github.com/wallet-agent/wallet-agent`) with safe command shape `bunx wallet-agent@latest`.
- Refreshed official Monad docs via public web fetches: llms index, testnets, JSON-RPC overview, gas pricing, transactions, and Monad MCP guide.
- Ran safe public RPC checks only; selected `quicknode-public` with `ankr-public` and `monadinfra-public` fallbacks.
- Confirmed public Monad Testnet `eth_chainId` as `0x279f` (`10143`) on all three public providers.
- Captured selected-provider read-only observations for latest/finalized blocks, gas price, max priority fee, and zero-value placeholder `eth_estimateGas`.
- Attempted Wallet Agent MCP `initialize`/`tools/list` with short timeout; recorded timeout as blocker instead of forcing it.
- Created blocked placeholder fixtures for every P0 Wallet Agent candidate tool and a schema hash manifest with no fake hashes.
- Recorded Wallet Agent chain/read/simulation blockers, mutation consent skips, and host no-bypass operational limitation.
- Consolidated blocker register and final verify report.
- Confirmed W0 evidence did not modify application/runtime source code.

## Files changed

- `openspec/config.yaml` (pre-existing in this session)
- `openspec/changes/wave-0-upstream-monad-poc/proposal.md` (pre-existing planning artifact)
- `openspec/changes/wave-0-upstream-monad-poc/design.md` (pre-existing planning artifact)
- `openspec/changes/wave-0-upstream-monad-poc/tasks.md`
- `openspec/changes/wave-0-upstream-monad-poc/specs/**/spec.md` (pre-existing planning artifacts)
- `openspec/changes/wave-0-upstream-monad-poc/evidence/**` (new W0 evidence package)
- `openspec/changes/wave-0-upstream-monad-poc/apply-progress.md`

## Commands run

- `python3` public docs fetch of official Monad docs URLs.
- `python3` JSON-RPC `eth_chainId` checks to public Monad Testnet providers.
- `python3` JSON-RPC read-only checks to selected public provider.
- `command -v bunx` to verify command availability.
- `python3` MCP stdio attempt using `bunx wallet-agent@latest` for `initialize`/`tools/list`; timed out.
- Process cleanup attempt for Wallet Agent command shapes.
- `python3` parse validation for evidence JSON/JSONL artifacts.
- `grep` secret-safety scan over W0 evidence artifacts only.

## TDD Cycle Evidence

Strict TDD is not active (`strict_tdd: false`, no test runner). No production code was written.

## Deviations from design

- Initial Wallet Agent `tools/list` failed because local Bun/npm registry configuration resolved `wallet-agent` through a private registry. This was fixed with `npm_config_registry=https://registry.npmjs.org/` and newline-delimited JSON-RPC over stdio.
- Wallet Agent `tools/list` is now captured and schema hashes are computed for present P0 tools.
- `dry_run_transaction` is absent from the live Wallet Agent `tools/list`; it is tracked as `W0-BLOCKER-009` with no fake hash.
- Wallet Agent `add_custom_chain`, `switch_chain`, read-only, and simulation tools were not called because this debug pass only ran safe discovery, not `tools/call`.
- No host config was inspected; no-bypass evidence is a boundary statement plus blocker/operational limitation.
- No external mutation was requested or performed.

## Remaining tasks / blockers

- `W0-BLOCKER-003`: resolved — Wallet Agent Monad Testnet add/switch flow passed.
- `W0-BLOCKER-004`: resolved — `get_wallet_info`/`get_balance` read-only PoC passed with mock account.
- `W0-BLOCKER-005`: resolved — `simulate_transaction` produced inspectable non-mutating evidence and `estimate_gas` reached Monad with reserve-balance caveat.
- `W0-BLOCKER-006`: optional mutation evidence remains skipped unless explicit consent is granted later.
- `W0-BLOCKER-007`: obtain sanitized host no-bypass proof.
- `W0-BLOCKER-008`: run stronger provider reliability/rate-limit smoke before demo hardening.
- `W0-BLOCKER-009`: treat absent `dry_run_transaction` as unsupported or recapture from a newer pinned Wallet Agent version.

## Workload / PR boundary

Single W0 evidence/docs PR remains appropriate. Review risk is high due external integration blockers, but application code changed: 0 files.

## Debug update — Wallet Agent bunx issue (2026-05-30T16:08:36Z)

Root cause found: local Bun/npm registry configuration resolved `wallet-agent` through a private registry, causing package fetch failure/timeout behavior. Running Wallet Agent with `npm_config_registry=https://registry.npmjs.org/` and newline-delimited JSON-RPC over stdio fixed MCP discovery. `tools/list` is now captured and schema hashes are computed for present P0 tools. `dry_run_transaction` remains absent in live `tools/list` and is tracked as `W0-BLOCKER-009`; chain/read/simulation/no-bypass blockers remain. No secrets were read and no mutation/signing/broadcast/write tools were called.

## Debug update — Monad chain/read/simulation PoC (2026-05-30T16:20:16Z)

Using the user-provided Monad Testnet data (`chainId=10143`, `name=Monad Testnet`, `symbol=MON`) and public RPC `https://testnet-rpc.monad.xyz`, Wallet Agent `add_custom_chain` and `switch_chain` succeeded. A mock-account read PoC succeeded for `get_wallet_info` and `get_balance`. `simulate_transaction` produced inspectable non-mutating failure/revert evidence; `estimate_gas` reached Monad through Wallet Agent/viem and returned a reserve-balance violation for the mock account. `W0-BLOCKER-003`, `W0-BLOCKER-004`, and `W0-BLOCKER-005` are resolved. Remaining open blockers: `W0-BLOCKER-006`, `W0-BLOCKER-007`, `W0-BLOCKER-008`, and `W0-BLOCKER-009`. No secrets were read and no signing/broadcast/transfer/approval/write was performed.
