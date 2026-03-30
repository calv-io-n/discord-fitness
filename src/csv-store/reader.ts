// src/csv-store/reader.ts
import { readdirSync, readFileSync, existsSync } from "fs";
import Papa from "papaparse";
import { type Domain, type DomainEntry, type DateRange } from "./types";

export function readEntries<D extends Domain>(
  domain: D,
  dataDir: string = "data",
  dateRange?: DateRange
): DomainEntry[D][] {
  const domainDir = `${dataDir}/${domain}`;
  if (!existsSync(domainDir)) return [];

  const files = readdirSync(domainDir)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  const allEntries: DomainEntry[D][] = [];
  const numericColumns = getNumericColumns(domain);

  for (const file of files) {
    const content = readFileSync(`${domainDir}/${file}`, "utf-8");
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data) {
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        entry[key] = numericColumns.has(key) ? Number(val) : val;
      }
      allEntries.push(entry as DomainEntry[D]);
    }
  }

  if (!dateRange) return allEntries;

  return allEntries.filter((entry) => {
    const date = (entry as { date: string }).date;
    if (dateRange.from && date < dateRange.from) return false;
    if (dateRange.to && date > dateRange.to) return false;
    return true;
  });
}

function getNumericColumns(domain: Domain): Set<string> {
  const map: Record<Domain, string[]> = {
    strength: ["sets", "reps", "weight"],
    cardio: ["duration"],
    steps: ["steps"],
    nutrition: ["calories", "protein", "carbs", "fat"],
    sleep: ["hours"],
    weight: ["weight"],
    stretching: ["duration_min"],
  };
  return new Set(map[domain]);
}
