#!/usr/bin/env bash
# Launcher for the Compass MCP security proxy (stdio).
# Registered as the MCP command in the host (Claude Code / Claude Desktop). It sets the runtime
# environment, then execs the proxy, which spawns the Wallet Agent upstream behind the gate.
#
# Secrets (Azure key) are loaded by Bun from the repo .env automatically (cwd = repo root).
set -euo pipefail

REPO_DIR="/home/tokiou/hackatons/monad_hackathon"
cd "$REPO_DIR"

export PATH="$HOME/.bun/bin:$PATH"
export npm_config_registry="https://registry.npmjs.org/"
# Enable the W4/W5 guarded pipeline (on-chain policy read + LLM veto).
export POLICY_CONTRACT_ADDRESS="${POLICY_CONTRACT_ADDRESS:-0xf46fE939a947b6b300D9727ef94A2AbbCE07586C}"
export MONAD_RPC_URL="${MONAD_RPC_URL:-https://testnet-rpc.monad.xyz}"

exec "$HOME/.bun/bin/bun" run bin/compass-proxy.ts \
  --upstream "bunx wallet-agent@latest" \
  --chain monad-testnet \
  --policy ./config/policy.monad.onchain.example.json
