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

```text
mcp/proxy/callInterceptor.ts        # full pipeline (replaces W1 skeleton)
back/services/
  evm/
    rpc.ts                          # viem/RPC client for Monad Testnet reads (eth_call)
    digest.ts                       # canonical candidate_tx_digest builder
  policy/
    policyResolver.ts               # user identity (W3 iface) -> policy contract address
    onchainPolicyReader.ts          # read policy state via RPC; cache + freshness; fail-closed
    evaluatePolicy.ts               # allow|block against the on-chain policy snapshot
  risk/
    riskChecks.ts                   # chain/allowance/gas/evidence risk checks
  llm/
    finalSafetyReview.ts            # veto-only LLM reviewer (sanitized context -> verdict)
    sanitizeContext.ts              # strips secrets before sending to the LLM
  idempotency/
    idempotencyStore.ts             # key -> result reuse; no double execution
shared/types                        # extended SafeError, GuardedForwardRecord, verdict types
```

## Key contracts

### On-chain policy interface (consumed from W3, abstract)
- `resolveUserIdentity(callContext) -> UserId` — defined by W3; W4 treats it as opaque.
- `resolvePolicyContract(userId) -> { address, chainId: 10143 }`.
- `readPolicy(address) -> PolicySnapshot { version, block, rules }` via `eth_call`; cached with a freshness window; on any failure the reader returns "unavailable" → block.

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

- Remove the new `back/services/*` modules and revert `callInterceptor.ts` to the W1 skeleton. No external mutation is introduced by W4.

## Validation checklist

- [ ] Blocked-at-each-stage cases never reach the upstream mock.
- [ ] Allowed call forwards exactly once.
- [ ] On-chain policy unresolved/unreadable → block; decision references policy snapshot.
- [ ] LLM unsafe/unavailable → block; LLM cannot widen a deterministic block.
- [ ] Digest mismatch → block/re-simulate; same idempotency_key → no second execution.
- [ ] Per-user isolation holds.
- [ ] No secrets / raw payloads / raw LLM I/O persisted.
