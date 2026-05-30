/**
 * Bridge from the W1 TypeScript proxy to the W2 CommonJS tool-semantics registry.
 *
 * Keeps W2 runtime decisions pure: schema hashes are computed from upstream tools/list
 * descriptors, then the W2 resolver decides visibility/block reasons before W3 policy exists.
 */

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import type { SafeErrorCode, ToolClass } from "../../shared/types/index.ts";

const require = createRequire(import.meta.url);

export type UpstreamToolDescriptor = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  input_schema_hash?: string;
  inputSchemaHash?: string;
};

type ToolSemantics = {
  tool_name: string;
  exposed_name: string;
  input_schema_hash: string;
  tool_class: ToolClass;
  default_decision: "allow" | "block";
};

type W2Resolution =
  | {
      status: "visible";
      tool_name: string;
      semantics: ToolSemantics;
      matched_input_schema_hash?: string;
    }
  | {
      status: "hidden" | "blocked" | "disabled" | "unsupported";
      tool_name: string;
      safe_reason_code: SafeErrorCode;
      blocker_ids?: string[];
      evidence_refs?: string[];
    };

type ToolSemanticsModule = {
  resolveToolDescriptor: (descriptor: UpstreamToolDescriptor | { name: string }) => W2Resolution;
  filterVisibleTools: (descriptors: UpstreamToolDescriptor[]) => W2Resolution[];
  getToolSemantics: (toolName: string) => ToolSemantics | undefined;
};

const toolSemantics = require("../../packages/coding-agent/src/tool-semantics/index.js") as ToolSemanticsModule;

/** canonical_json_v1: recursively sort object keys, preserve array order, compact JSON. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function inputSchemaHash(inputSchema: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(inputSchema)).digest("hex")}`;
}

export function withInputSchemaHash(descriptor: UpstreamToolDescriptor): UpstreamToolDescriptor {
  if (descriptor.input_schema_hash || descriptor.inputSchemaHash || !descriptor.inputSchema) {
    return { ...descriptor };
  }
  return { ...descriptor, input_schema_hash: inputSchemaHash(descriptor.inputSchema) };
}

export type HostVisibleTool = {
  descriptor: UpstreamToolDescriptor;
  semantics: ToolSemantics;
};

/**
 * Host tools/list exposure.
 * - W1/W2 (default): registered + schema-compatible + default-allow only. Mutating/signing tools
 *   stay hidden until guarded forwarding exists.
 * - With the W4/W5 guarded pipeline active (`exposeAllVisible=true`): expose ALL registry-visible
 *   tools (write/signature included). They remain gated at call time by the on-chain policy +
 *   simulation + LLM. `status !== "visible"` (private-key/keystore/unmapped/drifted) stays hidden.
 */
export function filterHostExposedTools(descriptors: UpstreamToolDescriptor[], exposeAllVisible = false): HostVisibleTool[] {
  const hashed = descriptors.map(withInputSchemaHash);
  const descriptorByName = new Map(hashed.map((descriptor) => [descriptor.name, descriptor]));

  return toolSemantics
    .filterVisibleTools(hashed)
    .filter((result): result is Extract<W2Resolution, { status: "visible" }> => result.status === "visible")
    .filter((result) => exposeAllVisible || result.semantics.default_decision === "allow")
    .map((result) => ({
      descriptor: descriptorByName.get(result.tool_name) ?? { name: result.tool_name },
      semantics: result.semantics,
    }));
}

export function resolveToolForCall(
  toolName: string,
  descriptor: UpstreamToolDescriptor | undefined,
  upstreamConnected: boolean,
): W2Resolution {
  if (descriptor) {
    return toolSemantics.resolveToolDescriptor(withInputSchemaHash(descriptor));
  }

  const resolution = toolSemantics.resolveToolDescriptor({ name: toolName });
  const semantics = toolSemantics.getToolSemantics(toolName);

  // If the upstream is down, no tools/list cache exists. Preserve the old W1 behavior for
  // registered tools: let handleUpstreamCall return UPSTREAM_UNAVAILABLE instead of SCHEMA_DRIFT.
  // Unsupported/private-key/dangerous/unmapped names still block before any upstream contact.
  if (!upstreamConnected && semantics && resolution.status === "disabled" && resolution.safe_reason_code === "SCHEMA_DRIFT") {
    return {
      status: "visible",
      tool_name: toolName,
      semantics,
      matched_input_schema_hash: undefined,
    };
  }

  return resolution;
}
