# Monad RPC Provider Evidence

Status: `pass_with_followup`

## Selected demo provider

- Label: `quicknode-public`
- Public URL: `https://testnet-rpc.monad.xyz`
- Reason: official public Monad Testnet endpoint; safe `eth_chainId` and short read-only checks succeeded.

## Fallback candidates

- `ankr-public`: `https://rpc.ankr.com/monad_testnet` — `eth_chainId` returned `0x279f`.
- `monadinfra-public`: `https://rpc-testnet.monadinfra.com` — `eth_chainId` returned `0x279f`.

## Observed safe behavior

- All three public providers returned `0x279f` (`10143`) for `eth_chainId`.
- Selected provider succeeded for read-only `eth_blockNumber`, `eth_getBlockByNumber` with `latest` and `finalized`, `eth_gasPrice`, `eth_maxPriorityFeePerGas`, and a safe zero-value placeholder `eth_estimateGas`.
- The `latest` sample is treated as provisional; `finalized` is recorded separately for stronger finality context.
- No `eth_sendRawTransaction`, signing, transfer, approval, or write was run.

## Official caveats for downstream waves

- `https://docs.monad.xyz/developer-essentials/testnets.md`: public endpoint labels and rate limits.
- `https://docs.monad.xyz/reference/json-rpc/overview.md`: async send validation, no pending tx lookup through `eth_getTransactionByHash`, provisional `latest`, provider-specific `eth_call`/`eth_estimateGas` limits, and debug trace option requirements.
- `https://docs.monad.xyz/developer-essentials/gas-pricing.md`: full gas limit charged, EIP-1559-compatible pricing, minimum base fee, block gas limit, transaction gas limit.
- `https://docs.monad.xyz/developer-essentials/transactions.md`: supported transaction types and unsupported type 3 blob transactions.

## Follow-up

`W0-BLOCKER-008`: this evidence is a short non-mutating sample, not a sustained reliability or rate-limit validation.
