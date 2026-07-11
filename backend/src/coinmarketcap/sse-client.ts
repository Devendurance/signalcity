// ============================================================
// Signal City — CMC MCP SSE Client
// Handles Server-Sent Events transport for the CMC MCP endpoint.
// ============================================================

const CMC_MCP_URL = "https://mcp.coinmarketcap.com/mcp";
const CMC_API_KEY = "8d051f3e9a7847b6956ec28537c80764";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * SSE-aware MCP client for the CMC endpoint.
 * The CMC MCP uses Server-Sent Events for streaming responses.
 */
export class CMCSSEClient {
  private apiKey: string;
  private baseUrl: string;
  private toolCache: MCPTool[] | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? CMC_API_KEY;
    this.baseUrl = CMC_MCP_URL;
  }

  async listTools(): Promise<MCPTool[]> {
    if (this.toolCache) return this.toolCache;
    const result = await this.sseRpcCall("tools/list");
    const tools = (result as { tools: MCPTool[] })?.tools ?? [];
    this.toolCache = tools;
    return tools;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    return this.sseRpcCall("tools/call", { name, arguments: args });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Make an SSE-based JSON-RPC call.
   * The CMC MCP endpoint returns Server-Sent Events containing JSON-RPC responses.
   */
  private async sseRpcCall(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown> {
    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    });

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-CMC-MCP-API-KEY": this.apiKey,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `CMC MCP error: HTTP ${response.status} ${response.statusText}${errorText ? ` — ${errorText.slice(0, 200)}` : ""}`,
      );
    }

    // Parse SSE stream
    const text = await response.text();

    if (!text || text.trim().length === 0) {
      // Some MCP endpoints return the body directly (not SSE-wrapped)
      return {};
    }

    // Try direct JSON first (some responses aren't SSE-wrapped)
    try {
      const direct = JSON.parse(text);
      if (direct.result) return direct.result;
      if (direct.error) throw new Error(`CMC error: ${direct.error.message ?? JSON.stringify(direct.error)}`);
      return direct;
    } catch {
      // Not direct JSON — parse as SSE
    }

    return parseSSEStream(text);
  }
}

/**
 * Parse Server-Sent Events stream into a result object.
 */
function parseSSEStream(text: string): unknown {
  const events = text.split("\n\n").filter(Boolean);

  for (const event of events) {
    const lines = event.split("\n");
    let data = "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        data += line.slice(6);
      }
    }

    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (parsed.result !== undefined) return parsed.result;
        if (parsed.error) {
          throw new Error(`CMC error: ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return {};
}
