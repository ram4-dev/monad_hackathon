/**
 * Wallet Agent upstream adapter config (P0).
 *
 * Owns: how to parse the upstream command into argv, how to build a secret-safe child
 * environment with the npm public-registry override (W0-BLOCKER-001), and the W1
 * classification of a tool name against the provisional read-only allowlist.
 */

import {
  PROVISIONAL_READONLY_ALLOWLIST,
  ALWAYS_BLOCKED_TOOLS,
  META_TOOLS,
  DEFAULTS,
  UPSTREAM_ENV_ALLOWLIST,
} from "../../../shared/constants/index.ts";
import type { ToolClass } from "../../../shared/types/index.ts";

/**
 * Split a command string into argv. Minimal shell-style splitting that honors single and
 * double quotes; it deliberately performs NO variable interpolation, so no secret can be
 * expanded into the argv.
 */
export function parseCommand(command: string): { command: string; args: string[] } {
  const tokens: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  if (tokens.length === 0) {
    throw new Error("empty upstream command");
  }
  return { command: tokens[0]!, args: tokens.slice(1) };
}

/**
 * Build the child environment from an allowlist of the parent env plus the npm registry
 * override. Secret-bearing variables are not forwarded verbatim.
 */
export function buildUpstreamEnv(parentEnv: Record<string, string | undefined>): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of UPSTREAM_ENV_ALLOWLIST) {
    const value = parentEnv[key];
    if (typeof value === "string") env[key] = value;
  }
  // Resolve W0-BLOCKER-001: ensure the upstream resolves from the public registry unless the
  // operator already set it explicitly.
  env.npm_config_registry = parentEnv.npm_config_registry ?? DEFAULTS.npmRegistry;

  // Operator provisioning of the executor's signing key. The Wallet Agent is the wallet executor
  // and is meant to hold a key; this passes the key into the UPSTREAM process env only (under the
  // name Wallet Agent reads, WALLET_PRIVATE_KEY). The key value never reaches the host/LLM, Compass
  // audit, or tool arguments — bootstrap imports it by env-var NAME, not value. Without it the
  // upstream stays on its mock accounts (read-only demo).
  const signer = parentEnv.COMPASS_UPSTREAM_SIGNER_KEY ?? parentEnv.MONAD_DEPLOYER_PRIVATE_KEY;
  if (typeof signer === "string" && signer.length > 0) {
    env.WALLET_PRIVATE_KEY = signer;
  }
  return env;
}

export type Classification =
  | { kind: "meta" }
  | { kind: "forward"; toolClass: ToolClass }
  | { kind: "block"; toolClass: ToolClass; reason: "blocked_class" | "unmapped" };

/**
 * Classify a tool name for W1 routing.
 * - meta-tools are handled locally;
 * - provisional read-only/simulation tools forward;
 * - known sensitive tools block with their class;
 * - anything else is unmapped and blocks.
 */
export function classifyTool(toolName: string): Classification {
  if (META_TOOLS.includes(toolName)) return { kind: "meta" };

  const allowed = PROVISIONAL_READONLY_ALLOWLIST[toolName];
  if (allowed) return { kind: "forward", toolClass: allowed };

  const blockedClass = ALWAYS_BLOCKED_TOOLS[toolName];
  if (blockedClass) return { kind: "block", toolClass: blockedClass, reason: "blocked_class" };

  return { kind: "block", toolClass: "unknown", reason: "unmapped" };
}
