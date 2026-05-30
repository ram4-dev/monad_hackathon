/**
 * MCP client toward the Wallet Agent upstream (W1).
 *
 * Compass speaks as an MCP client to the upstream over stdio (constitution §3.3). This module
 * owns the upstream process lifecycle: start, handshake, tools/list cache, callTool with a
 * per-call timeout, bounded stderr capture, and graceful shutdown. A transport factory is
 * injectable so tests can connect to an in-memory mock without spawning a process.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { parseCommand, buildUpstreamEnv } from "../../back/services/adapters/walletAgent.ts";
import { withInputSchemaHash } from "./toolSemanticsBridge.ts";
import type { ProxyConfig, UpstreamState } from "../../shared/types/index.ts";
import type { UpstreamToolDescriptor } from "./toolSemanticsBridge.ts";

const STDERR_BUFFER_LIMIT = 16 * 1024;

export type UpstreamTransportFactory = (config: ProxyConfig) => Transport;

/** Default factory: spawn the configured command over stdio with a secret-safe environment. */
export const defaultStdioTransportFactory: UpstreamTransportFactory = (config) => {
  if (config.upstreamTransport !== "stdio") {
    throw new Error(`unsupported upstream transport: ${config.upstreamTransport}`);
  }
  const { command, args } = parseCommand(config.upstreamCommand);
  return new StdioClientTransport({
    command,
    args,
    env: buildUpstreamEnv(process.env),
    stderr: "pipe",
  });
};

export class UpstreamClient {
  private readonly config: ProxyConfig;
  private readonly transportFactory: UpstreamTransportFactory;
  private client: Client | null = null;
  private transport: Transport | null = null;
  private toolNames: string[] = [];
  private toolDescriptors: UpstreamToolDescriptor[] = [];
  private stderrBuffer = "";
  private state: UpstreamState;

  constructor(config: ProxyConfig, transportFactory: UpstreamTransportFactory = defaultStdioTransportFactory) {
    this.config = config;
    this.transportFactory = transportFactory;
    this.state = {
      connected: false,
      managedByCompass: true,
      transport: config.upstreamTransport,
      serverName: null,
      serverVersion: null,
      upstreamToolCount: 0,
      reason: null,
    };
  }

  getState(): UpstreamState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  /** Number of upstream tools discovered internally (not host-exposed). */
  getUpstreamToolNames(): string[] {
    return [...this.toolNames];
  }

  /** Full upstream tools/list descriptors with deterministic W2 input_schema_hash values. */
  getUpstreamToolDescriptors(): UpstreamToolDescriptor[] {
    return this.toolDescriptors.map((descriptor) => ({ ...descriptor }));
  }

  getUpstreamToolDescriptor(name: string): UpstreamToolDescriptor | undefined {
    const descriptor = this.toolDescriptors.find((tool) => tool.name === name);
    return descriptor ? { ...descriptor } : undefined;
  }

  /**
   * Start the upstream process and complete the MCP handshake + tools/list. Never throws;
   * on failure it records a safe reason and leaves the proxy able to serve meta-tools.
   */
  async connect(): Promise<void> {
    try {
      const transport = this.transportFactory(this.config);
      this.transport = transport;
      this.captureStderr(transport);

      const client = new Client(
        { name: "compass-proxy", version: "0.1.0" },
        { capabilities: {} },
      );
      this.client = client;

      await this.withTimeout(
        client.connect(transport),
        this.config.connectTimeoutMs,
        "connect",
      );

      const serverInfo = client.getServerVersion();
      const tools = await this.withTimeout(client.listTools(), this.config.connectTimeoutMs, "list");
      this.toolDescriptors = tools.tools.map((tool) =>
        withInputSchemaHash({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
        }),
      );
      this.toolNames = this.toolDescriptors.map((tool) => tool.name);

      this.state = {
        connected: true,
        managedByCompass: true,
        transport: this.config.upstreamTransport,
        serverName: serverInfo?.name ?? null,
        serverVersion: serverInfo?.version ?? null,
        upstreamToolCount: this.toolNames.length,
        reason: null,
      };
    } catch (err) {
      this.state = {
        ...this.state,
        connected: false,
        reason: this.safeReason(err),
      };
    }
  }

  /**
   * Forward a tools/call to the upstream with a per-call timeout. Caller is responsible for
   * having decided the call is allowed; this method does not classify.
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.client || !this.state.connected) {
      throw new UpstreamUnavailableError("upstream not connected");
    }
    return this.client.callTool({ name, arguments: args }, undefined, {
      timeout: this.config.callTimeoutMs,
    });
  }

  /** Graceful shutdown: closing the transport closes child stdin and terminates the process. */
  async shutdown(): Promise<void> {
    try {
      await this.client?.close();
    } catch {
      // ignore
    }
    try {
      await this.transport?.close();
    } catch {
      // ignore
    }
    this.state = { ...this.state, connected: false };
  }

  private captureStderr(transport: Transport): void {
    // StdioClientTransport exposes a stderr stream when stderr: "pipe".
    const maybeStderr = (transport as { stderr?: { on?: (e: string, cb: (chunk: Buffer) => void) => void } }).stderr;
    if (maybeStderr && typeof maybeStderr.on === "function") {
      maybeStderr.on("data", (chunk: Buffer) => {
        // Bounded, never forwarded to host/audit/logs; used only for a sanitized debug_ref.
        this.stderrBuffer = (this.stderrBuffer + chunk.toString("utf8")).slice(-STDERR_BUFFER_LIMIT);
      });
    }
  }

  private safeReason(err: unknown): string {
    if (err instanceof UpstreamUnavailableError) return err.safeReason;
    if (err instanceof TimeoutError) return `timeout during ${err.phase}`;
    // Never echo raw error text; return a generic, safe reason.
    return "upstream failed to start or handshake";
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, phase: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(phase)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export class UpstreamUnavailableError extends Error {
  readonly safeReason: string;
  constructor(safeReason: string) {
    super(safeReason);
    this.name = "UpstreamUnavailableError";
    this.safeReason = safeReason;
  }
}

export class TimeoutError extends Error {
  readonly phase: string;
  constructor(phase: string) {
    super(`timeout during ${phase}`);
    this.name = "TimeoutError";
    this.phase = phase;
  }
}
