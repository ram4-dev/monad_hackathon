/**
 * tools/list mirror and host-exposure filter (W1).
 *
 * Caches the upstream tool inventory and decides what the host sees. In W1 the host-facing
 * exposure is intentionally EMPTY: no upstream tool is advertised before the W2 semantics
 * registry exists (Q1 decision; constitution "no exposure without registry" invariant).
 *
 * W2 plugs the real registry into `exposedTools()` here; the upstream cache it reads is already
 * provided by UpstreamClient.
 */

import type { UpstreamClient } from "./upstreamClient.ts";

export type ExposedTool = {
  name: string;
  description?: string;
  inputSchema: { type: "object" };
};

export class ToolMirror {
  private readonly upstream: UpstreamClient;

  constructor(upstream: UpstreamClient) {
    this.upstream = upstream;
  }

  /** Internal upstream inventory count (for compass_status), not host-exposed. */
  upstreamToolCount(): number {
    return this.upstream.getUpstreamToolNames().length;
  }

  /**
   * Host-facing tool list. W1: always empty.
   *
   * INJECTION POINT (W2): replace the empty return with the registry-filtered list, mapping
   * upstream names to exposed names and attaching the registered input schemas.
   */
  exposedTools(): ExposedTool[] {
    return [];
  }
}
