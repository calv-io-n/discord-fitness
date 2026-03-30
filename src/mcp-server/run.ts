// src/mcp-server/run.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");

const server = createServer(dataDir, targetsPath);
const transport = new StdioServerTransport();
await server.connect(transport);
