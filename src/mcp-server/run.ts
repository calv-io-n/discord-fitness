// src/mcp-server/run.ts
import { Elysia } from "elysia";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");
const PORT = Number(process.env.MCP_PORT) || 3001;

// Store transports by session ID for multi-session support
const transports = new Map<string, WebStandardStreamableHTTPServerTransport>();

async function getOrCreateTransport(
  sessionId: string | null,
  request: Request,
): Promise<{ transport: WebStandardStreamableHTTPServerTransport; needsInit: boolean }> {
  // Existing session
  if (sessionId && transports.has(sessionId)) {
    return { transport: transports.get(sessionId)!, needsInit: false };
  }

  // New transport
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    onsessioninitialized: (id) => {
      transports.set(id, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  const mcpServer = createServer(dataDir, targetsPath);
  await mcpServer.connect(transport);

  return { transport, needsInit: true };
}

const app = new Elysia()
  .all("/mcp", async ({ request }) => {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const sessionId = request.headers.get("mcp-session-id");
    const body = await request.clone().text();
    let parsed: any;
    try {
      parsed = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const method = parsed.method;

    // If this is an initialize request, handle normally
    if (method === "initialize") {
      const { transport } = await getOrCreateTransport(sessionId, request);
      return transport.handleRequest(request);
    }

    // For non-initialize requests without a valid session,
    // create a new transport, auto-initialize it, then handle the actual request
    if (!sessionId || !transports.has(sessionId)) {
      const { transport } = await getOrCreateTransport(null, request);

      // Auto-initialize the session
      const initBody = JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "auto-init", version: "1.0" },
        },
        id: "_auto_init",
      });

      const initRequest = new Request(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: initBody,
      });

      // Run init (discard response)
      await transport.handleRequest(initRequest);

      // Now handle the actual request, injecting the session ID
      const actualRequest = new Request(request.url, {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("Content-Type") || "application/json",
          Accept: request.headers.get("Accept") || "application/json, text/event-stream",
          "Mcp-Session-Id": transport.sessionId || "",
        },
        body,
      });

      return transport.handleRequest(actualRequest);
    }

    // Existing session
    const transport = transports.get(sessionId)!;
    return transport.handleRequest(request);
  })
  .listen(PORT);

console.log(`MCP server (Streamable HTTP) running at http://localhost:${PORT}/mcp`);
