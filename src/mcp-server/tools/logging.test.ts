// src/mcp-server/tools/logging.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleLogTool } from "./logging";
import { readEntries } from "../../csv-store";
import { mkdirSync, rmSync } from "fs";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-mcp-log";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("handleLogTool", () => {
  it("logs a strength entry", () => {
    const result = handleLogTool("log_strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      notes: "",
    }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].exercise).toBe("bench press");
  });

  it("logs a nutrition entry", () => {
    const result = handleLogTool("log_nutrition", {
      date: "2026-03-29",
      meal: "breakfast",
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15,
      notes: "eggs and oats",
    }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const entries = readEntries("nutrition", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBe(450);
  });

  it("defaults date to today when not provided", () => {
    const today = new Date().toISOString().slice(0, 10);

    handleLogTool("log_steps", {
      steps: 10000,
      notes: "",
    }, TEST_DATA_DIR);

    const entries = readEntries("steps", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe(today);
  });

  it("returns error for unknown tool", () => {
    const result = handleLogTool("log_unknown", {}, TEST_DATA_DIR);
    expect(result.success).toBe(false);
  });
});
