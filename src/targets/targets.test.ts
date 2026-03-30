import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readTargets, updateTargets } from "./targets";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/discord-fitness-test-targets";
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
weight:
  target: 180
  unit: lb
`
  );
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("readTargets", () => {
  it("reads and parses targets.yaml", () => {
    const targets = readTargets(TARGETS_PATH);
    expect(targets.nutrition.calories).toBe(2500);
    expect(targets.nutrition.protein_g).toBe(180);
    expect(targets.steps.daily).toBe(10000);
    expect(targets.weight.target).toBe(180);
  });
});

describe("updateTargets", () => {
  it("updates a nested value", () => {
    updateTargets(TARGETS_PATH, { nutrition: { calories: 2200 } });

    const targets = readTargets(TARGETS_PATH);
    expect(targets.nutrition.calories).toBe(2200);
    expect(targets.nutrition.protein_g).toBe(180); // unchanged
  });

  it("updates multiple values at once", () => {
    updateTargets(TARGETS_PATH, {
      nutrition: { calories: 2200, protein_g: 200 },
      steps: { daily: 12000 },
    });

    const targets = readTargets(TARGETS_PATH);
    expect(targets.nutrition.calories).toBe(2200);
    expect(targets.nutrition.protein_g).toBe(200);
    expect(targets.steps.daily).toBe(12000);
  });
});
