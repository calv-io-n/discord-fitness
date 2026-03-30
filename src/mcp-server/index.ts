// src/mcp-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleLogTool, handleLogBatch, LOG_TOOL_NAMES, type BatchEntry } from "./tools/logging";
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
        description: "Log a strength/weight training exercise. Use when the user mentions lifting, bench press, squat, deadlift, curls, rows, or any resistance exercise.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
            exercise: { type: "string", description: "Exercise name, e.g. bench press" },
            category: { type: "string", description: "Push, Pull, or Legs", enum: ["push", "pull", "legs"] },
            sets: { type: "number" },
            reps: { type: "number" },
            weight: { type: "number", description: "Weight in lbs" },
            notes: { type: "string", default: "" },
          },
          required: ["exercise", "sets", "reps", "weight"],
        },
      },
      {
        name: "log_cardio",
        description: "Log a cardio/aerobic session. Use when the user mentions running, cycling, swimming, rowing, walking, hiking, or any endurance activity.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            type: { type: "string", description: "Activity type, e.g. running" },
            duration: { type: "number", description: "Duration in minutes" },
            notes: { type: "string", default: "" },
          },
          required: ["type", "duration"],
        },
      },
      {
        name: "log_steps",
        description: "Log daily step count. Use when the user reports how many steps they walked.",
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
        description: "Log a meal or food intake. Use when the user mentions eating, breakfast, lunch, dinner, snack, or any food. Estimate macros if the user describes food without exact numbers.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            meal: { type: "string", description: "Meal name, e.g. breakfast, lunch" },
            calories: { type: "number" },
            protein: { type: "number", description: "Protein in grams" },
            carbs: { type: "number", description: "Carbs in grams" },
            fat: { type: "number", description: "Fat in grams" },
            notes: { type: "string", default: "" },
          },
          required: ["meal", "calories", "protein", "carbs", "fat"],
        },
      },
      {
        name: "log_sleep",
        description: "Log sleep data. Use when the user mentions sleep or how many hours they slept.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            hours: { type: "number", description: "Hours slept" },
            quality: { type: "string", description: "good, fair, or poor" },
            notes: { type: "string", default: "" },
          },
          required: ["hours"],
        },
      },
      {
        name: "log_weight",
        description: "Log a body weight measurement. Use when the user mentions weighing themselves.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            weight: { type: "number", description: "Body weight in lbs" },
            notes: { type: "string", default: "" },
          },
          required: ["weight"],
        },
      },
      {
        name: "log_stretching",
        description: "Log a stretching session. Use when the user mentions stretching, flexibility, mobility, or yoga.",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
            stretch: { type: "string", description: "Stretch name, e.g. hamstring stretch" },
            duration_min: { type: "number", description: "Duration in minutes" },
            notes: { type: "string", default: "" },
          },
          required: ["stretch", "duration_min"],
        },
      },
      {
        name: "query_domain",
        description: "Query logged fitness entries for a specific domain (strength, cardio, steps, nutrition, sleep, or weight). Supports optional date range filtering. Use when the user asks to see their logged data, history, or entries for a specific time period.",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight", "stretching"] },
            from: { type: "string", description: "YYYY-MM-DD start date" },
            to: { type: "string", description: "YYYY-MM-DD end date" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_today",
        description: "Get a snapshot of everything logged today across all fitness domains (strength, cardio, steps, nutrition, sleep, weight). Use when the user asks 'what did I log today' or wants an overview of their day.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_summary",
        description: "Get aggregated statistics (totals and averages) for a fitness domain over a date range. Use when the user asks about weekly/monthly totals, averages, or summaries like 'how much protein did I eat this week' or 'what was my average sleep'.",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight", "stretching"] },
            from: { type: "string" },
            to: { type: "string" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_targets",
        description: "Read the user's current fitness targets and goals (calorie target, protein target, step goal, sleep goal, weight goal, strength PRs). Use when the user asks about their goals, targets, or what they're aiming for.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "update_targets",
        description: "Update the user's fitness targets/goals. Use when the user wants to change their calorie target, protein goal, step goal, sleep goal, weight goal, or strength targets. Pass a nested object like {nutrition: {calories: 2400}}.",
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
      {
        name: "log_batch",
        description: "PREFERRED: Log multiple fitness entries across any domains in a single call. Use this instead of calling individual log tools when the user wants to log more than one thing (e.g., 'log my workout, steps, and breakfast'). Each entry specifies a domain (strength/cardio/steps/nutrition/sleep/weight) and the data for that entry.",
        inputSchema: {
          type: "object" as const,
          properties: {
            entries: {
              type: "array",
              description: "Array of entries to log",
              items: {
                type: "object",
                properties: {
                  domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight", "stretching"] },
                  data: { type: "object", description: "The entry data (same fields as individual log tools)" },
                },
                required: ["domain", "data"],
              },
            },
          },
          required: ["entries"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "log_batch") {
      const { entries } = args as { entries: BatchEntry[] };
      const result = handleLogBatch(entries, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

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
