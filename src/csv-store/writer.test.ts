// src/csv-store/writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { appendEntry, updateEntry, deleteEntry } from "./writer";
import { readEntriesWithMeta } from "./reader";
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
      category: "push",
      sets: 4,
      reps: 8,
      weight: 185,
      notes: "felt strong",
    };

    appendEntry("strength", entry, TEST_DATA_DIR);

    const filePath = `${TEST_DATA_DIR}/strength/2026-03.csv`;
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[0]).toBe("date,exercise,category,sets,reps,weight,notes");
    expect(lines[1]).toBe("2026-03-29,bench press,push,4,8,185,felt strong");
  });

  it("appends to existing CSV without duplicating header", () => {
    const entry1: StrengthEntry = {
      date: "2026-03-29",
      exercise: "bench press",
      category: "push",
      sets: 4,
      reps: 8,
      weight: 185,
      notes: "",
    };
    const entry2: StrengthEntry = {
      date: "2026-03-29",
      exercise: "squat",
      category: "legs",
      sets: 5,
      reps: 5,
      weight: 315,
      notes: "new PR",
    };

    appendEntry("strength", entry1, TEST_DATA_DIR);
    appendEntry("strength", entry2, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/strength/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 entries
    expect(lines[2]).toBe("2026-03-29,squat,legs,5,5,315,new PR");
  });

  it("handles nutrition entries with many columns", () => {
    const entry: NutritionEntry = {
      date: "2026-03-29",
      meal: "breakfast",
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 15,
      notes: "eggs and oats",
    };

    appendEntry("nutrition", entry, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/nutrition/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[1]).toBe("2026-03-29,breakfast,450,35,40,15,eggs and oats");
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

describe("updateEntry", () => {
  it("updates a single field in place", () => {
    appendEntry("nutrition", {
      date: "2026-04-10",
      meal: "lunch",
      calories: 600,
      protein: 40,
      carbs: 50,
      fat: 20,
      notes: "",
    } as NutritionEntry, TEST_DATA_DIR);

    const result = updateEntry("nutrition", "2026-04", 0, { calories: 700 }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const entries = readEntriesWithMeta("nutrition", TEST_DATA_DIR);
    expect(entries[0].calories).toBe(700);
    expect(entries[0].protein).toBe(40); // unchanged
  });

  it("moves the entry when date changes to a different month", () => {
    appendEntry("steps", {
      date: "2026-04-10",
      steps: 5000,
      notes: "",
    } as StepsEntry, TEST_DATA_DIR);

    const result = updateEntry("steps", "2026-04", 0, { date: "2026-05-01" }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const aprilEntries = readEntriesWithMeta("steps", TEST_DATA_DIR, { from: "2026-04-01", to: "2026-04-30" });
    const mayEntries = readEntriesWithMeta("steps", TEST_DATA_DIR, { from: "2026-05-01", to: "2026-05-31" });
    expect(aprilEntries).toHaveLength(0);
    expect(mayEntries).toHaveLength(1);
    expect(mayEntries[0].steps).toBe(5000);
  });

  it("rejects out-of-range index", () => {
    appendEntry("steps", { date: "2026-04-10", steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    const result = updateEntry("steps", "2026-04", 5, { steps: 9000 }, TEST_DATA_DIR);
    expect(result.success).toBe(false);
  });

  it("rejects unknown month", () => {
    const result = updateEntry("steps", "2099-12", 0, { steps: 1 }, TEST_DATA_DIR);
    expect(result.success).toBe(false);
  });
});

describe("deleteEntry", () => {
  it("removes a row and re-numbers indices", () => {
    appendEntry("steps", { date: "2026-04-01", steps: 1000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: "2026-04-02", steps: 2000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: "2026-04-03", steps: 3000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const result = deleteEntry("steps", "2026-04", 1, TEST_DATA_DIR);
    expect(result.success).toBe(true);

    const entries = readEntriesWithMeta("steps", TEST_DATA_DIR);
    expect(entries).toHaveLength(2);
    expect(entries[0].steps).toBe(1000);
    expect(entries[1].steps).toBe(3000);
    expect(entries[1]._index).toBe(1);
  });

  it("preserves the header when removing the last row", () => {
    appendEntry("steps", { date: "2026-04-01", steps: 1000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    deleteEntry("steps", "2026-04", 0, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/steps/2026-04.csv`, "utf-8");
    expect(content.trim()).toBe("date,steps,notes");
  });

  it("rejects out-of-range index", () => {
    appendEntry("steps", { date: "2026-04-01", steps: 1000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    const result = deleteEntry("steps", "2026-04", 9, TEST_DATA_DIR);
    expect(result.success).toBe(false);
  });
});
