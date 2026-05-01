// src/mcp-server/tools/targets.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleGetTargets, handleUpdateTargets, handleDeleteTarget } from "./targets";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/discord-fitness-test-mcp-targets";
const TARGETS_PATH = join(TEST_DIR, "targets.yaml");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(
    TARGETS_PATH,
    `nutrition:
  calories: 2500
  protein_g: 180
steps:
  daily: 10000
`
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("handleGetTargets", () => {
  it("returns current targets", () => {
    const targets = handleGetTargets(TARGETS_PATH);
    expect(targets.nutrition.calories).toBe(2500);
  });
});

describe("handleUpdateTargets", () => {
  it("updates and returns new targets", () => {
    const result = handleUpdateTargets({ nutrition: { calories: 2200 } }, TARGETS_PATH);
    expect(result.nutrition.calories).toBe(2200);
    expect(result.nutrition.protein_g).toBe(180);
  });
});

describe("handleDeleteTarget", () => {
  it("deletes a single key", () => {
    const result = handleDeleteTarget({ section: "nutrition", key: "protein_g" }, TARGETS_PATH);
    expect(result.success).toBe(true);
    expect((result.targets.nutrition as Record<string, unknown>).protein_g).toBeUndefined();
    expect(result.targets.nutrition.calories).toBe(2500);
  });

  it("deletes a whole section when key omitted", () => {
    const result = handleDeleteTarget({ section: "steps" }, TARGETS_PATH);
    expect(result.success).toBe(true);
    expect((result.targets as Record<string, unknown>).steps).toBeUndefined();
  });

  it("returns failure for unknown section", () => {
    const result = handleDeleteTarget({ section: "bogus" }, TARGETS_PATH);
    expect(result.success).toBe(false);
  });
});
