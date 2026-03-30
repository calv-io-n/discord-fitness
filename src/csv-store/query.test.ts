// src/csv-store/query.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getToday, getSummary } from "./query";
import { appendEntry } from "./writer";
import { mkdirSync, rmSync } from "fs";
import type { NutritionEntry, StepsEntry, WeightEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-query";
const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("getToday", () => {
  it("returns entries from all domains for today", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("weight", { date: TODAY, weight: 185.4, notes: "" } as WeightEntry, TEST_DATA_DIR);

    const result = getToday(TEST_DATA_DIR);
    expect(result.steps).toHaveLength(1);
    expect(result.weight).toHaveLength(1);
    expect(result.strength).toHaveLength(0);
  });
});

describe("getSummary", () => {
  it("returns totals and averages for nutrition", () => {
    const base: Omit<NutritionEntry, "date" | "meal" | "calories" | "protein" | "notes"> = {
      carbs: 40,
      fat: 15,
    };

    appendEntry("nutrition", {
      date: TODAY,
      meal: "breakfast",
      calories: 500,
      protein: 40,
      notes: "",
      ...base,
    } as NutritionEntry, TEST_DATA_DIR);

    appendEntry("nutrition", {
      date: TODAY,
      meal: "lunch",
      calories: 700,
      protein: 50,
      notes: "",
      ...base,
    } as NutritionEntry, TEST_DATA_DIR);

    const summary = getSummary("nutrition", TEST_DATA_DIR, { from: TODAY, to: TODAY });
    expect(summary.count).toBe(2);
    expect(summary.totals.calories).toBe(1200);
    expect(summary.totals.protein).toBe(90);
    expect(summary.averages.calories).toBe(600);
  });

  it("returns totals and averages for steps", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: TODAY, steps: 3000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const summary = getSummary("steps", TEST_DATA_DIR, { from: TODAY, to: TODAY });
    expect(summary.count).toBe(2);
    expect(summary.totals.steps).toBe(8000);
  });
});
