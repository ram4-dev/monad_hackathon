# ADR-0002: LLM final safety review as a veto-only layer

- Status: Proposed (requires constitution amendment)
- Date: 2026-05-30
- Waves: W4 (implementation), W6 (demo)

## Context

The constitution and waves "Explicitly out of P0" list **"LLM as security authority"** as out of
scope. The product decision added a final LLM safety review: after all deterministic checks pass,
an LLM receives the sanitized action context and decides whether it is still safe to forward.

## Decision

- The LLM runs **only after** the deterministic floor (registry → evidence → simulation → risk →
  on-chain policy) returns `allow`.
- It is **veto-only**: it can turn a deterministic `allow` into a `block`, and can **never** turn a
  deterministic `block` into an `allow`. The deterministic floor remains authoritative.
- It is **fail-closed**: unavailable, error, timeout, malformed, or non-`safe` verdict → block.
- **No secrets** are sent to the LLM (sanitized context only); the verdict is audited (redacted).
- Provider: Azure OpenAI, configured via env (`.env.example`), never hardcoded.

## Consequences

- Adds latency + a model dependency on the forward path; bounded by timeout + fail-closed.
- A false "safe" cannot widen a block; a false "unsafe" only blocks (safe default).
- Diverges from the "LLM not a security authority" scope — framed as **defense-in-depth veto, not
  sole authority**. Requires a constitution amendment to ratify.

## Alternatives considered

- No LLM layer (original scope): simpler, but the product wanted an additional safety net.
- LLM as primary authority: rejected — non-deterministic and unsafe as the sole gate.
