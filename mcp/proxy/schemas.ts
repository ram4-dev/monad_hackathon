/**
 * Validation schemas and SafeError helpers for the Compass proxy (W1).
 */

import { z } from "zod";
import type { SafeError, SafeErrorCode } from "../../shared/types/index.ts";
import { MAX_ARGS_BYTES } from "../../shared/constants/index.ts";

/** Arguments of a tools/call must be a JSON object within a bounded serialized size. */
export const ToolCallArgsSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => Buffer.byteLength(JSON.stringify(obj), "utf8") <= MAX_ARGS_BYTES, {
    message: "arguments exceed maximum allowed size",
  });

export function makeSafeError(code: SafeErrorCode, message: string, debugRef?: string): SafeError {
  return debugRef ? { error_code: code, safe_message: message, debug_ref: debugRef } : { error_code: code, safe_message: message };
}

/**
 * Convert an arbitrary thrown value into a sanitized SafeError. Raw messages, stack traces and
 * upstream payloads are never copied into the safe message; only a generic message per code is
 * used, with an optional opaque debug_ref.
 */
export function sanitizeToSafeError(code: SafeErrorCode, debugRef?: string): SafeError {
  const messages: Record<SafeErrorCode, string> = {
    UNMAPPED_TOOL: "This tool is not exposed by Compass.",
    UPSTREAM_UNAVAILABLE: "The upstream is not available.",
    UPSTREAM_ERROR: "The upstream returned an error.",
    MISSING_REQUIRED_EVIDENCE: "The request is missing required fields.",
    POLICY_BLOCKED: "This tool is blocked by Compass in the current wave.",
    INTERNAL_ERROR: "An internal error occurred.",
    UNSUPPORTED_CHAIN: "The requested chain is not supported.",
    DIGEST_MISMATCH: "The candidate transaction digest did not match.",
    SIMULATION_FAILED: "Simulation failed.",
    SIMULATION_UNAVAILABLE: "Simulation is unavailable.",
    BROADCAST_FAILED: "Broadcast failed.",
  };
  return makeSafeError(code, messages[code], debugRef);
}

/** Render a SafeError as an MCP tool result (isError=true) without leaking internals. */
export function safeErrorToToolResult(error: SafeError): {
  isError: true;
  content: { type: "text"; text: string }[];
  structuredContent: { error: SafeError };
} {
  return {
    isError: true,
    content: [{ type: "text", text: `${error.error_code}: ${error.safe_message}` }],
    structuredContent: { error },
  };
}
