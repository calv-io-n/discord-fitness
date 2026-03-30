// src/csv-store/writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { appendEntry } from "./writer";
import { readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import type { StrengthEntry, NutritionEntry, StepsEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-data";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("appendEntry", () => {
  it("creates CSV with header when file does not exist", () => {
    const entry: StrengthEntry = {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "felt strong",
    };

    appendEntry("strength", entry, TEST_DATA_DIR);

    const filePath = `${TEST_DATA_DIR}/strength/2026-03.csv`;
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[0]).toBe("date,exercise,sets,reps,weight,unit,notes");
    expect(lines[1]).toBe("2026-03-29,bench press,4,8,185,lb,felt strong");
  });

  it("appends to existing CSV without duplicating header", () => {
    const entry1: StrengthEntry = {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    };
    const entry2: StrengthEntry = {
      date: "2026-03-29",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "new PR",
    };

    appendEntry("strength", entry1, TEST_DATA_DIR);
    appendEntry("strength", entry2, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/strength/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 entries
    expect(lines[2]).toBe("2026-03-29,squat,5,5,315,lb,new PR");
  });

  it("handles nutrition entries with many columns", () => {
    const entry: NutritionEntry = {
      date: "2026-03-29",
      meal: "breakfast",
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      fiber_g: 8,
      sodium_mg: 600,
      sugar_g: 5,
      cholesterol_mg: 120,
      notes: "eggs and oats",
    };

    appendEntry("nutrition", entry, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/nutrition/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[1]).toBe("2026-03-29,breakfast,450,35,40,15,8,600,5,120,eggs and oats");
  });

  it("derives correct monthly filename from date", () => {
    const entry: StepsEntry = {
      date: "2026-04-15",
      steps: 8500,
      notes: "",
    };

    appendEntry("steps", entry, TEST_DATA_DIR);

    expect(existsSync(`${TEST_DATA_DIR}/steps/2026-04.csv`)).toBe(true);
  });
});
