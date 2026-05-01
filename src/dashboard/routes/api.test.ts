// src/dashboard/routes/api.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { apiRoutes } from "./api";
import { appendEntry } from "../../csv-store";
import type { StepsEntry, NutritionEntry } from "../../csv-store";
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

describe("entry CRUD", () => {
  it("POST /api/:domain creates an entry", async () => {
    const app = createApp();
    const res = await app.handle(
      new Request("http://localhost/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-04-12", steps: 8000, notes: "" }),
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);

    const list = await (await app.handle(new Request("http://localhost/api/steps/2026/04"))).json();
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0].steps).toBe(8000);
  });

  it("PATCH /api/:domain/:month/:index updates an entry", async () => {
    appendEntry("steps", { date: "2026-04-12", steps: 8000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(
      new Request("http://localhost/api/steps/2026-04/0", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: 9500 }),
      }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);

    const list = await (await app.handle(new Request("http://localhost/api/steps/2026/04"))).json();
    expect(list.entries[0].steps).toBe(9500);
  });

  it("DELETE /api/:domain/:month/:index removes an entry", async () => {
    appendEntry("steps", { date: "2026-04-12", steps: 8000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(
      new Request("http://localhost/api/steps/2026-04/0", { method: "DELETE" }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);

    const list = await (await app.handle(new Request("http://localhost/api/steps/2026/04"))).json();
    expect(list.entries).toHaveLength(0);
  });
});

describe("favorites HTTP CRUD", () => {
  it("supports add, list, update, delete", async () => {
    const app = createApp();

    const add = await app.handle(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "rice", serving: "1 cup", calories: 200, protein: 4, carbs: 45, fat: 0.5 }),
      }),
    );
    expect((await add.json()).success).toBe(true);

    const list = await (await app.handle(new Request("http://localhost/api/favorites"))).json();
    expect(list.foods).toHaveLength(1);
    expect(list.foods[0]._index).toBe(0);

    const patch = await app.handle(
      new Request("http://localhost/api/favorites/0", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calories: 220 }),
      }),
    );
    expect((await patch.json()).success).toBe(true);

    const del = await app.handle(
      new Request("http://localhost/api/favorites/0", { method: "DELETE" }),
    );
    expect((await del.json()).success).toBe(true);

    const final = await (await app.handle(new Request("http://localhost/api/favorites"))).json();
    expect(final.foods).toHaveLength(0);
  });
});

describe("targets HTTP CRUD", () => {
  it("PATCH updates and DELETE removes a target key", async () => {
    const app = createApp();

    const patch = await app.handle(
      new Request("http://localhost/api/targets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { nutrition: { calories: 2300 } } }),
      }),
    );
    const updated = await patch.json();
    expect(updated.nutrition.calories).toBe(2300);

    const del = await app.handle(
      new Request("http://localhost/api/targets/nutrition/protein", { method: "DELETE" }),
    );
    const delBody = await del.json();
    expect(delBody.success).toBe(true);
    expect(delBody.targets.nutrition.protein).toBeUndefined();
  });

  it("DELETE without key removes whole section", async () => {
    const app = createApp();
    const res = await app.handle(
      new Request("http://localhost/api/targets/steps", { method: "DELETE" }),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.targets.steps).toBeUndefined();
  });
});
