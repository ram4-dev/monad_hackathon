# ADR 0001: Wave 3 policy source moves on-chain for Monad Testnet

## Status

Accepted for Wave 3 implementation.

## Context

`docs/constitution.md` originally described the initial P0 policy as a local demo policy. During Wave 3 SDD the product direction changed: policies must live in a smart contract on Monad Testnet and Compass must read that contract as the policy source of truth.

Official Monad docs refreshed for this decision:

- https://docs.monad.xyz/llms.txt
- https://docs.monad.xyz/developer-essentials/testnets.md
- https://docs.monad.xyz/guides/deploy-smart-contract/foundry.md
- https://docs.monad.xyz/developer-essentials/differences.md

## Decision

Wave 3 implements an immutable, non-proxy `CompassPolicy` contract on Monad Testnet (`chain_id=10143`) as the policy source of truth. Compass reads policy state through a read-only ABI client and fails closed when the configured contract address, RPC, ABI, schema, policy version, or snapshot cannot be safely validated.

Policy updates are owner-managed and versioned on-chain. Local fixtures are allowed only as tests/mocks/snapshots, never as runtime policy authority.

Live deployment is gated separately and requires explicit approval plus public deployment parameters; Wave 3 apply adds contract/read-client/evidence scaffolding but does not broadcast deploy transactions.

## Consequences

- W3 implementation must not use a local JSON policy as runtime authority.
- W4 must call W3 primitives before forwarding and treat policy-source failures as non-forwardable blocks.
- Testnet reset or stale addresses block until redeploy and config/evidence updates.
- Deployment runbooks must use secret-safe keystore/account flow and must not log private keys, keystore contents, or secret-bearing RPC URLs.
