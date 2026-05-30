# Apply Progress: W6 Demo Hardening and Release Readiness

## Status

Implemented and verified, including a **live deploy of the policy contract to Monad Testnet**. The
demo policy is on-chain and readable; all unit suites are green.

## What was done

- **Foundry** installed; `CompassPolicy` builds and its 4 unit tests pass.
- **Broadcastable deploy script** `contracts/script/DeployCompassPolicyLive.s.sol` (no forge-std
  dep; owner = broadcaster; read-only tools always allowlisted; finite transfer/approve demo added
  from env addresses).
- **Live deploy to Monad Testnet (chain 10143):**
  - contract: `0xf46fE939a947b6b300D9727ef94A2AbbCE07586C`
  - tx: `0x3408a2a4963ab27a4be9e55a7288fc747ce0207669bfe43215c583615f284882`, block `35123811`, status success
  - owner: `0xAaCF452ef1385B2c5555F1097b4915B54359550E`
  - policy_id `0x4483c5…`, version 1, schema_id `0xbff749…` (matches `EXPECTED_SCHEMA_ID`), 5 tools allowlisted
- **Live read smoke** (`scripts/smoke-w6-read-policy.mjs` via `cast`) confirms code present, schema
  match, chain 10143, allowed_tool_count 5.
- **Deployment evidence** sanitized in `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json`.
- **Runbook** (`runbook.md`), **ADR-0001** (on-chain policy), **ADR-0002** (LLM veto), **no-bypass
  proof** (`no-bypass-proof.md`, closes W0-BLOCKER-007 operationally), on-chain policy config example.

## Verification results

- `packages/coding-agent`: `npm test` → 82 pass / 0 fail.
- Contract: `forge build` + `forge test` → 4 pass.
- Live: deploy succeeded; `cast`-based smoke reads the on-chain policy (schema/chain/tool-count OK).
- Secrets: `.env`, foundry `cache/`/`broadcast/` are git-ignored; no key/raw tx committed.

## Demo notes

- The demo allowlist (token/recipient/spender) uses the deployer address as a placeholder; a full
  mutation demo with a real ERC20 can be added via a guarded policy update (W5 lifecycle).
- A full end-to-end run through the **live MCP proxy** still requires wiring `guardedForwardBridge`
  into the runtime `tools/call` path with a Monad RPC transport for the policy read (the package
  pipeline + on-chain contract are both proven; the runtime injection is the remaining integration).

## Carryover

- Constitution amendment to ratify ADR-0001 (on-chain policy) and ADR-0002 (LLM veto).
- Optional: contract source verification on the Monad explorer; real-ERC20 mutation demo.
