// src/mcp-server/tools/favorites.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  getFavoriteFoods,
  addFavoriteFood,
  updateFavoriteFood,
  deleteFavoriteFood,
} from "./favorites";
import { mkdirSync, rmSync } from "fs";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-favorites";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("favorites CRUD", () => {
  it("returns empty list when file does not exist", () => {
    expect(getFavoriteFoods(TEST_DATA_DIR)).toEqual([]);
  });

  it("adds and lists with stable indices", () => {
    addFavoriteFood({ name: "chicken breast", serving: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 }, TEST_DATA_DIR);
    addFavoriteFood({ name: "rice", serving: "1 cup", calories: 200, protein: 4, carbs: 45, fat: 0.5 }, TEST_DATA_DIR);

    const foods = getFavoriteFoods(TEST_DATA_DIR);
    expect(foods).toHaveLength(2);
    expect(foods[0]._index).toBe(0);
    expect(foods[1]._index).toBe(1);
    expect(foods[0].name).toBe("chicken breast");
  });

  it("filters by query", () => {
    addFavoriteFood({ name: "chicken breast", serving: "100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 }, TEST_DATA_DIR);
    addFavoriteFood({ name: "rice", serving: "1 cup", calories: 200, protein: 4, carbs: 45, fat: 0.5 }, TEST_DATA_DIR);

    const foods = getFavoriteFoods(TEST_DATA_DIR, "chicken");
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe("chicken breast");
    expect(foods[0]._index).toBe(0);
  });

  it("updates an existing favorite", () => {
    addFavoriteFood({ name: "rice", serving: "1 cup", calories: 200, protein: 4, carbs: 45, fat: 0.5 }, TEST_DATA_DIR);
    const result = updateFavoriteFood(0, { calories: 220 }, TEST_DATA_DIR);
    expect(result.success).toBe(true);
    const foods = getFavoriteFoods(TEST_DATA_DIR);
    expect(foods[0].calories).toBe(220);
    expect(foods[0].protein).toBe(4);
  });

  it("deletes by index and re-numbers", () => {
    addFavoriteFood({ name: "a", serving: "1", calories: 1, protein: 1, carbs: 1, fat: 1 }, TEST_DATA_DIR);
    addFavoriteFood({ name: "b", serving: "1", calories: 2, protein: 2, carbs: 2, fat: 2 }, TEST_DATA_DIR);
    addFavoriteFood({ name: "c", serving: "1", calories: 3, protein: 3, carbs: 3, fat: 3 }, TEST_DATA_DIR);

    deleteFavoriteFood(1, TEST_DATA_DIR);
    const foods = getFavoriteFoods(TEST_DATA_DIR);
    expect(foods.map((f) => f.name)).toEqual(["a", "c"]);
    expect(foods[1]._index).toBe(1);
  });

  it("rejects out-of-range update/delete", () => {
    addFavoriteFood({ name: "a", serving: "1", calories: 1, protein: 1, carbs: 1, fat: 1 }, TEST_DATA_DIR);
    expect(updateFavoriteFood(5, { calories: 99 }, TEST_DATA_DIR).success).toBe(false);
    expect(deleteFavoriteFood(5, TEST_DATA_DIR).success).toBe(false);
  });

  it("leaves an empty file when last entry is deleted", () => {
    addFavoriteFood({ name: "a", serving: "1", calories: 1, protein: 1, carbs: 1, fat: 1 }, TEST_DATA_DIR);
    deleteFavoriteFood(0, TEST_DATA_DIR);
    expect(getFavoriteFoods(TEST_DATA_DIR)).toEqual([]);
  });
});
