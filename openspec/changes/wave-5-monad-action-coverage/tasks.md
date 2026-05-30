# Tasks: W5 Monad Action Coverage

W5 applies the W4 gate to each P0 tool and adds the per-user policy-contract lifecycle. It MUST keep default-deny, block unlimited/unknown allowances and key-management tools, gate every mutation, and require explicit consent for any testnet mutation.

## Review Workload Forecast

| Field                   | Value                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| Estimated changed lines | ~800-1300 source + test lines                                         |
| 400-line budget risk    | High                                                                  |
| Chained PRs recommended | Yes (per tool-class group)                                            |
| Suggested split         | (A) chain/read/sim; (B) execution/allowance/signature; (C) policy lifecycle |
| Delivery strategy       | chained-prs                                                           |

## Global Safety and Stop Gates

- [ ] Do not read `.env`, private keys, seeds, tokens, or credentials.
- [ ] Block unlimited/unknown allowances and key-management/private-key tools before the upstream.
- [ ] Gate every mutation through simulation + digest + on-chain policy + idempotency + LLM veto (W4).
- [ ] Require explicit consent for any testnet mutation; otherwise skip and record.
- [ ] Policy-contract update is owner-only (policy-over-policy); enforce per-user isolation.
- [ ] Reconcile real upstream/testnet behavior with W0 evidence; record blockers on divergence.

## Tasks

### 1. [ ] Chain management coverage
**Steps:** registry + gate for `add_custom_chain` (Monad config only) and `switch_chain` (10143 only).
**Acceptance:** other chains block; Monad Testnet allowed + audited.

### 2. [ ] Read-only coverage
**Steps:** `get_wallet_info`/`get_balance`/`get_token_balance` allow + audit on chain 10143.
**Acceptance:** read-only forwards + audited; wrong chain blocks.

### 3. [ ] Simulation coverage
**Steps:** `estimate_gas`/`simulate_transaction`; treat `dry_run_transaction` as absent.
**Acceptance:** simulation allowed + audited; absent tool not registered.

### 4. [ ] Transaction execution coverage
**Steps:** `transfer_token`/`send_transaction` via simulation + digest + on-chain policy + idempotency.
**Acceptance:** forwards only on full pass; idempotent; blocked otherwise.
**Stop gate:** no real broadcast without explicit consent.

### 5. [ ] Token allowance coverage
**Steps:** unlimited `approve_token` blocks; finite only on exact token+spender+amount+chain match against on-chain policy.
**Acceptance:** unlimited always blocks before upstream; finite exact-match allows.

### 6. [ ] Signature coverage
**Steps:** `sign_typed_data` mapped-only (domain/chainId/verifyingContract/primaryType); opaque blocks.
**Acceptance:** mapped typed data allowed; opaque blocks.

### 7. [ ] Per-user policy contract lifecycle
**Steps:** read (via W4); deploy/register + update as guarded on-chain actions; owner-only; bootstrap.
**Acceptance:** update guarded (digest+idempotency), owner-only, per-user isolated, audited.
**Stop gate:** reconcile contract shape/ownership with W3.

### 8. [ ] Monad RPC behavior
**Steps:** handle async send, no pending lookup, provisional latest, gas caveats, provider limits.
**Acceptance:** confirmation/idempotency assumptions hold under Monad RPC behavior.

### 9. [ ] Tests + apply/verify reports
**Steps:** per-class tests on mock; consent-gated real tests; map requirements to evidence; record blockers.
**Acceptance:** `bun test` green; `bun run typecheck` clean; verify-report maps specs to evidence.
