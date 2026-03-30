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
        description: "Log a strength/weight training exercise to the fitness tracker. Use when the user mentions lifting, bench press, squat, deadlift, curls, rows, or any resistance exercise. Records exercise name, sets, reps, and weight lifted.",
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
        description: "Log a cardio/aerobic exercise session to the fitness tracker. Use when the user mentions running, cycling, swimming, rowing, walking, hiking, or any endurance activity. Records activity type, duration, distance, and heart rate.",
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
        description: "Log daily step count to the fitness tracker. Use when the user reports how many steps they walked today.",
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
        description: "Log a meal or food intake to the nutrition tracker. Use when the user mentions eating, breakfast, lunch, dinner, snack, or any food. Records calories, protein, carbs, fat, fiber, sodium, sugar, and cholesterol. Estimate macros if the user describes food without exact numbers.",
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
        description: "Log sleep data to the fitness tracker. Use when the user mentions sleep, bedtime, wake time, or how many hours they slept. Records bed time, wake time, duration, and quality (good/fair/poor).",
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
        description: "Log a body weight measurement to the fitness tracker. Use when the user mentions weighing themselves or their current body weight.",
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
        description: "Query logged fitness entries for a specific domain (strength, cardio, steps, nutrition, sleep, or weight). Supports optional date range filtering. Use when the user asks to see their logged data, history, or entries for a specific time period.",
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
        description: "Get a snapshot of everything logged today across all fitness domains (strength, cardio, steps, nutrition, sleep, weight). Use when the user asks 'what did I log today' or wants an overview of their day.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_summary",
        description: "Get aggregated statistics (totals and averages) for a fitness domain over a date range. Use when the user asks about weekly/monthly totals, averages, or summaries like 'how much protein did I eat this week' or 'what was my average sleep'.",
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
                  domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] },
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
