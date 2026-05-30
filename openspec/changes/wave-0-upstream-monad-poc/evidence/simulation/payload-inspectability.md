# Wallet Agent Payload Inspectability

Status: `pass_with_followup`
Capture ID: `w0-wallet-agent-monad-poc-20260530T162016Z`
Captured at: `2026-05-30T16:20:16Z`

Wallet Agent simulation evidence is now available for `simulate_transaction`; the response includes contract, function, args, sender, and failure/revert judgment without signing or broadcasting. `estimate_gas` also reached Monad Testnet through Wallet Agent/viem and returned a reserve-balance violation for the mock account, which is useful policy evidence.

`dry_run_transaction` remains absent from live `tools/list` and is tracked as `W0-BLOCKER-009`.
