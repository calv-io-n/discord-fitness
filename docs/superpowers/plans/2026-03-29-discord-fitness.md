# Discord Fitness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal fitness companion with CSV-backed data, an MCP server for data access, a web dashboard for analytics, and a Claude Code Discord agent for coaching.

**Architecture:** Bun + TypeScript monorepo. Shared `csv-store` module handles all CSV I/O. MCP server exposes CRUD tools. Elysia serves the dashboard API + static Chart.js frontend. Claude Code Discord agent uses CLAUDE.md, OpenClaw-style memory, and a `/loop` heartbeat.

**Tech Stack:** Bun, TypeScript, Elysia, Chart.js, `@modelcontextprotocol/sdk`, `papaparse`, `js-yaml`

---

## File Structure

```
discord-fitness/
├── package.json
├── tsconfig.json
├── targets.yaml
├── CLAUDE.md
├── start.sh
├── data/
│   ├── strength/
│   ├── cardio/
│   ├── steps/
│   ├── nutrition/
│   ├── sleep/
│   └── weight/
├── memory/
│   ├── MEMORY.md
│   ├── USER.md
│   └── daily/
├── .claude/
│   └── skills/
│       └── heartbeat/
│           └── SKILL.md
├── src/
│   ├── csv-store/
│   │   ├── types.ts              # Domain types + CSV schemas
│   │   ├── writer.ts             # Append entries to monthly CSVs
│   │   ├── writer.test.ts
│   │   ├── reader.ts             # Read + parse CSVs
│   │   ├── reader.test.ts
│   │   ├── query.ts              # Aggregate + summarize
│   │   ├── query.test.ts
│   │   └── index.ts              # Re-exports
│   ├── targets/
│   │   ├── targets.ts            # Read/write targets.yaml
│   │   ├── targets.test.ts
│   │   └── index.ts
│   ├── mcp-server/
│   │   ├── index.ts              # Server setup + tool registration
│   │   ├── tools/
│   │   │   ├── logging.ts        # log_* tools
│   │   │   ├── logging.test.ts
│   │   │   ├── querying.ts       # query_domain, get_today, get_summary
│   │   │   ├── querying.test.ts
│   │   │   ├── targets.ts        # get_targets, update_targets
│   │   │   └── targets.test.ts
│   │   └── run.ts                # Entry point: `bun run src/mcp-server/run.ts`
│   └── dashboard/
│       ├── index.ts              # Elysia app setup
│       ├── routes/
│       │   ├── api.ts            # API endpoints
│       │   └── api.test.ts
│       ├── public/
│       │   ├── index.html        # SPA shell
│       │   ├── app.js            # Chart.js frontend
│       │   └── style.css
│       └── run.ts                # Entry point: `bun run src/dashboard/run.ts`
└── docs/
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `targets.yaml`
- Create: `data/` directory structure
- Create: `memory/` directory structure with `.gitkeep` files

- [ ] **Step 1: Initialize Bun project**

```bash
cd /home/factorylevel/Projects/fitness/discord-fitness
bun init -y
```

- [ ] **Step 2: Install dependencies**

```bash
bun add elysia papaparse js-yaml @modelcontextprotocol/sdk
bun add -d @types/papaparse @types/js-yaml
```

- [ ] **Step 3: Configure tsconfig.json**

Replace the generated `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "paths": {
      "@csv-store/*": ["./src/csv-store/*"],
      "@targets/*": ["./src/targets/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create targets.yaml**

```yaml
nutrition:
  calories: 2500
  protein_g: 180
  carbs_g: 280
  fat_g: 80

strength:
  bench_press: 225
  squat: 315
  deadlift: 405

steps:
  daily: 10000

sleep:
  hours: 7.5

weight:
  target: 180
  unit: lb
```

- [ ] **Step 5: Create directory structure with .gitkeep files**

```bash
mkdir -p data/{strength,cardio,steps,nutrition,sleep,weight}
mkdir -p memory/daily
mkdir -p src/{csv-store,targets,mcp-server/tools,dashboard/routes,dashboard/public}
mkdir -p .claude/skills/heartbeat
touch data/strength/.gitkeep data/cardio/.gitkeep data/steps/.gitkeep
touch data/nutrition/.gitkeep data/sleep/.gitkeep data/weight/.gitkeep
touch memory/daily/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json bun.lock targets.yaml data/ memory/ src/ .claude/
git commit -m "chore: scaffold project structure with dependencies"
```

---

### Task 2: CSV Store — Types

**Files:**
- Create: `src/csv-store/types.ts`

- [ ] **Step 1: Define domain types**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/csv-store/types.ts
git commit -m "feat: add domain types and CSV schema definitions"
```

---

### Task 3: CSV Store — Writer

**Files:**
- Create: `src/csv-store/writer.ts`
- Create: `src/csv-store/writer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/csv-store/writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { appendEntry } from "./writer";
import { readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import type { StrengthEntry, NutritionEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-data";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("appendEntry", () => {
  it("creates CSV with header when file does not exist", () => {
    const entry: StrengthEntry = {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "felt strong",
    };

    appendEntry("strength", entry, TEST_DATA_DIR);

    const filePath = `${TEST_DATA_DIR}/strength/2026-03.csv`;
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[0]).toBe("date,exercise,sets,reps,weight,unit,notes");
    expect(lines[1]).toBe("2026-03-29,bench press,4,8,185,lb,felt strong");
  });

  it("appends to existing CSV without duplicating header", () => {
    const entry1: StrengthEntry = {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    };
    const entry2: StrengthEntry = {
      date: "2026-03-29",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "new PR",
    };

    appendEntry("strength", entry1, TEST_DATA_DIR);
    appendEntry("strength", entry2, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/strength/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 entries
    expect(lines[2]).toBe("2026-03-29,squat,5,5,315,lb,new PR");
  });

  it("handles nutrition entries with many columns", () => {
    const entry: NutritionEntry = {
      date: "2026-03-29",
      meal: "breakfast",
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      fiber_g: 8,
      sodium_mg: 600,
      sugar_g: 5,
      cholesterol_mg: 120,
      notes: "eggs and oats",
    };

    appendEntry("nutrition", entry, TEST_DATA_DIR);

    const content = readFileSync(`${TEST_DATA_DIR}/nutrition/2026-03.csv`, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines[1]).toBe("2026-03-29,breakfast,450,35,40,15,8,600,5,120,eggs and oats");
  });

  it("derives correct monthly filename from date", () => {
    const entry: StepsEntry = {
      date: "2026-04-15",
      steps: 8500,
      notes: "",
    };

    appendEntry("steps", entry, TEST_DATA_DIR);

    expect(existsSync(`${TEST_DATA_DIR}/steps/2026-04.csv`)).toBe(true);
  });
});

import type { StepsEntry } from "./types";
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/csv-store/writer.test.ts
```

Expected: FAIL — `appendEntry` does not exist.

- [ ] **Step 3: Implement writer**

```typescript
// src/csv-store/writer.ts
import { existsSync, mkdirSync, appendFileSync } from "fs";
import { CSV_HEADERS, type Domain, type DomainEntry } from "./types";

export function appendEntry<D extends Domain>(
  domain: D,
  entry: DomainEntry[D],
  dataDir: string = "data"
): void {
  const date = (entry as { date: string }).date;
  const monthKey = date.slice(0, 7); // YYYY-MM
  const domainDir = `${dataDir}/${domain}`;
  const filePath = `${domainDir}/${monthKey}.csv`;

  mkdirSync(domainDir, { recursive: true });

  const fileExists = existsSync(filePath);
  const header = CSV_HEADERS[domain];
  const columns = header.split(",");
  const values = columns.map((col) => {
    const val = (entry as Record<string, unknown>)[col];
    return val === undefined || val === null ? "" : String(val);
  });
  const row = values.join(",");

  if (!fileExists) {
    appendFileSync(filePath, `${header}\n${row}\n`);
  } else {
    appendFileSync(filePath, `${row}\n`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/csv-store/writer.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/csv-store/writer.ts src/csv-store/writer.test.ts
git commit -m "feat: add CSV writer with monthly file creation"
```

---

### Task 4: CSV Store — Reader

**Files:**
- Create: `src/csv-store/reader.ts`
- Create: `src/csv-store/reader.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/csv-store/reader.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { readEntries } from "./reader";
import { appendEntry } from "./writer";
import { mkdirSync, rmSync } from "fs";
import type { StrengthEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-reader";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("readEntries", () => {
  it("reads all entries for a month", () => {
    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-30",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(2);
    expect(entries[0].exercise).toBe("bench press");
    expect(entries[0].sets).toBe(4);
    expect(entries[1].exercise).toBe("squat");
  });

  it("reads entries across multiple months", () => {
    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-04-01",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(2);
  });

  it("filters entries by date range", () => {
    appendEntry("strength", {
      date: "2026-03-01",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-15",
      exercise: "squat",
      sets: 5,
      reps: 5,
      weight: 315,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    appendEntry("strength", {
      date: "2026-03-29",
      exercise: "deadlift",
      sets: 3,
      reps: 3,
      weight: 405,
      unit: "lb",
      notes: "",
    } as StrengthEntry, TEST_DATA_DIR);

    const entries = readEntries("strength", TEST_DATA_DIR, {
      from: "2026-03-10",
      to: "2026-03-20",
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].exercise).toBe("squat");
  });

  it("returns empty array when no data exists", () => {
    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/csv-store/reader.test.ts
```

Expected: FAIL — `readEntries` does not exist.

- [ ] **Step 3: Implement reader**

```typescript
// src/csv-store/reader.ts
import { readdirSync, readFileSync, existsSync } from "fs";
import Papa from "papaparse";
import { CSV_HEADERS, type Domain, type DomainEntry, type DateRange } from "./types";

export function readEntries<D extends Domain>(
  domain: D,
  dataDir: string = "data",
  dateRange?: DateRange
): DomainEntry[D][] {
  const domainDir = `${dataDir}/${domain}`;
  if (!existsSync(domainDir)) return [];

  const files = readdirSync(domainDir)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  const allEntries: DomainEntry[D][] = [];
  const header = CSV_HEADERS[domain];
  const numericColumns = getNumericColumns(domain);

  for (const file of files) {
    const content = readFileSync(`${domainDir}/${file}`, "utf-8");
    const parsed = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
    });

    for (const row of parsed.data) {
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        entry[key] = numericColumns.has(key) ? Number(val) : val;
      }
      allEntries.push(entry as DomainEntry[D]);
    }
  }

  if (!dateRange) return allEntries;

  return allEntries.filter((entry) => {
    const date = (entry as { date: string }).date;
    if (dateRange.from && date < dateRange.from) return false;
    if (dateRange.to && date > dateRange.to) return false;
    return true;
  });
}

function getNumericColumns(domain: Domain): Set<string> {
  const map: Record<Domain, string[]> = {
    strength: ["sets", "reps", "weight"],
    cardio: ["duration_min", "distance", "avg_hr"],
    steps: ["steps"],
    nutrition: ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sodium_mg", "sugar_g", "cholesterol_mg"],
    sleep: ["duration_hr"],
    weight: ["weight"],
  };
  return new Set(map[domain]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/csv-store/reader.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/csv-store/reader.ts src/csv-store/reader.test.ts
git commit -m "feat: add CSV reader with date range filtering"
```

---

### Task 5: CSV Store — Query & Aggregation

**Files:**
- Create: `src/csv-store/query.ts`
- Create: `src/csv-store/query.test.ts`
- Create: `src/csv-store/index.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/csv-store/query.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getToday, getSummary } from "./query";
import { appendEntry } from "./writer";
import { mkdirSync, rmSync } from "fs";
import type { NutritionEntry, StepsEntry, WeightEntry } from "./types";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-query";
const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("getToday", () => {
  it("returns entries from all domains for today", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("weight", { date: TODAY, weight: 185.4, unit: "lb", notes: "" } as WeightEntry, TEST_DATA_DIR);

    const result = getToday(TEST_DATA_DIR);
    expect(result.steps).toHaveLength(1);
    expect(result.weight).toHaveLength(1);
    expect(result.strength).toHaveLength(0);
  });
});

describe("getSummary", () => {
  it("returns totals and averages for nutrition", () => {
    const base: Omit<NutritionEntry, "date" | "meal" | "calories" | "protein_g" | "notes"> = {
      carbs_g: 40,
      fat_g: 15,
      fiber_g: 5,
      sodium_mg: 500,
      sugar_g: 5,
      cholesterol_mg: 100,
    };

    appendEntry("nutrition", {
      date: TODAY,
      meal: "breakfast",
      calories: 500,
      protein_g: 40,
      notes: "",
      ...base,
    } as NutritionEntry, TEST_DATA_DIR);

    appendEntry("nutrition", {
      date: TODAY,
      meal: "lunch",
      calories: 700,
      protein_g: 50,
      notes: "",
      ...base,
    } as NutritionEntry, TEST_DATA_DIR);

    const summary = getSummary("nutrition", TEST_DATA_DIR, { from: TODAY, to: TODAY });
    expect(summary.count).toBe(2);
    expect(summary.totals.calories).toBe(1200);
    expect(summary.totals.protein_g).toBe(90);
    expect(summary.averages.calories).toBe(600);
  });

  it("returns totals and averages for steps", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: TODAY, steps: 3000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const summary = getSummary("steps", TEST_DATA_DIR, { from: TODAY, to: TODAY });
    expect(summary.count).toBe(2);
    expect(summary.totals.steps).toBe(8000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/csv-store/query.test.ts
```

Expected: FAIL — `getToday` and `getSummary` do not exist.

- [ ] **Step 3: Implement query module**

```typescript
// src/csv-store/query.ts
import { readEntries } from "./reader";
import { DOMAINS, type Domain, type DomainEntry, type DateRange } from "./types";

export function getToday(dataDir: string = "data"): Record<Domain, DomainEntry[Domain][]> {
  const today = new Date().toISOString().slice(0, 10);
  const range: DateRange = { from: today, to: today };

  const result = {} as Record<Domain, DomainEntry[Domain][]>;
  for (const domain of DOMAINS) {
    result[domain] = readEntries(domain, dataDir, range);
  }
  return result;
}

export interface Summary {
  count: number;
  totals: Record<string, number>;
  averages: Record<string, number>;
}

export function getSummary(
  domain: Domain,
  dataDir: string = "data",
  dateRange?: DateRange
): Summary {
  const entries = readEntries(domain, dataDir, dateRange);
  const count = entries.length;
  if (count === 0) return { count: 0, totals: {}, averages: {} };

  const numericKeys: string[] = [];
  const first = entries[0] as Record<string, unknown>;
  for (const [key, val] of Object.entries(first)) {
    if (typeof val === "number") numericKeys.push(key);
  }

  const totals: Record<string, number> = {};
  for (const key of numericKeys) totals[key] = 0;

  for (const entry of entries) {
    const row = entry as Record<string, unknown>;
    for (const key of numericKeys) {
      totals[key] += row[key] as number;
    }
  }

  const averages: Record<string, number> = {};
  for (const key of numericKeys) {
    averages[key] = totals[key] / count;
  }

  return { count, totals, averages };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/csv-store/query.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Create index.ts re-exports**

```typescript
// src/csv-store/index.ts
export { appendEntry } from "./writer";
export { readEntries } from "./reader";
export { getToday, getSummary, type Summary } from "./query";
export {
  DOMAINS,
  CSV_HEADERS,
  type Domain,
  type DomainEntry,
  type DateRange,
  type StrengthEntry,
  type CardioEntry,
  type StepsEntry,
  type NutritionEntry,
  type SleepEntry,
  type WeightEntry,
} from "./types";
```

- [ ] **Step 6: Run all csv-store tests**

```bash
bun test src/csv-store/
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/csv-store/query.ts src/csv-store/query.test.ts src/csv-store/index.ts
git commit -m "feat: add CSV query/aggregation and csv-store index"
```

---

### Task 6: Targets Module

**Files:**
- Create: `src/targets/targets.ts`
- Create: `src/targets/targets.test.ts`
- Create: `src/targets/index.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/targets/targets.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/targets/targets.test.ts
```

Expected: FAIL — `readTargets` and `updateTargets` do not exist.

- [ ] **Step 3: Implement targets module**

```typescript
// src/targets/targets.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/targets/targets.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Create index.ts**

```typescript
// src/targets/index.ts
export { readTargets, updateTargets, type Targets } from "./targets";
```

- [ ] **Step 6: Commit**

```bash
git add src/targets/
git commit -m "feat: add targets module for reading/writing targets.yaml"
```

---

### Task 7: MCP Server — Logging Tools

**Files:**
- Create: `src/mcp-server/tools/logging.ts`
- Create: `src/mcp-server/tools/logging.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/mcp-server/tools/logging.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleLogTool } from "./logging";
import { readEntries } from "../../csv-store";
import { mkdirSync, rmSync } from "fs";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-mcp-log";

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("handleLogTool", () => {
  it("logs a strength entry", () => {
    const result = handleLogTool("log_strength", {
      date: "2026-03-29",
      exercise: "bench press",
      sets: 4,
      reps: 8,
      weight: 185,
      unit: "lb",
      notes: "",
    }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const entries = readEntries("strength", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].exercise).toBe("bench press");
  });

  it("logs a nutrition entry", () => {
    const result = handleLogTool("log_nutrition", {
      date: "2026-03-29",
      meal: "breakfast",
      calories: 450,
      protein_g: 35,
      carbs_g: 40,
      fat_g: 15,
      fiber_g: 8,
      sodium_mg: 600,
      sugar_g: 5,
      cholesterol_mg: 120,
      notes: "eggs and oats",
    }, TEST_DATA_DIR);

    expect(result.success).toBe(true);
    const entries = readEntries("nutrition", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBe(450);
  });

  it("defaults date to today when not provided", () => {
    const today = new Date().toISOString().slice(0, 10);

    handleLogTool("log_steps", {
      steps: 10000,
      notes: "",
    }, TEST_DATA_DIR);

    const entries = readEntries("steps", TEST_DATA_DIR);
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe(today);
  });

  it("returns error for unknown tool", () => {
    const result = handleLogTool("log_unknown", {}, TEST_DATA_DIR);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/mcp-server/tools/logging.test.ts
```

Expected: FAIL — `handleLogTool` does not exist.

- [ ] **Step 3: Implement logging tools**

```typescript
// src/mcp-server/tools/logging.ts
import { appendEntry, type Domain, type DomainEntry } from "../../csv-store";

const TOOL_TO_DOMAIN: Record<string, Domain> = {
  log_strength: "strength",
  log_cardio: "cardio",
  log_steps: "steps",
  log_nutrition: "nutrition",
  log_sleep: "sleep",
  log_weight: "weight",
};

interface LogResult {
  success: boolean;
  message: string;
}

export function handleLogTool(
  toolName: string,
  args: Record<string, unknown>,
  dataDir: string = "data"
): LogResult {
  const domain = TOOL_TO_DOMAIN[toolName];
  if (!domain) {
    return { success: false, message: `Unknown tool: ${toolName}` };
  }

  const today = new Date().toISOString().slice(0, 10);
  const entry = { date: today, ...args } as DomainEntry[typeof domain];

  appendEntry(domain, entry, dataDir);

  return { success: true, message: `Logged ${domain} entry for ${(entry as { date: string }).date}` };
}

export const LOG_TOOL_NAMES = Object.keys(TOOL_TO_DOMAIN);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/mcp-server/tools/logging.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mcp-server/tools/logging.ts src/mcp-server/tools/logging.test.ts
git commit -m "feat: add MCP logging tools for all 6 domains"
```

---

### Task 8: MCP Server — Query & Target Tools

**Files:**
- Create: `src/mcp-server/tools/querying.ts`
- Create: `src/mcp-server/tools/querying.test.ts`
- Create: `src/mcp-server/tools/targets.ts`
- Create: `src/mcp-server/tools/targets.test.ts`

- [ ] **Step 1: Write failing test for querying**

```typescript
// src/mcp-server/tools/querying.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleQueryDomain, handleGetToday, handleGetSummary } from "./querying";
import { appendEntry, type StepsEntry, type NutritionEntry } from "../../csv-store";
import { mkdirSync, rmSync } from "fs";

const TEST_DATA_DIR = "/tmp/discord-fitness-test-mcp-query";
const TODAY = new Date().toISOString().slice(0, 10);

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

describe("handleQueryDomain", () => {
  it("returns entries for a domain with date range", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);
    appendEntry("steps", { date: "2025-01-01", steps: 3000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const result = handleQueryDomain({ domain: "steps", from: TODAY, to: TODAY }, TEST_DATA_DIR);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].steps).toBe(5000);
  });
});

describe("handleGetToday", () => {
  it("returns all domains for today", () => {
    appendEntry("steps", { date: TODAY, steps: 5000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const result = handleGetToday(TEST_DATA_DIR);
    expect(result.steps).toHaveLength(1);
    expect(result.strength).toHaveLength(0);
  });
});

describe("handleGetSummary", () => {
  it("returns aggregated stats", () => {
    const base = { carbs_g: 40, fat_g: 15, fiber_g: 5, sodium_mg: 500, sugar_g: 5, cholesterol_mg: 100 };
    appendEntry("nutrition", { date: TODAY, meal: "breakfast", calories: 500, protein_g: 40, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);
    appendEntry("nutrition", { date: TODAY, meal: "lunch", calories: 700, protein_g: 50, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);

    const result = handleGetSummary({ domain: "nutrition", from: TODAY, to: TODAY }, TEST_DATA_DIR);
    expect(result.count).toBe(2);
    expect(result.totals.calories).toBe(1200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/mcp-server/tools/querying.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement querying tools**

```typescript
// src/mcp-server/tools/querying.ts
import { readEntries, getToday, getSummary, type Domain, type DomainEntry, type DateRange, type Summary } from "../../csv-store";

export function handleQueryDomain(
  args: { domain: string; from?: string; to?: string },
  dataDir: string = "data"
): { entries: DomainEntry[Domain][] } {
  const dateRange: DateRange = {};
  if (args.from) dateRange.from = args.from;
  if (args.to) dateRange.to = args.to;

  const entries = readEntries(args.domain as Domain, dataDir, dateRange);
  return { entries };
}

export function handleGetToday(
  dataDir: string = "data"
): Record<Domain, DomainEntry[Domain][]> {
  return getToday(dataDir);
}

export function handleGetSummary(
  args: { domain: string; from?: string; to?: string },
  dataDir: string = "data"
): Summary {
  const dateRange: DateRange = {};
  if (args.from) dateRange.from = args.from;
  if (args.to) dateRange.to = args.to;

  return getSummary(args.domain as Domain, dataDir, dateRange);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/mcp-server/tools/querying.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Write failing test for target tools**

```typescript
// src/mcp-server/tools/targets.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { handleGetTargets, handleUpdateTargets } from "./targets";
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
```

- [ ] **Step 6: Implement target tools**

```typescript
// src/mcp-server/tools/targets.ts
import { readTargets, updateTargets, type Targets } from "../../targets";

export function handleGetTargets(path: string = "targets.yaml"): Targets {
  return readTargets(path);
}

export function handleUpdateTargets(
  updates: Record<string, Record<string, number | string>>,
  path: string = "targets.yaml"
): Targets {
  return updateTargets(path, updates);
}
```

- [ ] **Step 7: Run all MCP tool tests**

```bash
bun test src/mcp-server/tools/
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/mcp-server/tools/querying.ts src/mcp-server/tools/querying.test.ts
git add src/mcp-server/tools/targets.ts src/mcp-server/tools/targets.test.ts
git commit -m "feat: add MCP query and target tools"
```

---

### Task 9: MCP Server — Server Setup & Entry Point

**Files:**
- Create: `src/mcp-server/index.ts`
- Create: `src/mcp-server/run.ts`

- [ ] **Step 1: Implement MCP server with tool registration**

```typescript
// src/mcp-server/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { handleLogTool, LOG_TOOL_NAMES } from "./tools/logging";
import { handleQueryDomain, handleGetToday, handleGetSummary } from "./tools/querying";
import { handleGetTargets, handleUpdateTargets } from "./tools/targets";
import { readFileSync } from "fs";

export function createServer(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  const server = new Server(
    { name: "discord-fitness", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "log_strength",
        description: "Log a strength training entry (exercise, sets, reps, weight)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
            exercise: { type: "string" },
            sets: { type: "number" },
            reps: { type: "number" },
            weight: { type: "number" },
            unit: { type: "string", default: "lb" },
            notes: { type: "string", default: "" },
          },
          required: ["exercise", "sets", "reps", "weight"],
        },
      },
      {
        name: "log_cardio",
        description: "Log a cardio session (type, duration, distance, heart rate)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            type: { type: "string" },
            duration_min: { type: "number" },
            distance: { type: "number" },
            distance_unit: { type: "string", default: "mi" },
            avg_hr: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["type", "duration_min"],
        },
      },
      {
        name: "log_steps",
        description: "Log daily step count",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            steps: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["steps"],
        },
      },
      {
        name: "log_nutrition",
        description: "Log a meal with macros and key micronutrients",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            meal: { type: "string" },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sodium_mg: { type: "number" },
            sugar_g: { type: "number" },
            cholesterol_mg: { type: "number" },
            notes: { type: "string", default: "" },
          },
          required: ["meal", "calories", "protein_g", "carbs_g", "fat_g"],
        },
      },
      {
        name: "log_sleep",
        description: "Log a sleep entry (bed time, wake time, quality)",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            bed_time: { type: "string" },
            wake_time: { type: "string" },
            duration_hr: { type: "number" },
            quality: { type: "string" },
            notes: { type: "string", default: "" },
          },
          required: ["bed_time", "wake_time", "duration_hr"],
        },
      },
      {
        name: "log_weight",
        description: "Log a body weight measurement",
        inputSchema: {
          type: "object" as const,
          properties: {
            date: { type: "string" },
            weight: { type: "number" },
            unit: { type: "string", default: "lb" },
            notes: { type: "string", default: "" },
          },
          required: ["weight"],
        },
      },
      {
        name: "query_domain",
        description: "Read entries for a fitness domain with optional date range filtering",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] },
            from: { type: "string", description: "YYYY-MM-DD start date" },
            to: { type: "string", description: "YYYY-MM-DD end date" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_today",
        description: "Get all entries across all fitness domains for today",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_summary",
        description: "Get aggregated stats (totals, averages) for a domain over a date range",
        inputSchema: {
          type: "object" as const,
          properties: {
            domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight"] },
            from: { type: "string" },
            to: { type: "string" },
          },
          required: ["domain"],
        },
      },
      {
        name: "get_targets",
        description: "Read current fitness targets from targets.yaml",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "update_targets",
        description: "Update one or more fitness target values",
        inputSchema: {
          type: "object" as const,
          properties: {
            updates: {
              type: "object",
              description: "Nested object of section -> key -> value to update",
            },
          },
          required: ["updates"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (LOG_TOOL_NAMES.includes(name)) {
      const result = handleLogTool(name, args as Record<string, unknown>, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "query_domain") {
      const result = handleQueryDomain(args as { domain: string; from?: string; to?: string }, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_today") {
      const result = handleGetToday(dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_summary") {
      const result = handleGetSummary(args as { domain: string; from?: string; to?: string }, dataDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    if (name === "get_targets") {
      const targets = handleGetTargets(targetsPath);
      return { content: [{ type: "text" as const, text: JSON.stringify(targets) }] };
    }

    if (name === "update_targets") {
      const { updates } = args as { updates: Record<string, Record<string, number | string>> };
      const result = handleUpdateTargets(updates, targetsPath);
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    }

    return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }], isError: true };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "file:///targets.yaml",
        name: "Fitness Targets",
        description: "Current fitness goals and targets",
        mimeType: "text/yaml",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "file:///targets.yaml") {
      const content = readFileSync(targetsPath, "utf-8");
      return { contents: [{ uri: request.params.uri, text: content, mimeType: "text/yaml" }] };
    }
    throw new Error(`Unknown resource: ${request.params.uri}`);
  });

  return server;
}
```

- [ ] **Step 2: Create entry point**

```typescript
// src/mcp-server/run.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");

const server = createServer(dataDir, targetsPath);
const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 3: Add scripts to package.json**

Add to the `scripts` section of `package.json`:

```json
{
  "scripts": {
    "mcp": "bun run src/mcp-server/run.ts",
    "dashboard": "bun run src/dashboard/run.ts",
    "test": "bun test"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/mcp-server/index.ts src/mcp-server/run.ts package.json
git commit -m "feat: add MCP server with all tools and resource"
```

---

### Task 10: Dashboard — API Routes

**Files:**
- Create: `src/dashboard/routes/api.ts`
- Create: `src/dashboard/routes/api.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/dashboard/routes/api.test.ts
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Elysia } from "elysia";
import { apiRoutes } from "./api";
import { appendEntry, type StepsEntry, type NutritionEntry } from "../../csv-store";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const TEST_DIR = "/tmp/discord-fitness-test-dashboard";
const TEST_DATA_DIR = join(TEST_DIR, "data");
const TARGETS_PATH = join(TEST_DIR, "targets.yaml");

beforeEach(() => {
  mkdirSync(TEST_DATA_DIR, { recursive: true });
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

function createApp() {
  return new Elysia().use(apiRoutes(TEST_DATA_DIR, TARGETS_PATH));
}

describe("GET /api/:domain/:year/:month", () => {
  it("returns CSV data as JSON", async () => {
    appendEntry("steps", { date: "2026-03-29", steps: 10000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/steps/2026/03"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].steps).toBe(10000);
  });

  it("returns empty array for missing data", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/steps/2026/03"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.entries).toEqual([]);
  });
});

describe("GET /api/targets", () => {
  it("returns current targets", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/targets"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nutrition.calories).toBe(2500);
  });
});

describe("GET /api/today", () => {
  it("returns today entries across all domains", async () => {
    const today = new Date().toISOString().slice(0, 10);
    appendEntry("steps", { date: today, steps: 8000, notes: "" } as StepsEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/today"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.steps).toHaveLength(1);
  });
});

describe("GET /api/:domain/summary", () => {
  it("returns aggregated stats", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const base = { carbs_g: 40, fat_g: 15, fiber_g: 5, sodium_mg: 500, sugar_g: 5, cholesterol_mg: 100 };
    appendEntry("nutrition", { date: today, meal: "breakfast", calories: 500, protein_g: 40, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);
    appendEntry("nutrition", { date: today, meal: "lunch", calories: 700, protein_g: 50, notes: "", ...base } as NutritionEntry, TEST_DATA_DIR);

    const app = createApp();
    const res = await app.handle(new Request(`http://localhost/api/nutrition/summary?from=${today}&to=${today}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(2);
    expect(body.totals.calories).toBe(1200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test src/dashboard/routes/api.test.ts
```

Expected: FAIL — `apiRoutes` does not exist.

- [ ] **Step 3: Implement API routes**

```typescript
// src/dashboard/routes/api.ts
import { Elysia } from "elysia";
import { readEntries, getToday, getSummary, type Domain, DOMAINS } from "../../csv-store";
import { readTargets } from "../../targets";

export function apiRoutes(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  return new Elysia({ prefix: "/api" })
    .get("/targets", () => {
      return readTargets(targetsPath);
    })
    .get("/today", () => {
      return getToday(dataDir);
    })
    .get("/:domain/summary", ({ params, query }) => {
      const domain = params.domain as Domain;
      if (!DOMAINS.includes(domain)) {
        return { error: `Invalid domain: ${domain}` };
      }
      return getSummary(domain, dataDir, {
        from: query.from as string | undefined,
        to: query.to as string | undefined,
      });
    })
    .get("/:domain/:year/:month", ({ params }) => {
      const domain = params.domain as Domain;
      if (!DOMAINS.includes(domain)) {
        return { error: `Invalid domain: ${domain}` };
      }
      const monthPrefix = `${params.year}-${params.month}`;
      const entries = readEntries(domain, dataDir, {
        from: `${monthPrefix}-01`,
        to: `${monthPrefix}-31`,
      });
      return { entries };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test src/dashboard/routes/api.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/routes/api.ts src/dashboard/routes/api.test.ts
git commit -m "feat: add dashboard API routes"
```

---

### Task 11: Dashboard — Elysia App & Static Frontend

**Files:**
- Create: `src/dashboard/index.ts`
- Create: `src/dashboard/run.ts`
- Create: `src/dashboard/public/index.html`
- Create: `src/dashboard/public/style.css`
- Create: `src/dashboard/public/app.js`

- [ ] **Step 1: Create Elysia app setup**

```typescript
// src/dashboard/index.ts
import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { apiRoutes } from "./routes/api";
import { resolve } from "path";

export function createApp(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  const publicDir = resolve(import.meta.dir, "public");

  return new Elysia()
    .use(apiRoutes(dataDir, targetsPath))
    .use(staticPlugin({ assets: publicDir, prefix: "/" }));
}
```

- [ ] **Step 2: Create entry point**

```typescript
// src/dashboard/run.ts
import { createApp } from "./index";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");
const dataDir = resolve(ROOT, "data");
const targetsPath = resolve(ROOT, "targets.yaml");
const PORT = Number(process.env.PORT) || 3000;

const app = createApp(dataDir, targetsPath);
app.listen(PORT);

console.log(`Dashboard running at http://localhost:${PORT}`);
```

- [ ] **Step 3: Install static plugin**

```bash
bun add @elysiajs/static
```

- [ ] **Step 4: Create HTML shell**

```html
<!-- src/dashboard/public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fitness Dashboard</title>
  <link rel="stylesheet" href="/style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
</head>
<body>
  <header>
    <h1>Fitness Dashboard</h1>
    <nav>
      <button class="nav-btn active" data-view="overview">Overview</button>
      <button class="nav-btn" data-view="trends">Trends</button>
      <button class="nav-btn" data-view="adherence">Adherence</button>
      <button class="nav-btn" data-view="nutrition">Nutrition</button>
      <button class="nav-btn" data-view="domain">Domain Detail</button>
    </nav>
  </header>
  <main id="app"></main>
  <script src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 5: Create CSS**

```css
/* src/dashboard/public/style.css */
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #0f0f0f;
  color: #e0e0e0;
  min-height: 100vh;
}

header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #222;
}

header h1 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

nav {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  background: #1a1a1a;
  color: #999;
  border: 1px solid #333;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
}

.nav-btn.active {
  background: #2a2a2a;
  color: #fff;
  border-color: #555;
}

main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.card {
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 1.25rem;
}

.card h3 {
  font-size: 0.875rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.card .value {
  font-size: 2rem;
  font-weight: 700;
}

.card .target {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.progress-bar {
  height: 4px;
  background: #333;
  border-radius: 2px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: #4aba70;
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-bar .fill.over {
  background: #e74c3c;
}

.chart-container {
  background: #1a1a1a;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
}

.chart-container h3 {
  margin-bottom: 1rem;
  font-size: 1rem;
}

.chart-container canvas {
  max-height: 300px;
}

.date-range {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.date-range input {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #e0e0e0;
  padding: 0.5rem;
  border-radius: 4px;
}

.domain-select {
  background: #1a1a1a;
  border: 1px solid #333;
  color: #e0e0e0;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.heatmap-cell {
  aspect-ratio: 1;
  border-radius: 2px;
  font-size: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.heatmap-cell.hit { background: #2d6a4f; }
.heatmap-cell.miss { background: #6b2020; }
.heatmap-cell.empty { background: #1a1a1a; }
```

- [ ] **Step 6: Create frontend JavaScript**

```javascript
// src/dashboard/public/app.js

const app = document.getElementById("app");
const navBtns = document.querySelectorAll(".nav-btn");

let currentView = "overview";
let chartInstances = [];

navBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    navBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    render();
  });
});

async function api(path) {
  const res = await fetch(`/api${path}`);
  return res.json();
}

function destroyCharts() {
  chartInstances.forEach((c) => c.destroy());
  chartInstances = [];
}

function createChart(canvas, config) {
  const chart = new Chart(canvas, config);
  chartInstances.push(chart);
  return chart;
}

// --- Overview ---
async function renderOverview() {
  const [today, targets] = await Promise.all([api("/today"), api("/targets")]);

  const totalCalories = (today.nutrition || []).reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = (today.nutrition || []).reduce((sum, e) => sum + e.protein_g, 0);
  const totalCarbs = (today.nutrition || []).reduce((sum, e) => sum + e.carbs_g, 0);
  const totalFat = (today.nutrition || []).reduce((sum, e) => sum + e.fat_g, 0);
  const totalSteps = (today.steps || []).reduce((sum, e) => sum + e.steps, 0);
  const latestWeight = (today.weight || []).slice(-1)[0];
  const latestSleep = (today.sleep || []).slice(-1)[0];

  const cards = [
    { label: "Calories", value: totalCalories, target: targets.nutrition?.calories, unit: "kcal" },
    { label: "Protein", value: totalProtein, target: targets.nutrition?.protein_g, unit: "g" },
    { label: "Carbs", value: totalCarbs, target: targets.nutrition?.carbs_g, unit: "g" },
    { label: "Fat", value: totalFat, target: targets.nutrition?.fat_g, unit: "g" },
    { label: "Steps", value: totalSteps, target: targets.steps?.daily, unit: "" },
    { label: "Weight", value: latestWeight?.weight || "—", target: targets.weight?.target, unit: targets.weight?.unit || "lb" },
    { label: "Sleep", value: latestSleep?.duration_hr || "—", target: targets.sleep?.hours, unit: "hrs" },
  ];

  app.innerHTML = `
    <h2>Today</h2>
    <div class="cards">
      ${cards.map((c) => {
        const pct = c.target && typeof c.value === "number" ? Math.min((c.value / c.target) * 100, 150) : 0;
        const over = pct > 105 && (c.label === "Calories" || c.label === "Fat");
        return `
          <div class="card">
            <h3>${c.label}</h3>
            <div class="value">${c.value} <small>${c.unit}</small></div>
            ${c.target ? `<div class="target">Target: ${c.target} ${c.unit}</div>
            <div class="progress-bar"><div class="fill ${over ? "over" : ""}" style="width:${Math.min(pct, 100)}%"></div></div>` : ""}
          </div>`;
      }).join("")}
    </div>
  `;
}

// --- Trends ---
async function renderTrends() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const [weight, nutrition, steps, sleep] = await Promise.all([
    api(`/weight/${year}/${month}`),
    api(`/nutrition/${year}/${month}`),
    api(`/steps/${year}/${month}`),
    api(`/sleep/${year}/${month}`),
  ]);

  app.innerHTML = `
    <h2>Trends</h2>
    <div class="chart-container"><h3>Weight</h3><canvas id="weightChart"></canvas></div>
    <div class="chart-container"><h3>Daily Calories</h3><canvas id="calorieChart"></canvas></div>
    <div class="chart-container"><h3>Daily Steps</h3><canvas id="stepsChart"></canvas></div>
    <div class="chart-container"><h3>Sleep Duration</h3><canvas id="sleepChart"></canvas></div>
  `;

  const chartDefaults = { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "#888" } }, y: { ticks: { color: "#888" } } } };

  if (weight.entries.length) {
    createChart(document.getElementById("weightChart"), {
      type: "line",
      data: { labels: weight.entries.map((e) => e.date), datasets: [{ data: weight.entries.map((e) => e.weight), borderColor: "#4aba70", tension: 0.3 }] },
      options: chartDefaults,
    });
  }

  // Aggregate nutrition per day
  const calByDay = {};
  (nutrition.entries || []).forEach((e) => { calByDay[e.date] = (calByDay[e.date] || 0) + e.calories; });
  const calDays = Object.keys(calByDay).sort();
  if (calDays.length) {
    createChart(document.getElementById("calorieChart"), {
      type: "bar",
      data: { labels: calDays, datasets: [{ data: calDays.map((d) => calByDay[d]), backgroundColor: "#3498db" }] },
      options: chartDefaults,
    });
  }

  if (steps.entries.length) {
    createChart(document.getElementById("stepsChart"), {
      type: "bar",
      data: { labels: steps.entries.map((e) => e.date), datasets: [{ data: steps.entries.map((e) => e.steps), backgroundColor: "#e67e22" }] },
      options: chartDefaults,
    });
  }

  if (sleep.entries.length) {
    createChart(document.getElementById("sleepChart"), {
      type: "line",
      data: { labels: sleep.entries.map((e) => e.date), datasets: [{ data: sleep.entries.map((e) => e.duration_hr), borderColor: "#9b59b6", tension: 0.3 }] },
      options: chartDefaults,
    });
  }
}

// --- Adherence ---
async function renderAdherence() {
  const targets = await api("/targets");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const [nutrition, steps, sleep] = await Promise.all([
    api(`/nutrition/${year}/${month}`),
    api(`/steps/${year}/${month}`),
    api(`/sleep/${year}/${month}`),
  ]);

  // Protein adherence per day
  const proteinByDay = {};
  (nutrition.entries || []).forEach((e) => { proteinByDay[e.date] = (proteinByDay[e.date] || 0) + e.protein_g; });

  const stepsByDay = {};
  (steps.entries || []).forEach((e) => { stepsByDay[e.date] = (stepsByDay[e.date] || 0) + e.steps; });

  const sleepByDay = {};
  (sleep.entries || []).forEach((e) => { sleepByDay[e.date] = e.duration_hr; });

  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();

  function heatmapHTML(data, target, label) {
    let cells = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month}-${String(d).padStart(2, "0")}`;
      const val = data[dateStr];
      const cls = val === undefined ? "empty" : val >= target ? "hit" : "miss";
      cells += `<div class="heatmap-cell ${cls}" title="${dateStr}: ${val ?? '—'}">${d}</div>`;
    }
    return `<div class="chart-container"><h3>${label} (target: ${target})</h3><div class="heatmap">${cells}</div></div>`;
  }

  app.innerHTML = `
    <h2>Adherence — ${year}-${month}</h2>
    ${heatmapHTML(proteinByDay, targets.nutrition?.protein_g || 180, "Protein (g)")}
    ${heatmapHTML(stepsByDay, targets.steps?.daily || 10000, "Steps")}
    ${heatmapHTML(sleepByDay, targets.sleep?.hours || 7.5, "Sleep (hrs)")}
  `;
}

// --- Nutrition (macro breakdown + calorie tracking) ---
async function renderNutrition() {
  const targets = await api("/targets");
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const today = now.toISOString().slice(0, 10);

  const nutrition = await api(`/nutrition/${year}/${month}`);
  const entries = nutrition.entries || [];

  // Today's macros
  const todayEntries = entries.filter((e) => e.date === today);
  const todayProtein = todayEntries.reduce((s, e) => s + e.protein_g, 0);
  const todayCarbs = todayEntries.reduce((s, e) => s + e.carbs_g, 0);
  const todayFat = todayEntries.reduce((s, e) => s + e.fat_g, 0);
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0);

  // Weekly calories
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEntries = entries.filter((e) => e.date >= weekStartStr && e.date <= today);
  const weekCalories = weekEntries.reduce((s, e) => s + e.calories, 0);
  const weeklyTarget = (targets.nutrition?.calories || 2500) * 7;

  // Daily calories over the month
  const calByDay = {};
  entries.forEach((e) => { calByDay[e.date] = (calByDay[e.date] || 0) + e.calories; });
  const calDays = Object.keys(calByDay).sort();

  app.innerHTML = `
    <h2>Nutrition</h2>
    <div class="cards">
      <div class="card"><h3>Today's Calories</h3><div class="value">${todayCalories} <small>/ ${targets.nutrition?.calories || "—"}</small></div></div>
      <div class="card"><h3>Week Calories</h3><div class="value">${weekCalories} <small>/ ${weeklyTarget}</small></div></div>
    </div>
    <div class="chart-container"><h3>Macro Breakdown (Today)</h3><canvas id="macroChart"></canvas></div>
    <div class="chart-container"><h3>Daily Calories vs Target</h3><canvas id="dailyCalChart"></canvas></div>
  `;

  if (todayProtein || todayCarbs || todayFat) {
    createChart(document.getElementById("macroChart"), {
      type: "doughnut",
      data: {
        labels: ["Protein", "Carbs", "Fat"],
        datasets: [{ data: [todayProtein, todayCarbs, todayFat], backgroundColor: ["#e74c3c", "#3498db", "#f1c40f"] }],
      },
      options: { responsive: true, plugins: { legend: { labels: { color: "#ccc" } } } },
    });
  }

  if (calDays.length) {
    const dailyTarget = targets.nutrition?.calories || 2500;
    createChart(document.getElementById("dailyCalChart"), {
      type: "bar",
      data: {
        labels: calDays,
        datasets: [
          { label: "Calories", data: calDays.map((d) => calByDay[d]), backgroundColor: "#3498db" },
          { label: "Target", data: calDays.map(() => dailyTarget), type: "line", borderColor: "#e74c3c", borderDash: [5, 5], pointRadius: 0, fill: false },
        ],
      },
      options: { responsive: true, plugins: { legend: { labels: { color: "#ccc" } } }, scales: { x: { ticks: { color: "#888" } }, y: { ticks: { color: "#888" } } } },
    });
  }
}

// --- Domain Detail ---
async function renderDomain() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  app.innerHTML = `
    <h2>Domain Detail</h2>
    <select class="domain-select" id="domainPicker">
      <option value="strength">Strength</option>
      <option value="cardio">Cardio</option>
      <option value="steps">Steps</option>
      <option value="nutrition">Nutrition</option>
      <option value="sleep">Sleep</option>
      <option value="weight">Weight</option>
    </select>
    <div id="domainContent"></div>
  `;

  const picker = document.getElementById("domainPicker");
  picker.addEventListener("change", () => loadDomain(picker.value, year, month));
  loadDomain("strength", year, month);
}

async function loadDomain(domain, year, month) {
  const data = await api(`/${domain}/${year}/${String(month).padStart(2, "0")}`);
  const container = document.getElementById("domainContent");
  const entries = data.entries || [];

  if (!entries.length) {
    container.innerHTML = `<div class="card">No data for this month.</div>`;
    return;
  }

  const keys = Object.keys(entries[0]).filter((k) => k !== "date" && k !== "notes");
  const tableRows = entries.map((e) => `<tr>${["date", ...keys, "notes"].map((k) => `<td>${e[k] ?? ""}</td>`).join("")}</tr>`).join("");

  container.innerHTML = `
    <div class="chart-container">
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem;">
        <thead><tr>${["date", ...keys, "notes"].map((k) => `<th style="text-align:left;padding:0.5rem;border-bottom:1px solid #333;color:#888;">${k}</th>`).join("")}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

// --- Router ---
async function render() {
  destroyCharts();
  switch (currentView) {
    case "overview": return renderOverview();
    case "trends": return renderTrends();
    case "adherence": return renderAdherence();
    case "nutrition": return renderNutrition();
    case "domain": return renderDomain();
  }
}

render();
```

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/
git commit -m "feat: add Elysia dashboard with Chart.js frontend"
```

---

### Task 12: Agent Configuration

**Files:**
- Create: `CLAUDE.md`
- Create: `memory/MEMORY.md`
- Create: `memory/USER.md`
- Create: `.claude/skills/heartbeat/SKILL.md`

- [ ] **Step 1: Create CLAUDE.md**

```markdown
# Discord Fitness Agent

You are a fitness coach and accountability partner. You interact through Discord to help track and improve fitness across six domains: strength training, cardio, steps, nutrition, sleep, and weight.

## Your Role

- Help log workouts, meals, and other fitness data by writing directly to CSV files in `data/`
- Review logged data and provide coaching based on progress vs targets
- Reference `targets.yaml` for current goals
- Celebrate milestones and flag concerns (missed targets, declining trends)

## Data Access

- **CSV files**: Read from `data/{domain}/YYYY-MM.csv` for any domain
- **Targets**: Read `targets.yaml` for current goals
- **Memory**: Read/write `memory/` files for persistent context

## CSV Schemas

When logging, write to the correct monthly CSV file. Create the file with headers if it doesn't exist.

- **Strength**: `date,exercise,sets,reps,weight,unit,notes`
- **Cardio**: `date,type,duration_min,distance,distance_unit,avg_hr,notes`
- **Steps**: `date,steps,notes`
- **Nutrition**: `date,meal,calories,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,sugar_g,cholesterol_mg,notes`
- **Sleep**: `date,bed_time,wake_time,duration_hr,quality,notes`
- **Weight**: `date,weight,unit,notes`

## Memory

- Read `memory/MEMORY.md` for long-term context (training phase, PRs, preferences)
- Read `memory/USER.md` for user profile (goals, injuries, schedule)
- Read `memory/daily/YYYY-MM-DD.md` for recent daily observations
- Write observations and patterns to daily memory logs
- Update MEMORY.md when you learn something important about the user's training

## Coaching Style

- Be direct and encouraging
- Flag missed targets without being preachy
- Suggest adjustments based on trends
- Celebrate PRs and consistency
- Ask about rest days, not demand workouts
```

- [ ] **Step 2: Create memory files**

```markdown
<!-- memory/MEMORY.md -->
# Long-Term Memory

This file stores persistent knowledge across sessions. The agent updates this as it learns.

## Training Phase

(To be filled by agent)

## Personal Records

(To be filled by agent)

## Preferences

(To be filled by agent)
```

```markdown
<!-- memory/USER.md -->
# User Profile

(To be filled during initial conversations)

## Goals

## Injuries / Limitations

## Schedule

## Dietary Needs
```

- [ ] **Step 3: Create heartbeat skill**

```markdown
<!-- .claude/skills/heartbeat/SKILL.md -->
---
name: heartbeat
description: Periodic fitness check-in and observation logging
---

# Heartbeat Checklist

1. Read today's data from `data/` across all domains
2. Read current targets from `targets.yaml`
3. Compare logged data against targets:
   - If meals logged but protein under target, nudge about it
   - If calories significantly over/under, mention it
   - If no workout logged by evening, ask if it's a rest day
   - If steps are low, encourage movement
4. Check `memory/daily/` for recent patterns (last 3 days)
5. Append any observations to `memory/daily/YYYY-MM-DD.md`
6. If nothing needs attention, reply HEARTBEAT_OK
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md memory/MEMORY.md memory/USER.md .claude/skills/heartbeat/SKILL.md
git commit -m "feat: add agent config, memory files, and heartbeat skill"
```

---

### Task 13: Infrastructure — start.sh & README

**Files:**
- Create: `start.sh`
- Create: `README.md`

- [ ] **Step 1: Create start.sh**

```bash
#!/bin/bash
# Start the Claude Code Discord agent in a tmux session
# The MCP server and dashboard run independently.

SESSION="fitness-agent"

# Kill existing session if present
tmux kill-session -t "$SESSION" 2>/dev/null

# Create new session
tmux new-session -d -s "$SESSION" -n "agent"

# Start Claude Code connected to Discord
tmux send-keys -t "$SESSION:agent" "claude --channel discord" Enter

echo "Started fitness agent in tmux session '$SESSION'"
echo "Attach with: tmux attach -t $SESSION"
echo ""
echo "Once attached, start the heartbeat:"
echo "  /loop 2h /heartbeat"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x start.sh
```

- [ ] **Step 3: Create README.md**

```markdown
# Discord Fitness

A personal fitness companion powered by Claude Code. Tracks workouts, nutrition, sleep, weight, and steps via CSV files. Interact through Discord or Claude web, view analytics on a web dashboard.

## Architecture

- **Discord Agent** — Claude Code running in a Discord channel. Logs data, provides coaching, maintains memory.
- **MCP Server** — Data CRUD tools for use via Claude web (claude.ai). No coaching logic.
- **Dashboard** — Elysia web app with Chart.js charts. Overview, trends, adherence, macro breakdown.
- **CSV Files** — Source of truth. One file per month per domain in `data/`.

## Prerequisites

- [Bun](https://bun.sh) runtime
- [Claude Code](https://claude.ai/code) CLI
- Discord bot token (with Message Content intent)
- [Cloudflare](https://dash.cloudflare.com) account + `cloudflared` CLI (for remote dashboard access)

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Configure the MCP server

Add to your Claude Code MCP settings (`~/.claude/claude_desktop_config.json` or Claude web settings):

```json
{
  "mcpServers": {
    "discord-fitness": {
      "command": "bun",
      "args": ["run", "/path/to/discord-fitness/src/mcp-server/run.ts"]
    }
  }
}
```

### 3. Set up Discord channel

1. Create a Discord Application at https://discord.com/developers/applications
2. Create a Bot, enable **Message Content Intent**
3. Generate an OAuth2 URL with scopes: `bot`, `applications.commands`
4. Grant permissions: View Channels, Send Messages, Read Message History, Embed Links, Attach Files
5. Invite the bot to your server
6. Configure Claude Code channels:

```bash
claude channel add discord --token YOUR_BOT_TOKEN
```

### 4. Set up Cloudflare Tunnel (for remote dashboard access)

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create fitness-dashboard

# Configure tunnel (create ~/.cloudflared/config.yml)
```

```yaml
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: fitness.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
# Route DNS
cloudflared tunnel route dns fitness-dashboard fitness.yourdomain.com

# Run tunnel
cloudflared tunnel run fitness-dashboard
```

Then configure a Zero Trust access policy at https://one.dash.cloudflare.com:
- Application > Add Application > Self-hosted
- Set the domain to `fitness.yourdomain.com`
- Add a policy: Allow — emails matching yours

## Running

### Start the dashboard

```bash
bun run dashboard
```

### Start the MCP server (standalone, for testing)

```bash
bun run mcp
```

### Start the Discord agent

```bash
./start.sh
```

Then attach to the tmux session and kick off the heartbeat:

```bash
tmux attach -t fitness-agent
# Inside the Claude Code session:
/loop 2h /heartbeat
```

### Run tests

```bash
bun test
```

## Data

Six domains, each stored as monthly CSVs in `data/`:

| Domain | File | Key Fields |
|--------|------|------------|
| Strength | `data/strength/YYYY-MM.csv` | exercise, sets, reps, weight, unit |
| Cardio | `data/cardio/YYYY-MM.csv` | type, duration_min, distance, avg_hr |
| Steps | `data/steps/YYYY-MM.csv` | steps |
| Nutrition | `data/nutrition/YYYY-MM.csv` | meal, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, cholesterol_mg |
| Sleep | `data/sleep/YYYY-MM.csv` | bed_time, wake_time, duration_hr, quality |
| Weight | `data/weight/YYYY-MM.csv` | weight, unit |

## Targets

Edit `targets.yaml` directly or use the MCP `update_targets` tool:

```yaml
nutrition:
  calories: 2500
  protein_g: 180
  carbs_g: 280
  fat_g: 80
steps:
  daily: 10000
sleep:
  hours: 7.5
weight:
  target: 180
  unit: lb
```
```

- [ ] **Step 4: Commit**

```bash
git add start.sh README.md
git commit -m "feat: add start script and README with setup instructions"
```

---

### Task 14: Final — Run All Tests & Verify

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: All tests pass across csv-store, targets, MCP tools, and dashboard routes.

- [ ] **Step 2: Verify MCP server starts**

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | bun run mcp
```

Expected: JSON response with server capabilities.

- [ ] **Step 3: Verify dashboard starts**

```bash
timeout 3 bun run dashboard || true
```

Expected: "Dashboard running at http://localhost:3000" printed before timeout.

- [ ] **Step 4: Final commit if any fixes needed**

```bash
bun test && echo "All tests pass"
```
