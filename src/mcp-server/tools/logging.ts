// src/mcp-server/tools/logging.ts
import { appendEntry, type Domain, type DomainEntry } from "../../csv-store";

const TOOL_TO_DOMAIN: Record<string, Domain> = {
  log_strength: "strength",
  log_cardio: "cardio",
  log_steps: "steps",
  log_nutrition: "nutrition",
  log_sleep: "sleep",
  log_weight: "weight",
};

interface LogResult {
  success: boolean;
  message: string;
}

export function handleLogTool(
  toolName: string,
  args: Record<string, unknown>,
  dataDir: string = "data"
): LogResult {
  const domain = TOOL_TO_DOMAIN[toolName];
  if (!domain) {
    return { success: false, message: `Unknown tool: ${toolName}` };
  }

  const today = new Date().toISOString().slice(0, 10);
  const entry = { date: today, ...args } as DomainEntry[typeof domain];

  appendEntry(domain, entry, dataDir);

  return { success: true, message: `Logged ${domain} entry for ${(entry as { date: string }).date}` };
}

export interface BatchEntry {
  domain: string;
  data: Record<string, unknown>;
}

export interface BatchResult {
  success: boolean;
  results: LogResult[];
}

export function handleLogBatch(
  entries: BatchEntry[],
  dataDir: string = "data"
): BatchResult {
  const results: LogResult[] = [];

  for (const entry of entries) {
    const toolName = `log_${entry.domain}`;
    const result = handleLogTool(toolName, entry.data, dataDir);
    results.push(result);
  }

  const allSuccess = results.every((r) => r.success);
  return { success: allSuccess, results };
}

export const LOG_TOOL_NAMES = Object.keys(TOOL_TO_DOMAIN);
