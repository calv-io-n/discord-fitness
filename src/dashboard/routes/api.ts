// src/dashboard/routes/api.ts
import { Elysia } from "elysia";
import { readEntries, getToday, getSummary, type Domain, DOMAINS } from "../../csv-store";
import { readTargets } from "../../targets";

export function apiRoutes(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  return new Elysia({ prefix: "/api" })
    .get("/targets", () => {
      return readTargets(targetsPath);
    })
    .get("/today", () => {
      return getToday(dataDir);
    })
    .get("/:domain/summary", ({ params, query }) => {
      const domain = params.domain as Domain;
      if (!DOMAINS.includes(domain)) {
        return { error: `Invalid domain: ${domain}` };
      }
      return getSummary(domain, dataDir, {
        from: query.from as string | undefined,
        to: query.to as string | undefined,
      });
    })
    .get("/:domain/:year/:month", ({ params }) => {
      const domain = params.domain as Domain;
      if (!DOMAINS.includes(domain)) {
        return { error: `Invalid domain: ${domain}` };
      }
      const monthPrefix = `${params.year}-${params.month}`;
      const entries = readEntries(domain, dataDir, {
        from: `${monthPrefix}-01`,
        to: `${monthPrefix}-31`,
      });
      return { entries };
    });
}
