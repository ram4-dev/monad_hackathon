---
name: monad-development
description: Use for Compass Monad development tasks that touch Monad chain config, RPC, transactions, gas, EVM compatibility, wallet integration, MCP behavior, or agentic-payment flows. Consult the official Monad docs llms.txt index before implementing or reviewing Monad-specific behavior.
license: MIT
---

# Monad Development

Use this skill whenever work depends on Monad behavior rather than generic EVM assumptions.

Official docs index:

- https://docs.monad.xyz/llms.txt

## Required workflow

1. Fetch `https://docs.monad.xyz/llms.txt` first.
2. Pick the smallest official docs page(s) relevant to the task.
3. Fetch those pages before changing Monad-specific code, config, tests, or docs.
4. Cite the exact docs URLs in implementation notes, review notes, ADRs, or PR descriptions when they affect behavior.
5. If the official docs conflict with `docs/constitution.md`, pause and update the constitution or add an ADR before implementation.

## High-priority pages for this repo

From the `llms.txt` index, prefer these pages for Compass P0 work:

- Network/testnet config: `https://docs.monad.xyz/developer-essentials/testnets.md`
- Network information: `https://docs.monad.xyz/developer-essentials/network-information/index.md`
- Transactions: `https://docs.monad.xyz/developer-essentials/transactions.md`
- Gas pricing: `https://docs.monad.xyz/developer-essentials/gas-pricing.md`
- EVM differences: `https://docs.monad.xyz/developer-essentials/differences.md`
- Wallet integration: `https://docs.monad.xyz/developer-essentials/wallet-developers.md`
- JSON-RPC overview: `https://docs.monad.xyz/reference/json-rpc/overview.md`
- JSON-RPC API: `https://docs.monad.xyz/reference/json-rpc/api.md`
- Monad MCP guide: `https://docs.monad.xyz/guides/monad-mcp.md`
- Agentic payments: `https://docs.monad.xyz/tooling-and-infra/agentic-payments.md`
- EVM behavior: `https://docs.monad.xyz/guides/evm-resources/evm-behavior.md`

## Compass-specific rules

- Treat Monad docs as the source of truth for chain IDs, RPC behavior, gas semantics, transaction fields, wallet integration details, and current testnet/mainnet status.
- Do not hardcode `MONAD_CHAIN_ID`, RPC URLs, explorer URLs, gas behavior, or tx assumptions from memory.
- Keep P0 aligned with `docs/constitution.md`: Claude Code uses Compass through MCP; Compass reviews, applies policy, signs server-side only through delegated access, broadcasts, and audits.
- Never introduce a generic raw signing or raw send path while following Monad examples.
- If a Monad example shows direct signing for a tutorial, adapt it behind Compass review/policy/execution boundaries instead of copying it directly.

## Validation checklist

Before returning from Monad-specific work, confirm:

- [ ] Relevant Monad docs pages were fetched from the current `llms.txt` index.
- [ ] Any changed chain/RPC/gas/transaction assumptions cite official docs.
- [ ] Tests or PoC notes cover the assumption, or the item is added to W0 external validations.
- [ ] No secrets, private keys, API keys, delegated payloads, or token values were read, logged, or documented.
