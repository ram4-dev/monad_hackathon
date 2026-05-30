/**
 * tools/list mirror and host-exposure filter (W1).
 *
 * Caches the upstream tool inventory and decides what the host sees. W1+W2 exposes only
 * upstream tools that are registered, schema-compatible, and default-allow in the W2 semantics
 * registry. Mutating/signing default-block tools remain hidden until W3/W4 guarded forwarding.
 */

import { filterHostExposedTools } from "./toolSemanticsBridge.ts";
import type { UpstreamClient } from "./upstreamClient.ts";

export type ExposedTool = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
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

  /** Host-facing tool list filtered through the W2 registry before policy. */
  exposedTools(): ExposedTool[] {
    return filterHostExposedTools(this.upstream.getUpstreamToolDescriptors()).map(({ descriptor, semantics }) => ({
      name: semantics.exposed_name,
      description: descriptor.description,
      inputSchema: descriptor.inputSchema ?? { type: "object" },
    }));
  }
}
