// src/mcp-server/tools/logging.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleLogTool, handleUpdateEntry, handleDeleteEntry } from "./logging";
import { readEntries, readEntriesWithMeta } from "../../csv-store";
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

describe("handleUpdateEntry", () => {
  it("normalizes aliased field names when updating", () => {
    handleLogTool("log_nutrition", {
      date: "2026-04-10",
      meal: "lunch",
      calories: 600,
      protein: 40,
      carbs: 50,
      fat: 20,
      notes: "",
    }, TEST_DATA_DIR);

    const result = handleUpdateEntry(
      { domain: "nutrition", month: "2026-04", index: 0, updates: { protein_g: 55 } },
      TEST_DATA_DIR,
    );
    expect(result.success).toBe(true);
    const entries = readEntriesWithMeta("nutrition", TEST_DATA_DIR);
    expect(entries[0].protein).toBe(55);
  });

  it("rejects unknown domain", () => {
    const result = handleUpdateEntry(
      { domain: "bogus", month: "2026-04", index: 0, updates: {} },
      TEST_DATA_DIR,
    );
    expect(result.success).toBe(false);
  });
});

describe("handleDeleteEntry", () => {
  it("removes the matched row", () => {
    handleLogTool("log_steps", { date: "2026-04-01", steps: 1000 }, TEST_DATA_DIR);
    handleLogTool("log_steps", { date: "2026-04-02", steps: 2000 }, TEST_DATA_DIR);

    const result = handleDeleteEntry(
      { domain: "steps", month: "2026-04", index: 0 },
      TEST_DATA_DIR,
    );
    expect(result.success).toBe(true);
    const entries = readEntries("steps", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].steps).toBe(2000);
  });

  it("rejects unknown domain", () => {
    const result = handleDeleteEntry(
      { domain: "bogus", month: "2026-04", index: 0 },
      TEST_DATA_DIR,
    );
    expect(result.success).toBe(false);
  });
});
