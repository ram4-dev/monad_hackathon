# No-Bypass Proof (W6) — closes W0-BLOCKER-007

## Claim

The demo host uses **Compass only**; the Wallet Agent upstream is never configured directly in the
host MCP config. Compass manages the upstream internally.

## Evidence

### 1. Host MCP config shows Compass only

The documented and demo host configuration registers a single MCP server — Compass — and launches
the upstream itself:

```bash
claude mcp add compass-wallet -- compass-proxy \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy <on-chain policy contract reference>
```

There is no `wallet-agent` entry in the host MCP config. (Sanitized `claude mcp list` output should
show only `compass-wallet`.)

### 2. compass_status attests internal management

`compass_status.upstream.managed_by_compass = true` and the host has no direct upstream connection
(W1 verified: the proxy spawns and owns the upstream over stdio).

### 3. Host-facing surface is registry-gated

`tools/list` exposes only registry-mapped tools; nothing reaches the upstream without passing the
guarded pipeline (W4) and the on-chain policy (W3) — so even if a tool name is known, it cannot be
invoked outside Compass's gate.

## Residual gap

W1–W6 prove the **operational** no-bypass (host config + attestation + gated surface). A *technical*
enforcement that an operator cannot manually add Wallet Agent to their own host config is outside
Compass's control (it is host-side configuration). This is recorded as the residual of
`W0-BLOCKER-007`: it is mitigated by documentation, the Compass-only setup, and the attestation, and
closed for P0 demo purposes; a hardened host-config policy is future work.
