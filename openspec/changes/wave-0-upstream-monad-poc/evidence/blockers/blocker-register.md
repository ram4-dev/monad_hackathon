# W0 Blocker Register

Status: `pass_with_blockers`

Wallet Agent discovery, schema hashing, Monad chain validation, read PoC, and simulation PoC are now resolved. Remaining blockers are explicit: mutation consent skip, host no-bypass proof, provider smoke, and absent `dry_run_transaction`.

| ID | Domain | Status | Severity | Impacted waves | Summary | Next decision |
| --- | --- | --- | --- | --- | --- | --- |
| W0-BLOCKER-001 | wallet-agent-upstream-discovery | resolved | resolved | W2, W4, W5 | Wallet Agent MCP initialize/tools-list now succeeds with explicit public npm registry override. | Use explicit public npm registry override or project-local registry config for future Wallet Agent discovery; no schema registry work should rely on private registry defaults. |
| W0-BLOCKER-002 | schema-hashing | resolved | resolved | W2 | P0 input_schema_hash/upstream_schema_hash values are captured for present live Wallet Agent tools. | Use schema-hash-manifest.json for W2 registry inputs; handle absent dry_run_transaction via W0-BLOCKER-009. |
| W0-BLOCKER-003 | monad-testnet-chain-validation | resolved | resolved | W4, W5 | Wallet Agent add_custom_chain/switch_chain flow for Monad Testnet was validated. | Use this chain setup evidence for W4/W5; rerun if Wallet Agent package version changes. |
| W0-BLOCKER-004 | wallet-agent-read-poc | resolved | resolved | W5 | Wallet Agent get_wallet_info/get_balance read-only PoC succeeded using a mock account. | Use native MON read evidence for W5; token balance remains optional until a safe token identifier is provided. |
| W0-BLOCKER-005 | wallet-agent-simulation-poc | resolved | resolved | W4, W5 | Wallet Agent estimate_gas/simulate_transaction PoC was validated with safe non-mutating calls. | Use simulate_transaction as the W4 simulation path; handle dry_run_transaction absence via W0-BLOCKER-009 and reserve-balance caveat in policy docs. |
| W0-BLOCKER-006 | external-mutation-consent-gate | open | informational_skip | W5, W6 | All transfer, approval, broadcast, write, and signature paths were skipped because no explicit W0 mutation consent was requested or granted. | If mutation evidence is needed later, request single-use testnet consent with network, provider, account/source, target, asset, amount, gas/cost, action type, evidence, and expiry boundaries. |
| W0-BLOCKER-007 | mcp-host-no-bypass-evidence | open | demo_blocker | W6 | Host MCP no-bypass proof is unavailable because secret-bearing host config files were not inspected and no sanitized operator excerpt was provided. | Obtain a sanitized host config/tool listing showing Compass only and no direct Wallet Agent entry before demo readiness. |
| W0-BLOCKER-008 | rpc-provider-evidence | open | follow_up | W3, W5, W6 | RPC reliability and rate-limit evidence is limited to official docs plus single short read-only samples. | Before demo hardening, run a longer non-secret provider smoke with explicit bounds and capture retry/fallback behavior. |
| W0-BLOCKER-009 | wallet-agent-upstream-discovery | open | follow_up | W2, W4, W5 | Live Wallet Agent tools/list does not expose dry_run_transaction. | Treat dry_run_transaction as absent for W2 or retry against a newer pinned Wallet Agent version; do not create a fake registry entry. |
