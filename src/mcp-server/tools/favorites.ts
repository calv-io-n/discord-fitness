// src/mcp-server/tools/favorites.ts
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface FavoriteFood {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FavoriteFoodWithIndex extends FavoriteFood {
  _index: number;
}

function getFavoritesPath(dataDir: string): string {
  return `${dataDir}/favorites.jsonl`;
}

function readAll(dataDir: string): FavoriteFood[] {
  const path = getFavoritesPath(dataDir);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function writeAll(foods: FavoriteFood[], dataDir: string): void {
  const path = getFavoritesPath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  const content = foods.map((f) => JSON.stringify(f)).join("\n");
  writeFileSync(path, foods.length > 0 ? `${content}\n` : "");
}

export function getFavoriteFoods(
  dataDir: string,
  query?: string
): FavoriteFoodWithIndex[] {
  const foods = readAll(dataDir).map((food, _index) => ({ ...food, _index }));

  if (query) {
    const q = query.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }
  return foods;
}

export function addFavoriteFood(
  food: FavoriteFood,
  dataDir: string
): { success: boolean; message: string; index: number } {
  const path = getFavoritesPath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  const existing = readAll(dataDir);
  appendFileSync(path, JSON.stringify(food) + "\n");
  return {
    success: true,
    message: `Added "${food.name}" (${food.serving}) to favorites`,
    index: existing.length,
  };
}

export function updateFavoriteFood(
  index: number,
  updates: Partial<FavoriteFood>,
  dataDir: string
): { success: boolean; message: string; food?: FavoriteFood } {
  const foods = readAll(dataDir);
  if (index < 0 || index >= foods.length) {
    return { success: false, message: `Index ${index} out of range (have ${foods.length} favorites)` };
  }
  const merged = { ...foods[index], ...updates };
  foods[index] = merged;
  writeAll(foods, dataDir);
  return { success: true, message: `Updated "${merged.name}"`, food: merged };
}

export function deleteFavoriteFood(
  index: number,
  dataDir: string
): { success: boolean; message: string } {
  const foods = readAll(dataDir);
  if (index < 0 || index >= foods.length) {
    return { success: false, message: `Index ${index} out of range (have ${foods.length} favorites)` };
  }
  const removed = foods.splice(index, 1)[0];
  writeAll(foods, dataDir);
  return { success: true, message: `Deleted "${removed.name}"` };
}
