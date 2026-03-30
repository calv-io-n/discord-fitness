// src/csv-store/types.ts

export const DOMAINS = ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface StrengthEntry {
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
}

export interface CardioEntry {
  date: string;
  type: string;
  duration: number;
  notes: string;
}

export interface StepsEntry {
  date: string;
  steps: number;
  notes: string;
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

export interface SleepEntry {
  date: string;
  hours: number;
  quality: string;
  notes: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  notes: string;
}

export type DomainEntry = {
  strength: StrengthEntry;
  cardio: CardioEntry;
  steps: StepsEntry;
  nutrition: NutritionEntry;
  sleep: SleepEntry;
  weight: WeightEntry;
};

export const CSV_HEADERS: Record<Domain, string> = {
  strength: "date,exercise,sets,reps,weight,notes",
  cardio: "date,type,duration,notes",
  steps: "date,steps,notes",
  nutrition: "date,meal,calories,protein,carbs,fat,notes",
  sleep: "date,hours,quality,notes",
  weight: "date,weight,notes",
};

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}
