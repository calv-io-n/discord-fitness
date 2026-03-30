// src/dashboard/routes/api.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { apiRoutes } from "./api";
import { appendEntry, type StepsEntry, type NutritionEntry } from "../../csv-store";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/discord-fitness-test-dashboard";
const TEST_DATA_DIR = join(TEST_DIR, "data");
const TARGETS_PATH = join(TEST_DIR, "targets.yaml");

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  writeFileSync(
    TARGETS_PATH,
    `nutrition:
  calories: 2500
  protein: 180
steps:
  daily: 10000
`
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function createApp() {
  return new Elysia().use(apiRoutes(TEST_DATA_DIR, TARGETS_PATH));
}

describe("GET /api/:domain/:year/:month", () => {
  it("returns CSV data as JSON", async () => {
    appendEntry("steps", { date: "2026-03-29", steps: 10000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/steps/2026/03"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].steps).toBe(10000);
  });

  it("returns empty array for missing data", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/steps/2026/03"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toEqual([]);
  });
});

describe("GET /api/targets", () => {
  it("returns current targets", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/targets"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nutrition.calories).toBe(2500);
  });
});

describe("GET /api/today", () => {
  it("returns today entries across all domains", async () => {
    const today = new Date().toISOString().slice(0, 10);
    appendEntry("steps", { date: today, steps: 8000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/today"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.steps).toHaveLength(1);
  });
});

describe("GET /api/:domain/summary", () => {
  it("returns aggregated stats", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const base = { carbs: 40, fat: 15 };
    appendEntry("nutrition", { date: today, meal: "breakfast", calories: 500, protein: 40, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);
    appendEntry("nutrition", { date: today, meal: "lunch", calories: 700, protein: 50, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request(`http://localhost/api/nutrition/summary?from=${today}&to=${today}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(2);
    expect(body.totals.calories).toBe(1200);
  });
});
