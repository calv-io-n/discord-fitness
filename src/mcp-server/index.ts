// src/mcp-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleLogTool, LOG_TOOL_NAMES } from "./tools/logging";
import { handleQueryDomain, handleGetToday, handleGetSummary } from "./tools/querying";
import { handleGetTargets, handleUpdateTargets } from "./tools/targets";
import { readFileSync } from "fs";

export function createServer(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  const server = new Server(
    { name: "discord-fitness", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "log_strength",
        description: "Log a strength training entry (exercise, sets, reps, weight)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
            exercise: { type: "string" },
            sets: { type: "number" },
            reps: { type: "number" },
            weight: { type: "number" },
            unit: { type: "string", default: "lb" },
            notes: { type: "string", default: "" },
          },
          required: ["exercise", "sets", "reps", "weight"],
        },
      },
      {
        name: "log_cardio",
        description: "Log a cardio session (type, duration, distance, heart rate)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            type: { type: "string" },
            duration_min: { type: "number" },
            distance: { type: "number" },
            distance_unit: { type: "string", default: "mi" },
            avg_hr: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["type", "duration_min"],
        },
      },
      {
        name: "log_steps",
        description: "Log daily step count",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            steps: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["steps"],
        },
      },
      {
        name: "log_nutrition",
        description: "Log a meal with macros and key micronutrients",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            meal: { type: "string" },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sodium_mg: { type: "number" },
            sugar_g: { type: "number" },
            cholesterol_mg: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["meal", "calories", "protein_g", "carbs_g", "fat_g"],
        },
      },
      {
        name: "log_sleep",
        description: "Log a sleep entry (bed time, wake time, quality)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            bed_time: { type: "string" },
            wake_time: { type: "string" },
            duration_hr: { type: "number" },
            quality: { type: "string" },
            notes: { type: "string", default: "" },
          },
          required: ["bed_time", "wake_time", "duration_hr"],
        },
      },
      {
        name: "log_weight",
        description: "Log a body weight measurement",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            weight: { type: "number" },
            unit: { type: "string", default: "lb" },
            notes: { type: "string", default: "" },
          },
          required: ["weight"],
        },
      },
      {
        name: "query_domain",
        description: "Read entries for a fitness domain with optional date range filtering",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] },
            from: { type: "string", description: "YYYY-MM-DD start date" },
            to: { type: "string", description: "YYYY-MM-DD end date" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_today",
        description: "Get all entries across all fitness domains for today",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_summary",
        description: "Get aggregated stats (totals, averages) for a domain over a date range",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] },
            from: { type: "string" },
            to: { type: "string" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_targets",
        description: "Read current fitness targets from targets.yaml",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "update_targets",
        description: "Update one or more fitness target values",
        inputSchema: {
          type: "object" as const,
          properties: {
            updates: {
              type: "object",
              description: "Nested object of section -> key -> value to update",
            },
          },
          required: ["updates"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (LOG_TOOL_NAMES.includes(name)) {
      const result = handleLogTool(name, args as Record<string, unknown>, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "query_domain") {
      const result = handleQueryDomain(args as { domain: string; from?: string; to?: string }, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_today") {
      const result = handleGetToday(dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_summary") {
      const result = handleGetSummary(args as { domain: string; from?: string; to?: string }, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_targets") {
      const targets = handleGetTargets(targetsPath);
      return { content: [{ type: "text" as const, text: JSON.stringify(targets) }] };
    }

    if (name === "update_targets") {
      const { updates } = args as { updates: Record<string, Record<string, number | string>> };
      const result = handleUpdateTargets(updates, targetsPath);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }], isError: true };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "file:///targets.yaml",
        name: "Fitness Targets",
        description: "Current fitness goals and targets",
        mimeType: "text/yaml",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "file:///targets.yaml") {
      const content = readFileSync(targetsPath, "utf-8");
      return { contents: [{ uri: request.params.uri, text: content, mimeType: "text/yaml" }] };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  return server;
}
