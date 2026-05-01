// src/csv-store/writer.ts
import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from "fs";
import Papa from "papaparse";
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
  const row = serializeRow(domain, entry as unknown as Record<string, unknown>);

  if (!fileExists) {
    appendFileSync(filePath, `${header}\n${row}\n`);
  } else {
    appendFileSync(filePath, `${row}\n`);
  }
}

interface MutationResult<D extends Domain> {
  success: boolean;
  message: string;
  entry?: DomainEntry[D];
}

export function updateEntry<D extends Domain>(
  domain: D,
  monthKey: string,
  index: number,
  updates: Partial<DomainEntry[D]>,
  dataDir: string = "data"
): MutationResult<D> {
  const filePath = `${dataDir}/${domain}/${monthKey}.csv`;
  if (!existsSync(filePath)) {
    return { success: false, message: `No data file at ${monthKey} for ${domain}` };
  }

  const rows = parseRows(filePath);
  if (index < 0 || index >= rows.length) {
    return { success: false, message: `Index ${index} out of range (have ${rows.length} entries)` };
  }

  const merged = { ...rows[index], ...(updates as Record<string, unknown>) };

  // If the date changed and now belongs to a different month, move the entry.
  const newDate = merged.date as string | undefined;
  if (newDate && newDate.slice(0, 7) !== monthKey) {
    rows.splice(index, 1);
    writeRows(filePath, domain, rows);
    appendEntry(domain, merged as unknown as DomainEntry[D], dataDir);
    return { success: true, message: `Updated and moved to ${newDate.slice(0, 7)}`, entry: merged as unknown as DomainEntry[D] };
  }

  rows[index] = merged;
  writeRows(filePath, domain, rows);
  return { success: true, message: `Updated entry ${index} in ${domain}/${monthKey}`, entry: merged as unknown as DomainEntry[D] };
}

export function deleteEntry(
  domain: Domain,
  monthKey: string,
  index: number,
  dataDir: string = "data"
): { success: boolean; message: string } {
  const filePath = `${dataDir}/${domain}/${monthKey}.csv`;
  if (!existsSync(filePath)) {
    return { success: false, message: `No data file at ${monthKey} for ${domain}` };
  }

  const rows = parseRows(filePath);
  if (index < 0 || index >= rows.length) {
    return { success: false, message: `Index ${index} out of range (have ${rows.length} entries)` };
  }

  rows.splice(index, 1);
  writeRows(filePath, domain, rows);
  return { success: true, message: `Deleted entry ${index} from ${domain}/${monthKey}` };
}

function parseRows(filePath: string): Record<string, unknown>[] {
  const content = readFileSync(filePath, "utf-8");
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.map((row) => ({ ...row }));
}

function writeRows(filePath: string, domain: Domain, rows: Record<string, unknown>[]): void {
  const header = CSV_HEADERS[domain];
  const body = rows.map((r) => serializeRow(domain, r)).join("\n");
  const content = body.length > 0 ? `${header}\n${body}\n` : `${header}\n`;
  writeFileSync(filePath, content);
}

function serializeRow(domain: Domain, entry: Record<string, unknown>): string {
  const columns = CSV_HEADERS[domain].split(",");
  return columns
    .map((col) => {
      const val = entry[col];
      return val === undefined || val === null ? "" : String(val);
    })
    .join(",");
}
