// src/csv-store/query.ts
import { readEntries } from "./reader";
import { DOMAINS, type Domain, type DomainEntry, type DateRange } from "./types";

export function getToday(dataDir: string = "data"): Record<Domain, DomainEntry[Domain][]> {
  const today = new Date().toISOString().slice(0, 10);
  const range: DateRange = { from: today, to: today };

  const result = {} as Record<Domain, DomainEntry[Domain][]>;
  for (const domain of DOMAINS) {
    result[domain] = readEntries(domain, dataDir, range);
  }
  return result;
}

export interface Summary {
  count: number;
  totals: Record<string, number>;
  averages: Record<string, number>;
}

export function getSummary(
  domain: Domain,
  dataDir: string = "data",
  dateRange?: DateRange
): Summary {
  const entries = readEntries(domain, dataDir, dateRange);
  const count = entries.length;
  if (count === 0) return { count: 0, totals: {}, averages: {} };

  const numericKeys: string[] = [];
  const first = entries[0] as Record<string, unknown>;
  for (const [key, val] of Object.entries(first)) {
    if (typeof val === "number") numericKeys.push(key);
  }

  const totals: Record<string, number> = {};
  for (const key of numericKeys) totals[key] = 0;

  for (const entry of entries) {
    const row = entry as Record<string, unknown>;
    for (const key of numericKeys) {
      totals[key] += row[key] as number;
    }
  }

  const averages: Record<string, number> = {};
  for (const key of numericKeys) {
    averages[key] = totals[key] / count;
  }

  return { count, totals, averages };
}
