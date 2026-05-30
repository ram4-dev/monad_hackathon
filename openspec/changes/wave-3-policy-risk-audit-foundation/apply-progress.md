# Apply Progress — wave-3-policy-risk-audit-foundation

## Status

Applied as a single PR scope with internal review slices preserved. High review risk was accepted by the user before apply.

## Completed tasks

- 0.1 Delivery strategy resolved: single PR accepted despite high risk.
- 0.2 Refreshed official Monad docs before Monad-specific implementation.
- 1.1–1.4 Contract slice implemented: Foundry config/tests, immutable `CompassPolicy`, helper scripts, ABI fragment.
- 2.1–2.5 Policy-source slice implemented: config, read-only transport client, snapshot validation, disabled-by-default cache, tests.
- 3.1–3.5 Policy/risk/safe-error slice implemented: keccak tool keys, `evaluatePolicy`, deterministic risk checks, safe error/redaction, tests.
- 4.1–4.4 Audit/evidence/runbook slice implemented: append-only JSONL writer, metadata allowlists, deployment example, OpenSpec evidence path, contract README.
- 6.1–6.5 Verification completed with Node tests, Foundry tests/build, OpenSpec CLI availability check, evidence outputs, and non-goal review.

## Gated / not run

- 5.1 Live deploy approval: not provided in this task; gate remains closed.
- 5.2 Live Monad Testnet deploy/verification: not run. No broadcast/signing/deploy command was run, and no real deployment evidence or `compass-policy.current.json` was created.

## Files changed

- `docs/adr/0001-onchain-policy-source.md`
- `openspec/config.yaml`
- `openspec/changes/wave-3-policy-risk-audit-foundation/**`
- `packages/coding-agent/contracts/**`
- `packages/coding-agent/deployments/monad-testnet/compass-policy.example.json`
- `packages/coding-agent/src/policy-source/**`
- `packages/coding-agent/src/policy/**`
- `packages/coding-agent/src/risk/**`
- `packages/coding-agent/src/safe-errors/**`
- `packages/coding-agent/src/audit/**`
- `packages/coding-agent/test/policy-source/**`
- `packages/coding-agent/test/policy/**`
- `packages/coding-agent/test/risk/**`
- `packages/coding-agent/test/safe-errors/**`
- `packages/coding-agent/test/audit/**`

Ignored/unrelated:

- `packages/dashboard/` remains untracked and was not read, edited, imported, or included.

## Test commands run

| Command                                                          | Result                                                             | Evidence                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `cd packages/coding-agent && npm test`                           | PASS — 37/37 node:test tests                                       | `evidence/verification/package-test-output.txt`                                                          |
| `cd packages/coding-agent/contracts && forge test`               | PASS — 4/4 Solidity tests                                          | `evidence/verification/forge-test-output.txt`                                                            |
| `cd packages/coding-agent/contracts && forge build`              | PASS                                                               | `evidence/verification/forge-build-output.txt`                                                           |
| `openspec validate wave-3-policy-risk-audit-foundation --strict` | NOT RUN — CLI unavailable in PATH; manual fallback review recorded | `evidence/verification/openspec-cli-unavailable.txt`, `evidence/verification/manual-openspec-review.txt` |

## RED/GREEN evidence

Strict TDD is not active, but Wave 3 tasks requested RED/GREEN evidence where practical.

| Slice                                          | RED evidence                                                                                                                                                                      | GREEN evidence                                                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| JS policy-source/policy/risk/safe-errors/audit | Added tests first; `npm test` failed with missing W3 modules (`MODULE_NOT_FOUND`) (retrospective summary in `evidence/verification/red-phase-summary.txt`)                        | Implemented W3 modules, verify-blocker fixes, and review redaction fixes; final `npm test` passed 37/37 |
| Solidity contract                              | Added `CompassPolicy.t.sol` before contract; `forge test` failed because `CompassPolicy.sol` was missing (retrospective summary in `evidence/verification/red-phase-summary.txt`) | Implemented `CompassPolicy.sol`; final `forge test` passed 4/4 and `forge build` passed                 |

## Monad docs refresh

Fetched current official docs before implementation:

- https://docs.monad.xyz/llms.txt
- https://docs.monad.xyz/developer-essentials/testnets.md
- https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
- https://docs.monad.xyz/developer-essentials/differences.md

No conflict with the on-chain Wave 3 design was found. A local constitution drift was addressed with ADR `docs/adr/0001-onchain-policy-source.md` because the older constitution text described an initial local policy.

## Deviations from design

- No `viem` dependency was added. The policy contract client is transport-only and mockable for W3; it expects a read-only transport with `request` and `readContract` methods.
- Timeout/retry/fallback endpoint orchestration remains transport-adapter responsibility for W3; current client executes a single provided transport and fails closed on read errors.
- `compass-policy.current.json` was not created because no approved live deployment exists.
- OpenSpec CLI validation could not run because the `openspec` binary was unavailable in PATH.

## Workload / PR boundary

- Delivery: single PR accepted by user despite high risk.
- Internal review slices preserved in file layout and task sections: contract, policy-source, policy/risk/safe-errors, audit/evidence/runbook, gated live deploy evidence.

## Remaining tasks

- Provide live deployment parameters and explicit approval if/when W3 should deploy `CompassPolicy` to Monad Testnet.
- Run OpenSpec validation when CLI is available.
- W4 must still implement guarded forwarding/no-forward proof/digest/idempotency before any Wallet Agent tool call forwarding.
