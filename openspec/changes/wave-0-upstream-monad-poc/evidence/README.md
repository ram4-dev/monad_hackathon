# W0 Evidence Package — Upstream + Monad PoC

Capture ID: `w0-20260530T153616Z`  
Captured at: `2026-05-30T15:40:32Z`  
Mode: standard evidence mode (`strict_tdd=false`; no runnable test command).  
Scope: OpenSpec evidence artifacts only; no Compass runtime/source-code implementation.

## Upstream in scope

The Wallet Agent MCP upstream for W0 is explicitly:

- `https://github.com/wallet-agent/wallet-agent`
- Safe command shape: `bunx wallet-agent@latest`

Wallet Agent is evaluated only as a future upstream behind Compass. It is not authorized as a direct host-facing MCP server.

## Safety boundary

- `secret_sources_read: false`
- No `.env`, shell history, private keys, seed phrases, tokens, credentials, delegated payloads, secret-manager output, or host MCP config files were read.
- No transfer, approval, broadcast, signature, raw-send, raw-signing, private-key, keystore, import/export, or write tools were called.
- Raw terminal transcripts were not persisted. Only sanitized command shapes/results are recorded.
- Public RPC checks used public Monad Testnet URLs only.

## Artifact map

| Area | Path | Status |
| --- | --- | --- |
| Command log | `commands/safe-command-log.md` | captured sanitized command shapes |
| Contract schemas | `contracts/*.schema.json` | scaffolded |
| Wallet Agent discovery | `upstream/` | blocked: live MCP tools/list timed out (`W0-BLOCKER-001`) |
| Monad chain validation | `chain/` | pass_with_blockers: public RPC confirms `10143`; Wallet Agent chain flow blocked (`W0-BLOCKER-003`) |
| RPC provider evidence | `rpc/` | pass_with_followup (`W0-BLOCKER-008`) |
| Read-only PoC | `reads/` | blocked/skipped (`W0-BLOCKER-004`) |
| Simulation PoC | `simulation/` | pass_with_blockers: direct RPC `eth_estimateGas` only; Wallet Agent simulation blocked (`W0-BLOCKER-005`) |
| Mutation consent | `consent/` | pass: all mutation skipped by consent gate (`W0-BLOCKER-006`) |
| Host no-bypass | `host/` | blocked/operational limitation (`W0-BLOCKER-007`) |
| Blocker register | `blockers/` | consolidated |
| Verify report | `verify-report.md` | finalized |

## Official references consulted

- `https://github.com/wallet-agent/wallet-agent`
- `https://docs.monad.xyz/llms.txt`
- `https://docs.monad.xyz/developer-essentials/testnets.md`
- `https://docs.monad.xyz/reference/json-rpc/overview.md`
- `https://docs.monad.xyz/developer-essentials/gas-pricing.md`
- `https://docs.monad.xyz/developer-essentials/transactions.md`
- `https://docs.monad.xyz/guides/monad-mcp.md`

## Overall W0 result

`pass_with_blockers`: evidence scaffolding, official docs/RPC citation, public RPC chain validation, mutation skip handling, blocker consolidation, and verify mapping are complete. Real Wallet Agent `tools/list`, Wallet Agent chain/read/simulation PoCs, schema hashes, and host no-bypass proof remain blocked and must be resolved before W2/W4/W5/W6 consume those assumptions.
