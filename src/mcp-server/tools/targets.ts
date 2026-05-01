// src/mcp-server/tools/targets.ts
import { readTargets, updateTargets, deleteTarget, type Targets } from "../../targets";

export function handleGetTargets(path: string = "targets.yaml"): Targets {
  return readTargets(path);
}

export function handleUpdateTargets(
  updates: Record<string, Record<string, number | string>>,
  path: string = "targets.yaml"
): Targets {
  return updateTargets(path, updates);
}

export function handleDeleteTarget(
  args: { section: string; key?: string },
  path: string = "targets.yaml"
): { success: boolean; message: string; targets: Targets } {
  return deleteTarget(path, args.section, args.key);
}
