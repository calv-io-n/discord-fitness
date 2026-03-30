// src/csv-store/writer.ts
import { existsSync, mkdirSync, appendFileSync } from "fs";
import { CSV_HEADERS, type Domain, type DomainEntry } from "./types";

export function appendEntry<D extends Domain>(
  domain: D,
  entry: DomainEntry[D],
  dataDir: string = "data"
): void {
  const date = (entry as { date: string }).date;
  const monthKey = date.slice(0, 7); // YYYY-MM
  const domainDir = `${dataDir}/${domain}`;
  const filePath = `${domainDir}/${monthKey}.csv`;

  mkdirSync(domainDir, { recursive: true });

  const fileExists = existsSync(filePath);
  const header = CSV_HEADERS[domain];
  const columns = header.split(",");
  const values = columns.map((col) => {
    const val = (entry as Record<string, unknown>)[col];
    return val === undefined || val === null ? "" : String(val);
  });
  const row = values.join(",");

  if (!fileExists) {
    appendFileSync(filePath, `${header}\n${row}\n`);
  } else {
    appendFileSync(filePath, `${row}\n`);
  }
}
