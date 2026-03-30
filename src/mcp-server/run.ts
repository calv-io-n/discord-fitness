// src/mcp-server/run.ts
import { Elysia } from "elysia";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");
const PORT = Number(process.env.MCP_PORT) || 3001;

const mcpServer = createServer(dataDir, targetsPath);

const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

await mcpServer.connect(transport);

const app = new Elysia()
  .all("/mcp", async ({ request }) => {
    return transport.handleRequest(request);
  })
  .listen(PORT);

console.log(`MCP server (Streamable HTTP) running at http://localhost:${PORT}/mcp`);
