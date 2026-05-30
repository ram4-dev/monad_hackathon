# Change: W4 Guarded Forward Pipeline

## Intent

Turn the W1 proxy skeleton into the real security gate for `tools/call`. W4 implements the deterministic pipeline that decides whether a host call is forwarded to the Wallet Agent upstream: required-evidence validation, simulation/inspection, risk checks, and a `allow|block` decision evaluated against the **user's on-chain policy contract** on Monad Testnet (delivered by W3). On top of the deterministic decision, W4 adds a **final LLM safety review** as a veto-only defense-in-depth layer, plus a canonical `candidate_tx_digest`, idempotency for broadcast/execution, and a sanitized guarded-forward audit record.

W4 is the join point: proxy plumbing (W1) + registry (W2) + policy/risk/audit (W3) become a single runtime gate. W4 forwards a call only when every stage passes; otherwise it blocks before reaching the upstream.

## Context and Sources

Local sources of truth (constitution overrides product spec and wave docs on conflict):

- `docs/constitution.md` (v0.6) — §3.2 tool-call lifecycle, §6 policy/risk ordering, §8 SafeError + AuditEvent + GuardedForwardRecord.
- `docs/development-waves.md` — W4 section (on-chain per-user policy model).
- `compass_product_spec_monad_mcp_proxy_v0.2.md`.

Upstream interfaces consumed:

- **W1** — root runtime proxy `mcp/proxy/` (server/upstream lifecycle) and its bridge pattern `mcp/proxy/toolSemanticsBridge.ts` → `packages/coding-agent/src/...`.
- **W2** — `packages/coding-agent/src/tool-semantics/` (`resolver.js`, `walletAgentRegistry.js`, `types.js`, `blockedToolRules.js`): `tool_class`, `required_fields`, `required_evidence`, `requires_simulation`, `policy_checks`.
- **W3** — `packages/coding-agent/src/policy-source/` (on-chain policy read client/cache/snapshot/config/ABI/errors), `packages/coding-agent/src/policy/` (`evaluatePolicy.js`, `policyDecision.js`), `packages/coding-agent/src/risk/`, `packages/coding-agent/src/safe-errors/`, `packages/coding-agent/src/audit/`, plus the deployed policy contract under `packages/coding-agent/contracts/` and `deployments/monad-testnet`. User identity binding is owned by W3 and treated as opaque here.

Official Monad references:

- `https://docs.monad.xyz/reference/json-rpc/api.md` (`eth_call` reads of the policy contract).
- `https://docs.monad.xyz/developer-essentials/transactions.md`, `https://docs.monad.xyz/developer-essentials/gas-pricing.md`.

## Scope

### In Scope

- `callInterceptor` implementing the full ordering: `registry → required evidence → simulation/inspection → risk → policy(on-chain) → deterministic allow/block → LLM final safety review (veto-only) → forward/block → audit`.
- Required-field validation driven by `ToolSemantics` (W2).
- Simulation/dry-run orchestration for write/signature/token-approval classes.
- On-chain policy resolution: resolve the user's identity (W3) → the user's policy contract address → read its state via RPC, with caching, a freshness rule, and fail-closed semantics.
- Canonical `candidate_tx_digest` builder and `GuardedForwardRecord` with an on-chain `policy_source` snapshot.
- Idempotency store/result reuse for any broadcast/execution tool.
- **LLM final safety review**: a sanitized-context, veto-only safety gate that runs after the deterministic `allow`, can only further block, and is fail-closed.
- Forward path (exactly one upstream `tools/call` after full pass) and block path (never contacts upstream, returns a safe explanation).
- Extended `SafeError` set and sanitized audit for every terminal path.

### Non-Goals

- No new Monad action coverage per tool (that is W5); W4 builds the generic gate and validates it with the mock upstream + a mock policy reader.
- No implementation of the on-chain policy **contract** itself or the user-identity scheme (owned by W3); W4 consumes their interfaces.
- No demo packaging, runbook, or end-to-end hardening (W6).
- No real broadcast of mutations as a W4 deliverable; mutation coverage is exercised in W5 under consent.
- No secrets read/logged; no raw upstream/LLM payloads persisted.
- The LLM is **not** the primary security authority; it cannot widen a deterministic block.

## Capabilities

| Capability Domain               | Type | Purpose                                                                                                          |
| ------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| `call-interceptor-pipeline`     | New  | The ordered `tools/call` gate and required-field validation from `ToolSemantics`.                                |
| `onchain-policy-resolution`     | New  | Resolve user identity (W3) → policy contract → read state via RPC, cached, fresh, fail-closed.                   |
| `candidate-tx-digest`           | New  | Canonical digest over chain/account/target/value/data/tool/args/token/spender/amount/gas-fee.                    |
| `idempotency`                   | New  | Idempotency key + store so a retry cannot execute a second time.                                                 |
| `guarded-forward-and-block`     | New  | Forward exactly once after full pass; block never reaches upstream and returns a safe explanation.               |
| `guarded-forward-record-audit`  | New  | `GuardedForwardRecord` with on-chain `policy_source` snapshot + sanitized audit for every terminal path.         |
| `safe-errors-w4`                | New  | Extended `SafeError` codes for policy/simulation/digest/LLM failures, with no leakage.                            |
| `llm-final-safety-review`       | New  | Veto-only LLM safety layer after the deterministic decision; fail-closed; sanitized context; audited verdict.    |

## Affected Areas

Code lives in the existing `packages/coding-agent/` package (**pure JavaScript `.js`**, matching W2/W3). W4 reuses W2/W3 modules and adds only new pieces.

- **Reuse (no reinvention):** `packages/coding-agent/src/tool-semantics/` (W2 resolver/registry), `packages/coding-agent/src/policy/` + `packages/coding-agent/src/policy-source/` (W3 on-chain policy read + evaluation), `packages/coding-agent/src/risk/` (W3), `packages/coding-agent/src/safe-errors/` (W3, extended with W4 codes), `packages/coding-agent/src/audit/` (W3).
- **New modules:** `packages/coding-agent/src/guarded-forward/` (pipeline orchestrator + `GuardedForwardRecord`), `packages/coding-agent/src/digest/` (`candidate_tx_digest`), `packages/coding-agent/src/idempotency/`, `packages/coding-agent/src/llm/` (final safety reviewer + context sanitizer).
- **Runtime wiring:** a new root `mcp/proxy/guardedForwardBridge.ts` following the W2 `mcp/proxy/toolSemanticsBridge.ts` pattern, invoking the package orchestrator on `tools/call`.
- **Tests:** `packages/coding-agent/test/` with a mock upstream (W1 fixtures), the W3 policy-source against a mock/test contract, and a mock LLM reviewer.

## Safety Requirements

- The deterministic floor is authoritative: registry → evidence → simulation → risk → on-chain policy must all pass before any forward; a failure at any stage blocks.
- The LLM layer is **veto-only and fail-closed**; unavailable/ambiguous/unsafe → block. It can never turn a deterministic block into an allow.
- On-chain policy resolution is fail-closed: unresolved/unreadable policy → block.
- No secrets, private keys, seeds, tokens, raw upstream payloads, raw RPC errors, or raw LLM I/O are persisted; the LLM receives only sanitized context.
- Writes/signatures/token-approvals require minimum evidence + simulation/inspection + a `candidate_tx_digest` before any forward; idempotency is mandatory for broadcast/execution.

## Risks

- On-chain policy reads add latency and RPC failure modes; mitigated by caching + freshness + fail-closed.
- The LLM layer can add latency and false negatives/positives; it is veto-only so a false "safe" cannot override deterministic block, and a false "unsafe" only blocks (safe default).
- W3 interface (identity + contract shape) is not final; W4 keeps it abstract and reconciles later.
- Digest coverage gaps could let an effect change without re-evaluation; mitigated by digest-mismatch → block/re-simulate.

## Rollback

- Revert the `wave-4-guarded-forward-pipeline` change and the new `packages/coding-agent/src/{guarded-forward,digest,idempotency,llm}/` modules + `mcp/proxy/guardedForwardBridge.ts`; W2/W3 modules and the W1 proxy remain functional.
- No persistent external state is introduced beyond the local idempotency store and audit log (both git-ignored/local).

## Success Criteria

- Blocked calls are proven not to reach the upstream mock.
- Allowed calls forward exactly one upstream `tools/call`.
- The `allow|block` decision is evaluated against the user's on-chain policy snapshot, recorded in the audit/`GuardedForwardRecord`; unresolved/unreadable policy → block.
- The LLM final safety layer runs only after a deterministic `allow`, can only block, is fail-closed, and its sanitized verdict is audited.
- Digest mismatch blocks or forces re-simulation/re-evaluation; the same `idempotency_key` cannot execute twice.
- Per-user isolation holds: user A's policy never governs user B.
- Every terminal path writes sanitized audit; no secrets or raw payloads are persisted.
