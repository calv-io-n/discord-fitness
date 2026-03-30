// src/mcp-server/tools/favorites.ts
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

export interface FavoriteFood {
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function getFavoritesPath(dataDir: string): string {
  return `${dataDir}/favorites.jsonl`;
}

export function getFavoriteFoods(
  dataDir: string,
  query?: string
): FavoriteFood[] {
  const path = getFavoritesPath(dataDir);
  if (!existsSync(path)) return [];

  const lines = readFileSync(path, "utf-8")
    .split("\n")
    .filter((line) => line.trim());

  const foods: FavoriteFood[] = lines.map((line) => JSON.parse(line));

  if (query) {
    const q = query.toLowerCase();
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }
  return foods;
}

export function addFavoriteFood(
  food: FavoriteFood,
  dataDir: string
): { success: boolean; message: string } {
  const path = getFavoritesPath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, JSON.stringify(food) + "\n");
  return { success: true, message: `Added "${food.name}" (${food.serving}) to favorites` };
}
