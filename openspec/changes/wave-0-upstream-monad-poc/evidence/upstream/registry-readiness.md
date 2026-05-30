# Wallet Agent Registry Readiness

Status: `captured_with_absences`
Upstream source: `https://github.com/wallet-agent/wallet-agent`
Command shape: `bunx wallet-agent@latest`
Registry override used for capture: `npm_config_registry=https://registry.npmjs.org/`
Protocol used by the debug capture: newline-delimited JSON-RPC over stdio.

Captured at: `2026-05-30T16:08:36Z`
Server info: `{"name": "wallet-agent", "version": "0.1.0"}`
Total tools exposed by Wallet Agent: `42`

The previous failure was caused by the local Bun/npm registry configuration resolving `wallet-agent` through a private registry. Running Wallet Agent with an explicit public npm registry override allowed MCP `initialize` and `tools/list` to complete.

| Tool | Status | Evidence | Blockers | Downstream readiness |
| --- | --- | --- | --- | --- |
| `add_custom_chain` | captured | input=sha256:79f402dcf29..., upstream=sha256:dbbdc61674a... | none | Registry-ready for W2 schema drift tests |
| `switch_chain` | captured | input=sha256:9f922f5ce1c..., upstream=sha256:ab323875693... | none | Registry-ready for W2 schema drift tests |
| `get_wallet_info` | captured | input=sha256:efddc7bd8bb..., upstream=sha256:96337253d64... | none | Registry-ready for W2 schema drift tests |
| `get_balance` | captured | input=sha256:2c2d95dea1a..., upstream=sha256:b4c56f0b137... | none | Registry-ready for W2 schema drift tests |
| `get_token_balance` | captured | input=sha256:88e6c9a9ea7..., upstream=sha256:aab343d0036... | none | Registry-ready for W2 schema drift tests |
| `estimate_gas` | captured | input=sha256:cfe97c0904f..., upstream=sha256:a2186c6c422... | none | Registry-ready for W2 schema drift tests |
| `simulate_transaction` | captured | input=sha256:739c0930630..., upstream=sha256:1603a90cbc4... | none | Registry-ready for W2 schema drift tests |
| `dry_run_transaction` | absent | not present in live tools/list | W0-BLOCKER-009 | Not registry-ready; treat as unsupported or recapture from a newer upstream |
| `send_transaction` | captured | input=sha256:daead389c17..., upstream=sha256:cbdb2116e33... | none | Registry-ready for W2 schema drift tests |
| `transfer_token` | captured | input=sha256:948b940f8aa..., upstream=sha256:cc8bbb2d1e8... | none | Registry-ready for W2 schema drift tests |
| `approve_token` | captured | input=sha256:aba90769c0a..., upstream=sha256:8fc827056f3... | none | Registry-ready for W2 schema drift tests |
| `sign_typed_data` | captured | input=sha256:93ef0552d57..., upstream=sha256:bd4ba766084... | none | Registry-ready for W2 schema drift tests |

## Readiness judgment

- Semantics registry finalization can proceed for captured P0 tool descriptors and hashes.
- `dry_run_transaction` remains absent in the live Wallet Agent `tools/list`; use `simulate_transaction` for W0/W4 planning unless a later package version exposes dry-run.
- Chain/read/simulation behavior is still not validated because no `tools/call` was run in this no-mutation/no-secret debug pass.

Official MCP context: `https://docs.monad.xyz/guides/monad-mcp.md`.
