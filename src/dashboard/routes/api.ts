// src/dashboard/routes/api.ts
import { Elysia } from "elysia";
import {
  readEntries,
  appendEntry,
  updateEntry,
  deleteEntry,
  getToday,
  getSummary,
  type Domain,
  type DomainEntry,
  DOMAINS,
} from "../../csv-store";
import { readTargets, updateTargets, deleteTarget } from "../../targets";
import {
  getFavoriteFoods,
  addFavoriteFood,
  updateFavoriteFood,
  deleteFavoriteFood,
  type FavoriteFood,
} from "../../mcp-server/tools/favorites";

function isDomain(value: string): value is Domain {
  return (DOMAINS as readonly string[]).includes(value);
}

export function apiRoutes(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  return new Elysia({ prefix: "/api" })
    // Targets
    .get("/targets", () => readTargets(targetsPath))
    .patch("/targets", ({ body }) => {
      const { updates } = body as { updates: Record<string, Record<string, number | string>> };
      return updateTargets(targetsPath, updates);
    })
    .delete("/targets/:section", ({ params }) => {
      return deleteTarget(targetsPath, params.section);
    })
    .delete("/targets/:section/:key", ({ params }) => {
      return deleteTarget(targetsPath, params.section, params.key);
    })

    // Favorites
    .get("/favorites", ({ query }) => {
      const foods = getFavoriteFoods(dataDir, query.q as string | undefined);
      return { foods, count: foods.length };
    })
    .post("/favorites", ({ body }) => addFavoriteFood(body as FavoriteFood, dataDir))
    .patch("/favorites/:index", ({ params, body }) => {
      const idx = Number(params.index);
      return updateFavoriteFood(idx, body as Partial<FavoriteFood>, dataDir);
    })
    .delete("/favorites/:index", ({ params }) => {
      const idx = Number(params.index);
      return deleteFavoriteFood(idx, dataDir);
    })

    // Today + summary
    .get("/today", () => getToday(dataDir))
    .get("/:domain/summary", ({ params, query }) => {
      if (!isDomain(params.domain)) {
        return { error: `Invalid domain: ${params.domain}` };
      }
      return getSummary(params.domain, dataDir, {
        from: query.from as string | undefined,
        to: query.to as string | undefined,
      });
    })

    // Entries: month-scoped read
    .get("/:domain/:year/:month", ({ params }) => {
      if (!isDomain(params.domain)) {
        return { error: `Invalid domain: ${params.domain}` };
      }
      const monthPrefix = `${params.year}-${params.month}`;
      const entries = readEntries(params.domain, dataDir, {
        from: `${monthPrefix}-01`,
        to: `${monthPrefix}-31`,
      });
      return { entries };
    })

    // Entries: create
    .post("/:domain", ({ params, body }) => {
      if (!isDomain(params.domain)) {
        return { error: `Invalid domain: ${params.domain}` };
      }
      const entry = body as DomainEntry[Domain];
      if (!(entry as { date?: string }).date) {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: process.env.TZ || "America/Vancouver" });
        (entry as { date: string }).date = today;
      }
      appendEntry(params.domain, entry, dataDir);
      return { success: true, entry };
    })

    // Entries: update
    .patch("/:domain/:month/:index", ({ params, body }) => {
      if (!isDomain(params.domain)) {
        return { error: `Invalid domain: ${params.domain}` };
      }
      const idx = Number(params.index);
      return updateEntry(params.domain, params.month, idx, body as Partial<DomainEntry[Domain]>, dataDir);
    })

    // Entries: delete
    .delete("/:domain/:month/:index", ({ params }) => {
      if (!isDomain(params.domain)) {
        return { error: `Invalid domain: ${params.domain}` };
      }
      const idx = Number(params.index);
      return deleteEntry(params.domain, params.month, idx, dataDir);
    });
}
