#!/usr/bin/env python3
"""
CMC MCP Bridge — called by the Node.js backend as a subprocess.
Uses the mcp SDK to connect to CoinMarketCap's MCP endpoint.
Reads JSON request from stdin, writes JSON response to stdout.

Usage:
  echo '{"method":"get_global_metrics_latest","args":{}}' | python3 cmc-bridge.py
  echo '{"method":"get_crypto_quotes_latest","args":{"id":"1"}}' | python3 cmc-bridge.py
"""

import sys
import json
import asyncio
from mcp.client.streamable_http import streamablehttp_client

CMC_MCP_URL = "https://mcp.coinmarketcap.com/mcp"
API_KEY = "8d051f3e9a7847b6956ec28537c80764"


async def call_tool(method: str, args: dict) -> dict:
    """Call a CMC MCP tool and return the result."""
    headers = {"X-CMC-MCP-API-KEY": API_KEY}

    async with streamablehttp_client(CMC_MCP_URL, headers=headers) as (
        read_stream,
        write_stream,
        _,
    ):
        # Initialize the session
        from mcp.client.session import ClientSession
        from mcp.types import CallToolResult

        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()

            if method == "tools/list":
                result = await session.list_tools()
                return {
                    "tools": [
                        {"name": t.name, "description": t.description, "inputSchema": t.inputSchema}
                        for t in result.tools
                    ]
                }

            # Call the tool
            result: CallToolResult = await session.call_tool(method, arguments=args)

            # Extract text content
            texts = []
            for content_item in result.content:
                if hasattr(content_item, "text"):
                    texts.append(content_item.text)

            return {"content": texts, "isError": result.isError}


async def main():
    # Read request from stdin
    raw = sys.stdin.read()
    if not raw.strip():
        print(json.dumps({"error": "No input"}))
        sys.exit(1)

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON: {e}"}))
        sys.exit(1)

    method = request.get("method", "")
    args = request.get("args", {})

    if not method:
        print(json.dumps({"error": "No method specified"}))
        sys.exit(1)

    try:
        result = await call_tool(method, args)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
