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

const app = new Elysia()
  .all("/mcp", async ({ request }) => {
    const sessionId = request.headers.get("mcp-session-id");

    // Existing session — route to its transport
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      return transport.handleRequest(request);
    }

    // New session — create a fresh transport + server pair
    if (request.method === "POST") {
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

      return transport.handleRequest(request);
    }

    return new Response("No valid session", { status: 400 });
  })
  .listen(PORT);

console.log(`MCP server (Streamable HTTP) running at http://localhost:${PORT}/mcp`);
