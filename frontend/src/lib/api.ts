const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Targets {
  nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  strength?: Record<string, number>;
  steps?: { daily?: number };
  sleep?: { hours?: number };
  weight?: { target?: number };
}

export interface NutritionEntry {
  date: string;
  meal: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
}

export interface StrengthEntry {
  date: string;
  exercise: string;
  category: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
}

export interface StepsEntry {
  date: string;
  steps: number;
  notes: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  notes: string;
}

export interface StretchingEntry {
  date: string;
  stretch: string;
  duration_min: number;
  notes: string;
}

export interface CardioEntry {
  date: string;
  type: string;
  duration: number;
  notes: string;
}

export interface EntriesResponse<T> {
  entries: T[];
}

export interface TodayResponse {
  nutrition: NutritionEntry[];
  strength: StrengthEntry[];
  steps: StepsEntry[];
  weight: WeightEntry[];
  stretching: StretchingEntry[];
  cardio: CardioEntry[];
  sleep: unknown[];
}

export const api = {
  targets: () => get<Targets>("/targets"),
  today: () => get<TodayResponse>("/today"),
  nutrition: (year: number, month: string) =>
    get<EntriesResponse<NutritionEntry>>(`/nutrition/${year}/${month}`),
  strength: (year: number, month: string) =>
    get<EntriesResponse<StrengthEntry>>(`/strength/${year}/${month}`),
  steps: (year: number, month: string) =>
    get<EntriesResponse<StepsEntry>>(`/steps/${year}/${month}`),
  weight: (year: number, month: string) =>
    get<EntriesResponse<WeightEntry>>(`/weight/${year}/${month}`),
  stretching: (year: number, month: string) =>
    get<EntriesResponse<StretchingEntry>>(`/stretching/${year}/${month}`),
  cardio: (year: number, month: string) =>
    get<EntriesResponse<CardioEntry>>(`/cardio/${year}/${month}`),
};
