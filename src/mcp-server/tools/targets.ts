// src/mcp-server/tools/targets.ts
import { readTargets, updateTargets, type Targets } from "../../targets";

export function handleGetTargets(path: string = "targets.yaml"): Targets {
  return readTargets(path);
}

export function handleUpdateTargets(
  updates: Record<string, Record<string, number | string>>,
  path: string = "targets.yaml"
): Targets {
  return updateTargets(path, updates);
}
