# Design: W4 Guarded Forward Pipeline

## Status and intent

W4 implements the deterministic `tools/call` gate plus a veto-only LLM safety layer. It consumes W1 (proxy skeleton), W2 (registry) and W3 (on-chain per-user policy + identity), and produces the runtime that forwards a call only after every stage passes. W4 does not add per-tool Monad coverage (W5) or demo packaging (W6); it builds and unit-tests the generic gate against a mock upstream, a mock on-chain policy reader, and a mock LLM reviewer.

Source of truth: `docs/constitution.md` (overrides on conflict), the on-chain-policy version of `docs/development-waves.md`, and the W4 proposal/specs.

## Design principles

1. **Deterministic floor is authoritative.** `registry → required evidence → simulation/inspection → risk → policy(on-chain) → allow/block` is the security decision. Any stage failing → block.
2. **LLM is veto-only defense-in-depth.** It runs only after a deterministic `allow`, can only narrow to `block`, never widens. Fail-closed.
3. **Fail-closed everywhere.** Missing evidence, failed/absent simulation, unresolved/unreadable on-chain policy, unavailable LLM → block.
4. **No exposure of secrets.** RPC errors, upstream payloads and LLM I/O are sanitized; the LLM receives only sanitized context; nothing sensitive is persisted.
5. **Determinism of record.** Every decision is captured in a `GuardedForwardRecord` with the on-chain `policy_source` snapshot and (when applicable) `candidate_tx_digest` and `idempotency_key`.
6. **W3 interface is abstract.** User identity and the policy contract shape are owned by W3; W4 defines a thin resolver/reader interface and reconciles later.

## Pipeline

```text
tools/call (host)
  -> ToolSemantics lookup (W2 registry)            # unmapped -> UNMAPPED_TOOL (handled pre-W4 by W1/W2)
  -> required-field + required-evidence validation  # missing -> MISSING_REQUIRED_EVIDENCE
  -> simulation/inspection (write/sig/approval)      # failed/absent -> SIMULATION_FAILED/UNAVAILABLE
  -> risk checks                                     # wrong chain, unsafe allowance, gas over policy...
  -> on-chain policy evaluation (per-user contract)  # unresolved/unreadable -> USER_POLICY_UNRESOLVED / POLICY_CONTRACT_UNAVAILABLE; deny -> POLICY_BLOCKED
  -> deterministic decision: allow | block
       (block) -> safe explanation, NO upstream call, audit
  -> [allow] LLM final safety review (veto-only)     # unsafe/ambiguous/unavailable -> LLM_SAFETY_BLOCKED / LLM_SAFETY_UNAVAILABLE
  -> build candidate_tx_digest + idempotency_key (broadcast/execution)
  -> forward exactly one upstream tools/call
  -> audit (GuardedForwardRecord with policy_source + verdicts)
```

## Target module layout (constitution §9)

Code lives in the existing `packages/coding-agent/` package (**pure JavaScript `.js`**, matching W2/W3). W4 **reuses** the W2/W3 modules and adds only the new pieces; it does not reinvent policy/risk/audit. The root `mcp/proxy/` runtime bridges into the package the same way W2 did (`mcp/proxy/toolSemanticsBridge.ts` → `require("../../packages/coding-agent/src/...")`).

```text
packages/coding-agent/src/
  tool-semantics/              # REUSE (W2): resolver.js, walletAgentRegistry.js, types.js, blockedToolRules.js
  policy-source/               # REUSE (W3): policyContractClient.js, policyCache.js, policySnapshot.js,
                               #             policySourceConfig.js, compassPolicyAbi.js, policySourceErrors.js
  policy/                      # REUSE (W3): evaluatePolicy.js, policyDecision.js, policyToolKeys.js, keccak256.js
  risk/                        # REUSE (W3): riskChecks.js, policySourceRisk.js, riskTypes.js
  safe-errors/                 # REUSE + EXTEND (W3): safeError.js, redact.js (add W4 codes)
  audit/                       # REUSE (W3): auditEvent.js, auditWriter.js, auditRedaction.js
  guarded-forward/             # NEW: orchestrator wiring the ordered pipeline + GuardedForwardRecord
    guardedForward.js          #   registry -> evidence -> simulation -> risk -> policy -> allow/block -> LLM -> forward
    guardedForwardRecord.js    #   record builder incl. on-chain policy_source snapshot
  digest/                      # NEW: candidateTxDigest.js (canonical digest builder)
  idempotency/                 # NEW: idempotencyStore.js (key -> result reuse; no double execution)
  llm/                         # NEW: finalSafetyReview.js (veto-only reviewer), sanitizeContext.js
mcp/proxy/
  guardedForwardBridge.ts      # NEW (root, TS): wires runtime tools/call to guarded-forward (W2 bridge pattern)
```

Identity + on-chain policy reads are already provided by W3's `policy-source/` and `policy/` modules; W4 consumes them and does not duplicate the read client.

## Key contracts

### On-chain policy interface (consumed from W3's `policy-source/` + `policy/`)
W4 does not implement policy reads; it calls W3's existing modules:
- `policy-source/policyContractClient.js` — read-only ABI client (`eth_call`) against the deployed policy contract (chain `10143`).
- `policy-source/policySnapshot.js` — shape normalization + schema/version validation → `PolicySnapshot { version, block, rules }`.
- `policy-source/policyCache.js` — optional fresh-cache (disabled by default); freshness window.
- `policy-source/policySourceConfig.js` / `compassPolicyAbi.js` / `policySourceErrors.js` — binding/config + ABI + fail-closed error categories.
- `policy/evaluatePolicy.js` + `policy/policyDecision.js` — W2 resolver output + `PolicySnapshot` → `allow|block`.
- User identity is provided by the W3/runtime context; W4 treats it as opaque and reconciles with W3 if the binding changes. Any read/RPC/ABI/schema/chain/version failure → `block` (fail-closed).

### GuardedForwardRecord (constitution §8, extended)
Adds `policy_source`:
```ts
policy_source: {
  kind: "onchain";
  policy_contract_address: `0x${string}`;
  policy_chain_id: 10143;
  policy_version?: string;
  policy_block?: string;
}
llm_review?: { ran: boolean; verdict: "safe" | "unsafe" | "unavailable"; reason_redacted?: string }
```

### LLM final safety review
- Input: sanitized context — tool name + registry semantics, normalized args, `candidate_tx_digest`, simulation result summary, on-chain policy snapshot summary. No secrets.
- Output: structured `{ verdict: "safe" | "unsafe", reason: string }`. Any non-`safe`, timeout, error, or parse failure → treated as block (`LLM_SAFETY_BLOCKED` / `LLM_SAFETY_UNAVAILABLE`).
- Invariant: only invoked on a deterministic `allow`; can only block.

## Error model (W4 additions to SafeError)

`USER_POLICY_UNRESOLVED`, `POLICY_CONTRACT_UNAVAILABLE`, `DIGEST_MISMATCH`, `SIMULATION_FAILED`, `SIMULATION_UNAVAILABLE`, `LLM_SAFETY_BLOCKED`, `LLM_SAFETY_UNAVAILABLE` — in addition to the W1 set. All carry a sanitized `safe_message` and optional sanitized `debug_ref`.

## Data flow / handoff

- **From W1:** the `callInterceptor` stage scaffold and audit/SafeError surfaces.
- **From W2:** `ToolSemantics` for required fields/evidence/simulation/class.
- **From W3:** identity + policy contract + read interface (abstract).
- **To W5:** the generic gate is applied to each concrete P0 Monad tool class and to the policy-contract lifecycle actions.

## Review risks

- Reviewers should confirm the LLM layer is strictly veto-only and fail-closed (cannot widen a block).
- Confirm on-chain policy reads are fail-closed and cached with a freshness bound.
- Confirm digest coverage matches the constitution list and that digest mismatch blocks/re-simulates.

## Rollback

- Remove the new `packages/coding-agent/src/{guarded-forward,digest,idempotency,llm}/` modules and `mcp/proxy/guardedForwardBridge.ts`; the W2/W3 modules and the W1 proxy remain functional. No external mutation is introduced by W4.

## Validation checklist

- [ ] Blocked-at-each-stage cases never reach the upstream mock.
- [ ] Allowed call forwards exactly once.
- [ ] On-chain policy unresolved/unreadable → block; decision references policy snapshot.
- [ ] LLM unsafe/unavailable → block; LLM cannot widen a deterministic block.
- [ ] Digest mismatch → block/re-simulate; same idempotency_key → no second execution.
- [ ] Per-user isolation holds.
- [ ] No secrets / raw payloads / raw LLM I/O persisted.
