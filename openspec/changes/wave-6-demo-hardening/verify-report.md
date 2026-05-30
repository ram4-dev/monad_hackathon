# Verify Report: W6 Demo Hardening and Release Readiness

## Summary

W6 hardens and documents the W1–W5 runtime and **deploys the CompassPolicy contract live to Monad
Testnet**. The on-chain policy is readable and validated; unit suites are green.

## Results

- `forge build` + `forge test`: **4 pass / 0 fail**.
- `packages/coding-agent` `npm test`: **82 pass / 0 fail**.
- Live deploy: contract `0xf46fE939a947b6b300D9727ef94A2AbbCE07586C` on chain 10143 (tx `0x3408a2…`, block 35123811, success).
- Live read smoke (`cast`): code present, schema_id `0xbff749…` matches expected, chain 10143, allowed_tool_count 5.

## Requirement coverage

| Spec / capability        | Verdict | Evidence |
| ------------------------ | ------- | -------- |
| reproducible-demo        | pass    | runbook (env-driven, clean-machine), Compass-only host config |
| e2e-smoke-script         | partial | live on-chain policy read smoke passes; full proxy e2e needs runtime bridge wiring (documented) |
| critical-test-suite      | pass    | coding-agent 82 + contract 4 green (fail-closed, isolation, LLM veto, digest, idempotency covered in W4/W5) |
| operations-runbook       | pass    | `runbook.md` (deploy, RPC, eth_call/cast, caveats, reset) |
| no-bypass-proof          | pass    | `no-bypass-proof.md` (Compass-only config + attestation; residual documented) closes W0-BLOCKER-007 operationally |
| known-limitations-adr    | pass    | ADR-0001 (on-chain policy), ADR-0002 (LLM veto), limitations recorded |

## Live deployment evidence

- `packages/coding-agent/deployments/monad-testnet/compass-policy.current.json` (sanitized).

## Carryover

- Wire `guardedForwardBridge` into the live proxy `tools/call` with a Monad RPC policy-read
  transport for a full end-to-end demo (package pipeline + on-chain contract both proven).
- Constitution amendment for ADR-0001/0002.
- Optional: explorer source verification; real-ERC20 mutation demo via guarded policy update.
