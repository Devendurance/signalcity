// ============================================================
// Signal City — CMC MCP Client
// Low-level JSON-RPC client for the CoinMarketCap MCP endpoint.
// Handles tool discovery and tool invocation.
// ============================================================

const CMC_MCP_URL = "https://mcp.coinmarketcap.com/mcp";
const CMC_API_KEY = "8d051f3e9a7847b6956ec28537c80764";

// ---- Types ----

interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// ---- Client ----

export class CMCMCPClient {
  private baseUrl: string;
  private apiKey: string;
  private requestId = 0;
  private toolCache: MCPTool[] | null = null;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? CMC_API_KEY;
    this.baseUrl = baseUrl ?? CMC_MCP_URL;
  }

  /**
   * List all available tools from the CMC MCP server.
   */
  async listTools(): Promise<MCPTool[]> {
    if (this.toolCache) return this.toolCache;

    const response = await this.rpcCall("tools/list");
    const tools = (response.result as { tools: MCPTool[] })?.tools ?? [];
    this.toolCache = tools;
    return tools;
  }

  /**
   * Call a specific MCP tool by name.
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const response = await this.rpcCall("tools/call", {
      name,
      arguments: args,
    });
    return response.result;
  }

  /**
   * Health check — try to list tools.
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }

  // ---- Private ----

  private async rpcCall(method: string, params?: Record<string, unknown>): Promise<JSONRPCResponse> {
    const id = ++this.requestId;
    const body: JSONRPCRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CMC-MCP-API-KEY": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `CMC MCP error: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const json = (await response.json()) as JSONRPCResponse;

    if (json.error) {
      throw new Error(
        `CMC MCP error: ${json.error.message} (code ${json.error.code})`,
      );
    }

    return json;
  }
}
