// src/csv-store/types.ts

export const DOMAINS = ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface StrengthEntry {
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  unit: string;
  notes: string;
}

export interface CardioEntry {
  date: string;
  type: string;
  duration_min: number;
  distance: number;
  distance_unit: string;
  avg_hr: number;
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
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
  sugar_g: number;
  cholesterol_mg: number;
  notes: string;
}

export interface SleepEntry {
  date: string;
  bed_time: string;
  wake_time: string;
  duration_hr: number;
  quality: string;
  notes: string;
}

export interface WeightEntry {
  date: string;
  weight: number;
  unit: string;
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
  strength: "date,exercise,sets,reps,weight,unit,notes",
  cardio: "date,type,duration_min,distance,distance_unit,avg_hr,notes",
  steps: "date,steps,notes",
  nutrition: "date,meal,calories,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,sugar_g,cholesterol_mg,notes",
  sleep: "date,bed_time,wake_time,duration_hr,quality,notes",
  weight: "date,weight,unit,notes",
};

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}
