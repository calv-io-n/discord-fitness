import { readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";

export interface Targets {
  nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  strength: { bench_press: number; squat: number; deadlift: number };
  steps: { daily: number };
  sleep: { hours: number };
  weight: { target: number; unit: string };
  [key: string]: Record<string, number | string>;
}

export function readTargets(path: string = "targets.yaml"): Targets {
  const content = readFileSync(path, "utf-8");
  return yaml.load(content) as Targets;
}

export function updateTargets(
  path: string = "targets.yaml",
  updates: Record<string, Record<string, number | string>>
): Targets {
  const current = readTargets(path);

  for (const [section, values] of Object.entries(updates)) {
    if (!current[section]) {
      current[section] = {} as Record<string, number | string>;
    }
    for (const [key, val] of Object.entries(values)) {
      (current[section] as Record<string, number | string>)[key] = val;
    }
  }

  writeFileSync(path, yaml.dump(current, { lineWidth: -1 }));
  return current;
}
