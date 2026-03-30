// src/csv-store/reader.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readEntries } from "./reader";
import { appendEntry } from "./writer";
import { mkdirSync, rmSync } from "fs";
import type { StrengthEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-reader";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("readEntries", () => {
  it("reads all entries for a month", () => {
    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-30",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(2);
    expect(entries[0].exercise).toBe("bench press");
    expect(entries[0].sets).toBe(4);
    expect(entries[1].exercise).toBe("squat");
  });

  it("reads entries across multiple months", () => {
    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-04-01",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(2);
  });

  it("filters entries by date range", () => {
    appendEntry("strength", {
      date: "2026-03-01",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-15",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "deadlift",
      sets: 3,
      reps: 3,
      weight: 405,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR, {
      from: "2026-03-10",
      to: "2026-03-20",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].exercise).toBe("squat");
  });

  it("returns empty array when no data exists", () => {
    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toEqual([]);
  });
});
