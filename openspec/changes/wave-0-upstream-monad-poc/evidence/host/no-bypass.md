# MCP Host No-Bypass Evidence

Status: `blocked` / operational limitation

## Boundary statement

Wallet Agent (`https://github.com/wallet-agent/wallet-agent`) is only the upstream MCP candidate behind Compass. The host-facing MCP execution surface for P0 must be Compass, not Wallet Agent directly.

## Evidence collected

No host MCP config files were inspected, because they can contain credentials, local paths, environment references, or other secret-bearing values. No sanitized operator-provided host config excerpt or host-visible tool listing was available during this apply pass.

## Result

- Direct Wallet Agent exposure found: `unknown` (not inspected).
- Compass-only host proof: unavailable.
- Blocker: `W0-BLOCKER-007`.

Before demo readiness, obtain a sanitized host-visible listing showing a Compass MCP entry and no direct Wallet Agent MCP entry.
