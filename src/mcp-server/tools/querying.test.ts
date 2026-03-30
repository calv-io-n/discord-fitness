// src/mcp-server/tools/querying.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleQueryDomain, handleGetToday, handleGetSummary } from "./querying";
import { appendEntry, type StepsEntry, type NutritionEntry } from "../../csv-store";
import { mkdirSync, rmSync } from "fs";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-mcp-query";
const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("handleQueryDomain", () => {
  it("returns entries for a domain with date range", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: "2025-01-01", steps: 3000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const result = handleQueryDomain({ domain: "steps", from: TODAY, to: TODAY }, TEST_DATA_DIR);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].steps).toBe(5000);
  });
});

describe("handleGetToday", () => {
  it("returns all domains for today", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const result = handleGetToday(TEST_DATA_DIR);
    expect(result.steps).toHaveLength(1);
    expect(result.strength).toHaveLength(0);
  });
});

describe("handleGetSummary", () => {
  it("returns aggregated stats", () => {
    const base = { carbs: 40, fat: 15 };
    appendEntry("nutrition", { date: TODAY, meal: "breakfast", calories: 500, protein: 40, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);
    appendEntry("nutrition", { date: TODAY, meal: "lunch", calories: 700, protein: 50, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);

    const result = handleGetSummary({ domain: "nutrition", from: TODAY, to: TODAY }, TEST_DATA_DIR);
    expect(result.count).toBe(2);
    expect(result.totals.calories).toBe(1200);
  });
});
