// src/mcp-server/tools/querying.ts
import { readEntries, getToday, getSummary, type Domain, type DomainEntry, type DateRange, type Summary } from "../../csv-store";

export function handleQueryDomain(
  args: { domain: string; from?: string; to?: string },
  dataDir: string = "data"
): { entries: DomainEntry[Domain][] } {
  const dateRange: DateRange = {};
  if (args.from) dateRange.from = args.from;
  if (args.to) dateRange.to = args.to;

  const entries = readEntries(args.domain as Domain, dataDir, dateRange);
  return { entries };
}

export function handleGetToday(
  dataDir: string = "data"
): Record<Domain, DomainEntry[Domain][]> {
  return getToday(dataDir);
}

export function handleGetSummary(
  args: { domain: string; from?: string; to?: string },
  dataDir: string = "data"
): Summary {
  const dateRange: DateRange = {};
  if (args.from) dateRange.from = args.from;
  if (args.to) dateRange.to = args.to;

  return getSummary(args.domain as Domain, dataDir, dateRange);
}
