# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **CRITICAL — shadcn/ui MCP Requirement:** Before using ANY shadcn/ui component, you MUST call the shadcn MCP tools to look up the component API, get the correct install command, and view usage examples. Do NOT hardcode shadcn component usage from memory. The MCP tools are:
> - `mcp__shadcn__get_project_registries` — get available registries for the project
> - `mcp__shadcn__list_items_in_registries` — list available components
> - `mcp__shadcn__view_items_in_registries` — view component source/API
> - `mcp__shadcn__get_item_examples_from_registries` — get usage examples
> - `mcp__shadcn__get_add_command_for_items` — get the install command (e.g. `npx shadcn@latest add card`)
>
> Always query MCP first, then write code based on what you find.

**Goal:** Replace the vanilla JS dashboard with a React + Vite + shadcn/ui + Tailwind frontend in a separate `frontend/` directory, adding stretching domain and strength categories to the backend.

**Architecture:** Separate frontend package (`frontend/`) with Vite dev server on port 5173 proxying `/api` to Elysia on port 3000. Backend gets CORS headers, stretching domain, and category field on strength entries.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, React Router

**Spec:** `docs/superpowers/specs/2026-03-29-frontend-redesign-design.md`

---

## Task 1: Add stretching domain and strength category to csv-store

**Files:**
- Modify: `src/csv-store/types.ts`
- Modify: `src/csv-store/reader.ts`
- Modify: `src/csv-store/index.ts`
- Test: `src/csv-store/writer.test.ts`

- [ ] **Step 1: Update types.ts — add stretching domain and category field**

```ts
// src/csv-store/types.ts

export const DOMAINS = ["strength", "cardio", "steps", "nutrition", "sleep", "weight", "stretching"] as const;
export type Domain = (typeof DOMAINS)[number];

export interface StrengthEntry {
  date: string;
  exercise: string;
  category: string;
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

export interface StretchingEntry {
  date: string;
  stretch: string;
  duration_min: number;
  notes: string;
}

export type DomainEntry = {
  strength: StrengthEntry;
  cardio: CardioEntry;
  steps: StepsEntry;
  nutrition: NutritionEntry;
  sleep: SleepEntry;
  weight: WeightEntry;
  stretching: StretchingEntry;
};

export const CSV_HEADERS: Record<Domain, string> = {
  strength: "date,exercise,category,sets,reps,weight,notes",
  cardio: "date,type,duration,notes",
  steps: "date,steps,notes",
  nutrition: "date,meal,calories,protein,carbs,fat,notes",
  sleep: "date,hours,quality,notes",
  weight: "date,weight,notes",
  stretching: "date,stretch,duration_min,notes",
};

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}
```

- [ ] **Step 2: Update reader.ts — add stretching numeric columns**

In `src/csv-store/reader.ts`, add `stretching` to the `getNumericColumns` map:

```ts
function getNumericColumns(domain: Domain): Set<string> {
  const map: Record<Domain, string[]> = {
    strength: ["sets", "reps", "weight"],
    cardio: ["duration"],
    steps: ["steps"],
    nutrition: ["calories", "protein", "carbs", "fat"],
    sleep: ["hours"],
    weight: ["weight"],
    stretching: ["duration_min"],
  };
  return new Set(map[domain]);
}
```

- [ ] **Step 3: Update index.ts — export StretchingEntry**

In `src/csv-store/index.ts`, add `StretchingEntry` to the type exports:

```ts
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
  type StretchingEntry,
} from "./types";
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

Run: `bun test`
Expected: All existing tests pass. The strength CSV header change may cause test failures if tests check exact CSV output — fix any failing tests by updating expected values to include the `category` column.

- [ ] **Step 5: Commit**

```bash
git add src/csv-store/types.ts src/csv-store/reader.ts src/csv-store/index.ts
git commit -m "feat: add stretching domain and category field to strength entries"
```

---

## Task 2: Add MCP tools for stretching and strength category

**Files:**
- Modify: `src/mcp-server/index.ts`
- Modify: `src/mcp-server/tools/logging.ts`

- [ ] **Step 1: Add log_stretching to logging.ts**

In `src/mcp-server/tools/logging.ts`, add to `TOOL_TO_DOMAIN`:

```ts
const TOOL_TO_DOMAIN: Record<string, Domain> = {
  log_strength: "strength",
  log_cardio: "cardio",
  log_steps: "steps",
  log_nutrition: "nutrition",
  log_sleep: "sleep",
  log_weight: "weight",
  log_stretching: "stretching",
};
```

- [ ] **Step 2: Add log_stretching tool definition and update log_strength in index.ts**

In `src/mcp-server/index.ts`, add `category` to the `log_strength` tool schema (insert after `exercise`):

```ts
category: { type: "string", description: "Push, Pull, or Legs", enum: ["push", "pull", "legs"] },
```

Add the new `log_stretching` tool to the tools array (insert after `log_weight`):

```ts
{
  name: "log_stretching",
  description: "Log a stretching session. Use when the user mentions stretching, flexibility, mobility, or yoga.",
  inputSchema: {
    type: "object" as const,
    properties: {
      date: { type: "string", description: "YYYY-MM-DD (defaults to today)" },
      stretch: { type: "string", description: "Stretch name, e.g. hamstring stretch" },
      duration_min: { type: "number", description: "Duration in minutes" },
      notes: { type: "string", default: "" },
    },
    required: ["stretch", "duration_min"],
  },
},
```

Also update the `query_domain` and `get_summary` tool enums to include `"stretching"`:

```ts
domain: { type: "string", enum: ["strength", "cardio", "steps", "nutrition", "sleep", "weight", "stretching"] },
```

And update the `log_batch` tool domain enum similarly.

- [ ] **Step 3: Run tests**

Run: `bun test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/mcp-server/index.ts src/mcp-server/tools/logging.ts
git commit -m "feat: add log_stretching MCP tool and category param to log_strength"
```

---

## Task 3: Add CORS to Elysia dashboard

**Files:**
- Modify: `src/dashboard/index.ts`

- [ ] **Step 1: Add CORS headers for dev mode**

Replace `src/dashboard/index.ts` with:

```ts
import { Elysia } from "elysia";
import { apiRoutes } from "./routes/api";
import { resolve, join } from "path";

export function createApp(dataDir: string = "data", targetsPath: string = "targets.yaml") {
  return new Elysia()
    .onBeforeHandle(({ request, set }) => {
      const origin = request.headers.get("origin");
      if (origin) {
        set.headers["Access-Control-Allow-Origin"] = origin;
        set.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
        set.headers["Access-Control-Allow-Headers"] = "Content-Type";
      }
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204 });
      }
    })
    .use(apiRoutes(dataDir, targetsPath));
}
```

This removes the static file serving (frontend is now separate) and adds CORS for any origin in dev mode.

- [ ] **Step 2: Run tests**

Run: `bun test`
Expected: PASS. If there are dashboard-specific tests that check static file serving, they should be removed or updated.

- [ ] **Step 3: Commit**

```bash
git add src/dashboard/index.ts
git commit -m "feat: add CORS headers and remove static file serving from Elysia"
```

---

## Task 4: Scaffold Vite + React + TypeScript frontend

**Files:**
- Create: `frontend/` directory with Vite scaffold
- Create: `frontend/vite.config.ts`

- [ ] **Step 1: Create Vite React-TS project**

Run from project root:

```bash
cd /home/factorylevel/Projects/fitness/discord-fitness
bunx create-vite frontend --template react-ts
cd frontend
bun install
```

- [ ] **Step 2: Configure Vite proxy**

Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Verify Vite starts**

```bash
cd frontend && bunx vite --host 2>&1 | head -5
```

Expected: Vite dev server starts on port 5173. Kill it after confirming.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold Vite + React + TypeScript frontend"
```

---

## Task 5: Set up Tailwind CSS v4

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Install Tailwind CSS v4 + Vite plugin**

```bash
cd frontend
bun add tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add Tailwind Vite plugin**

In `frontend/vite.config.ts`, add the Tailwind plugin:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 3: Set up index.css with Tailwind import and dark theme**

Replace `frontend/src/index.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Verify Tailwind works**

Add a Tailwind class to `frontend/src/App.tsx` temporarily:

```tsx
function App() {
  return <div className="bg-zinc-950 text-white min-h-screen p-8">Tailwind works</div>;
}
export default App;
```

Run: `cd frontend && bunx vite --host 2>&1 | head -5`
Open http://localhost:5173 — should see white text on near-black background.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: set up Tailwind CSS v4 with dark theme"
```

---

## Task 6: Set up shadcn/ui and install components

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/components/ui/` (generated by shadcn)
- Modify: `frontend/src/index.css`

> **IMPORTANT:** Use shadcn MCP tools for every step here. Do NOT guess component APIs or install commands.

- [ ] **Step 1: Query shadcn MCP for project setup**

Call `mcp__shadcn__get_project_registries` to find available registries.
Call `mcp__shadcn__get_add_command_for_items` with items `["card", "progress", "table", "tabs", "badge"]` to get exact install commands.

- [ ] **Step 2: Initialize shadcn/ui**

```bash
cd frontend
bunx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Zinc
- CSS variables: Yes

This creates `components.json` and updates `index.css` with CSS variables.

- [ ] **Step 3: Install required shadcn components**

Use the exact commands returned by the MCP tool in Step 1. Expected to be something like:

```bash
cd frontend
bunx shadcn@latest add card progress table tabs badge
```

- [ ] **Step 4: Verify components installed**

```bash
ls frontend/src/components/ui/
```

Expected: `card.tsx`, `progress.tsx`, `table.tsx`, `tabs.tsx`, `badge.tsx` (plus any dependency components shadcn auto-installs).

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: set up shadcn/ui with card, progress, table, tabs, badge components"
```

---

## Task 7: React Router + Sidebar layout

**Files:**
- Modify: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/pages/Nutrition.tsx` (placeholder)
- Create: `frontend/src/pages/Strength.tsx` (placeholder)
- Create: `frontend/src/pages/Steps.tsx` (placeholder)
- Create: `frontend/src/pages/Weight.tsx` (placeholder)
- Create: `frontend/src/pages/Stretching.tsx` (placeholder)
- Create: `frontend/src/pages/Cardio.tsx` (placeholder)

- [ ] **Step 1: Install React Router**

```bash
cd frontend
bun add react-router
```

- [ ] **Step 2: Create placeholder pages**

Create each page file in `frontend/src/pages/`. Each placeholder follows this pattern:

`frontend/src/pages/Nutrition.tsx`:
```tsx
export default function Nutrition() {
  return <div><h1 className="text-2xl font-bold">Nutrition</h1></div>;
}
```

`frontend/src/pages/Strength.tsx`:
```tsx
export default function Strength() {
  return <div><h1 className="text-2xl font-bold">Strength</h1></div>;
}
```

`frontend/src/pages/Steps.tsx`:
```tsx
export default function Steps() {
  return <div><h1 className="text-2xl font-bold">Steps</h1></div>;
}
```

`frontend/src/pages/Weight.tsx`:
```tsx
export default function Weight() {
  return <div><h1 className="text-2xl font-bold">Weight</h1></div>;
}
```

`frontend/src/pages/Stretching.tsx`:
```tsx
export default function Stretching() {
  return <div><h1 className="text-2xl font-bold">Stretching</h1></div>;
}
```

`frontend/src/pages/Cardio.tsx`:
```tsx
export default function Cardio() {
  return <div><h1 className="text-2xl font-bold">Cardio</h1></div>;
}
```

- [ ] **Step 3: Create Sidebar component**

`frontend/src/components/Sidebar.tsx`:
```tsx
import { NavLink } from "react-router";
import { UtensilsCrossed, Dumbbell, Footprints, Scale, StretchHorizontal, HeartPulse } from "lucide-react";

const links = [
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/strength", label: "Strength", icon: Dumbbell },
  { to: "/steps", label: "Steps", icon: Footprints },
  { to: "/weight", label: "Weight", icon: Scale },
  { to: "/stretching", label: "Stretching", icon: StretchHorizontal },
  { to: "/cardio", label: "Cardio", icon: HeartPulse },
];

export default function Sidebar() {
  return (
    <aside className="w-52 min-h-screen bg-zinc-950 border-r border-zinc-800 p-4 flex flex-col gap-1">
      <div className="text-sm font-bold text-zinc-400 mb-4 px-3">Fitness</div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive
                ? "bg-zinc-800 text-white font-medium"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`
          }
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
```

Install lucide-react for icons:

```bash
cd frontend
bun add lucide-react
```

- [ ] **Step 4: Create App layout with sidebar + outlet**

`frontend/src/App.tsx`:
```tsx
import { Outlet } from "react-router";
import Sidebar from "@/components/Sidebar";

export default function App() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Set up router in main.tsx**

`frontend/src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import App from "./App";
import Nutrition from "./pages/Nutrition";
import Strength from "./pages/Strength";
import Steps from "./pages/Steps";
import Weight from "./pages/Weight";
import Stretching from "./pages/Stretching";
import Cardio from "./pages/Cardio";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Navigate to="/nutrition" replace />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="strength" element={<Strength />} />
          <Route path="steps" element={<Steps />} />
          <Route path="weight" element={<Weight />} />
          <Route path="stretching" element={<Stretching />} />
          <Route path="cardio" element={<Cardio />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 6: Clean up scaffold files**

Delete `frontend/src/App.css`, `frontend/src/assets/`, and the default Vite SVG logo. Remove any leftover imports.

- [ ] **Step 7: Verify routing works**

Run: `cd frontend && bunx vite --host 2>&1 | head -5`
Open http://localhost:5173 — should redirect to `/nutrition`, show sidebar with all 6 links, clicking each should switch pages.

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: add React Router with sidebar layout and 6 page shells"
```

---

## Task 8: API client and shared components

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/MetricCard.tsx`
- Create: `frontend/src/components/Heatmap.tsx`
- Create: `frontend/src/components/TrendIndicator.tsx`

> **IMPORTANT:** Before writing MetricCard, call `mcp__shadcn__view_items_in_registries` for `card` and `progress` to see their exact API. Use the actual props/structure from the MCP response.

- [ ] **Step 1: Create typed API client**

`frontend/src/lib/api.ts`:
```ts
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
```

- [ ] **Step 2: Query shadcn MCP for Card and Progress component APIs**

Call `mcp__shadcn__view_items_in_registries` for `card` and `progress`.
Call `mcp__shadcn__get_item_examples_from_registries` for `card` and `progress`.

Read the returned component structure and props before writing MetricCard.

- [ ] **Step 3: Create MetricCard component**

`frontend/src/components/MetricCard.tsx`:

Uses shadcn `Card` and `Progress` components. Write this based on the MCP response from Step 2. Expected structure:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  target?: number;
  targetUnit?: string;
  status?: "on-track" | "over" | "neutral";
  subtitle?: string;
}

export default function MetricCard({ label, value, unit, target, targetUnit, status, subtitle }: MetricCardProps) {
  const numValue = typeof value === "number" ? value : 0;
  const pct = target ? Math.min((numValue / target) * 100, 100) : 0;
  const isOver = status === "over" || (target && numValue > target && status !== "on-track");

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value} {unit && <span className="text-sm font-normal text-zinc-500">{unit}</span>}
        </div>
        {target !== undefined && (
          <>
            <p className="text-xs text-zinc-600 mt-1">
              Target: {target} {targetUnit || unit}
            </p>
            <Progress
              value={pct}
              className="mt-2 h-1"
            />
          </>
        )}
        {subtitle && <p className="text-xs mt-2 text-zinc-500">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
```

**Note:** The exact `Card` and `Progress` import paths and props MUST match what the shadcn MCP returned. Adjust this code accordingly.

- [ ] **Step 4: Create Heatmap component**

`frontend/src/components/Heatmap.tsx`:

```tsx
interface HeatmapProps {
  year: number;
  month: number; // 1-indexed
  data: Record<string, number>; // date string -> value (0 = no data)
  getIntensity?: (value: number) => number; // 0-1 for opacity
}

export default function Heatmap({ year, month, data, getIntensity }: HeatmapProps) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0
  const monthStr = String(month).padStart(2, "0");
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  const cells: { day: number | null; dateStr: string; value: number }[] = [];

  // Padding for first week
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: "", value: 0 });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${monthStr}-${String(d).padStart(2, "0")}`;
    const value = data[dateStr] || 0;
    cells.push({ day: d, dateStr, value });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 max-w-xs">
        {dayLabels.map((label, i) => (
          <div key={i} className="text-[10px] text-zinc-600 text-center">{label}</div>
        ))}
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={i} />;
          }
          const intensity = cell.value > 0
            ? (getIntensity ? getIntensity(cell.value) : 1)
            : 0;
          return (
            <div
              key={i}
              className="aspect-square rounded-sm flex items-center justify-center text-[9px]"
              style={{
                backgroundColor: intensity > 0
                  ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`
                  : "rgb(24, 24, 27)",
              }}
              title={`${cell.dateStr}: ${cell.value || "—"}`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create TrendIndicator component**

`frontend/src/components/TrendIndicator.tsx`:

```tsx
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  direction: "up" | "down" | "flat";
  delta?: number;
  unit?: string;
}

export default function TrendIndicator({ direction, delta, unit = "lbs" }: TrendIndicatorProps) {
  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-green-500 text-sm">
        <ArrowUp className="w-3 h-3" />
        {delta !== undefined && `+${delta} ${unit}`}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 text-sm">
        <ArrowDown className="w-3 h-3" />
        {delta !== undefined && `−${delta} ${unit}`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-500 text-sm">
      <Minus className="w-3 h-3" />
      Same
    </span>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/ frontend/src/components/MetricCard.tsx frontend/src/components/Heatmap.tsx frontend/src/components/TrendIndicator.tsx
git commit -m "feat: add API client and shared components (MetricCard, Heatmap, TrendIndicator)"
```

---

## Task 9: Nutrition page

**Files:**
- Modify: `frontend/src/pages/Nutrition.tsx`

> **IMPORTANT:** Call `mcp__shadcn__view_items_in_registries` for `table` to get the exact Table component API before writing the food log table.

- [ ] **Step 1: Install Recharts**

```bash
cd frontend
bun add recharts
```

- [ ] **Step 2: Query shadcn MCP for Table component API**

Call `mcp__shadcn__view_items_in_registries` for `table`.
Call `mcp__shadcn__get_item_examples_from_registries` for `table`.

- [ ] **Step 3: Implement Nutrition page**

`frontend/src/pages/Nutrition.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type Targets, type NutritionEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d.toISOString().slice(0, 10);
}

export default function Nutrition() {
  const [targets, setTargets] = useState<Targets>({});
  const [monthEntries, setMonthEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.all([api.targets(), api.nutrition(year, month)]).then(([t, n]) => {
      setTargets(t);
      setMonthEntries(n.entries);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = monthEntries.filter((e) => e.date === today);
  const weekStart = getWeekStart(new Date());
  const weekEntries = monthEntries.filter((e) => e.date >= weekStart && e.date <= today);

  const dailyCal = todayEntries.reduce((s, e) => s + e.calories, 0);
  const dailyProtein = todayEntries.reduce((s, e) => s + e.protein, 0);
  const dailyCarbs = todayEntries.reduce((s, e) => s + e.carbs, 0);
  const dailyFat = todayEntries.reduce((s, e) => s + e.fat, 0);

  const weeklyCal = weekEntries.reduce((s, e) => s + e.calories, 0);
  const calTarget = targets.nutrition?.calories || 2400;
  const weeklyTarget = calTarget * 7;

  // Projection: average daily calories this week × 7
  const uniqueDaysThisWeek = new Set(weekEntries.map((e) => e.date)).size || 1;
  const avgDailyCal = weeklyCal / uniqueDaysThisWeek;
  const projectedWeekly = Math.round(avgDailyCal * 7);
  const projectionDelta = projectedWeekly - weeklyTarget;
  const onTrack = projectionDelta <= 0;

  const daysRemaining = 7 - uniqueDaysThisWeek;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nutrition</h1>

      {/* Daily Macro Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Calories" value={dailyCal} unit="kcal" target={calTarget} />
        <MetricCard label="Protein" value={dailyProtein} unit="g" target={targets.nutrition?.protein} />
        <MetricCard label="Carbs" value={dailyCarbs} unit="g" target={targets.nutrition?.carbs} />
        <MetricCard label="Fat" value={dailyFat} unit="g" target={targets.nutrition?.fat} />
      </div>

      {/* Weekly Tracking */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Weekly Calories"
          value={weeklyCal}
          unit="kcal"
          target={weeklyTarget}
          subtitle={`${daysRemaining} days remaining · ${weeklyTarget - weeklyCal} kcal left`}
        />
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Weekly Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ~{projectedWeekly.toLocaleString()}{" "}
              <span className="text-sm font-normal text-zinc-500">kcal</span>
            </div>
            <p className={`text-xs mt-2 ${onTrack ? "text-green-500" : "text-red-500"}`}>
              {onTrack
                ? "✓ On track"
                : `Going over by ~${Math.abs(projectionDelta).toLocaleString()} kcal`}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              Based on {Math.round(avgDailyCal).toLocaleString()} kcal/day average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Food Log */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Today's Food Log</CardTitle>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-zinc-500">No meals logged today.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Meal</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                  <TableHead className="text-right">Protein</TableHead>
                  <TableHead className="text-right">Carbs</TableHead>
                  <TableHead className="text-right">Fat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayEntries.map((e, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    <TableCell>{e.meal}</TableCell>
                    <TableCell className="text-right">{e.calories}</TableCell>
                    <TableCell className="text-right">{e.protein}g</TableCell>
                    <TableCell className="text-right">{e.carbs}g</TableCell>
                    <TableCell className="text-right">{e.fat}g</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="border-zinc-800 bg-zinc-900/50">
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="text-right font-medium">{dailyCal}</TableCell>
                  <TableCell className="text-right font-medium">{dailyProtein}g</TableCell>
                  <TableCell className="text-right font-medium">{dailyCarbs}g</TableCell>
                  <TableCell className="text-right font-medium">{dailyFat}g</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Note:** Adjust Table imports based on shadcn MCP response from Step 2.

- [ ] **Step 4: Verify Nutrition page**

Start the Elysia API (`bun run dashboard` from project root) and the Vite dev server (`cd frontend && bunx vite`).
Open http://localhost:5173/nutrition — should display macro cards, weekly tracking, and food log.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: implement Nutrition page with daily macros, weekly tracking, food log"
```

---

## Task 10: Strength page

**Files:**
- Modify: `frontend/src/pages/Strength.tsx`

> **IMPORTANT:** Call `mcp__shadcn__view_items_in_registries` for `tabs` and `table` to get exact APIs.

- [ ] **Step 1: Query shadcn MCP for Tabs component**

Call `mcp__shadcn__view_items_in_registries` for `tabs`.
Call `mcp__shadcn__get_item_examples_from_registries` for `tabs`.

- [ ] **Step 2: Implement Strength page — main view**

`frontend/src/pages/Strength.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type StrengthEntry } from "@/lib/api";
import Heatmap from "@/components/Heatmap";
import TrendIndicator from "@/components/TrendIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface ExerciseStats {
  exercise: string;
  category: string;
  lastWeight: number;
  lastReps: number;
  bestWeight: number;
  bestReps: number;
  trend: "up" | "down" | "flat";
  delta: number;
  sessions: { date: string; weight: number; reps: number; sets: number }[];
}

function computeStats(entries: StrengthEntry[]): ExerciseStats[] {
  const byExercise = new Map<string, StrengthEntry[]>();
  for (const e of entries) {
    const key = e.exercise.toLowerCase();
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(e);
  }

  const stats: ExerciseStats[] = [];
  for (const [, exEntries] of byExercise) {
    const sorted = [...exEntries].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1];
    const best = sorted.reduce((b, e) => (e.weight > b.weight ? e : b), sorted[0]);

    // Find previous session (different date from last)
    const prevDate = [...new Set(sorted.map((e) => e.date))].slice(-2);
    let trend: "up" | "down" | "flat" = "flat";
    let delta = 0;
    if (prevDate.length >= 2) {
      const prevEntries = sorted.filter((e) => e.date === prevDate[0]);
      const prevMax = Math.max(...prevEntries.map((e) => e.weight));
      delta = last.weight - prevMax;
      trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    }

    stats.push({
      exercise: last.exercise,
      category: last.category || "",
      lastWeight: last.weight,
      lastReps: last.reps,
      bestWeight: best.weight,
      bestReps: best.reps,
      trend,
      delta: Math.abs(delta),
      sessions: sorted.map((e) => ({ date: e.date, weight: e.weight, reps: e.reps, sets: e.sets })),
    });
  }
  return stats;
}

export default function Strength() {
  const [entries, setEntries] = useState<StrengthEntry[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; push: number; pull: number; legs: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [view, setView] = useState<"current" | "summary">("current");

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    // Fetch current month
    api.strength(year, month).then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });

    // Fetch last 6 months for summary
    const monthPromises: Promise<{ month: string; entries: StrengthEntry[] }>[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, now.getMonth() - i, 1);
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const y = d.getFullYear();
      monthPromises.push(
        api.strength(y, m).then((data) => ({ month: `${y}-${m}`, entries: data.entries }))
      );
    }
    Promise.all(monthPromises).then((months) => {
      setMonthlyData(
        months.map((m) => {
          const push = m.entries.filter((e) => e.category === "push").reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
          const pull = m.entries.filter((e) => e.category === "pull").reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
          const legs = m.entries.filter((e) => e.category === "legs").reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
          return { month: m.month, push, pull, legs };
        })
      );
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const now = new Date();
  const stats = computeStats(entries);

  // Heatmap data: volume per day
  const heatmapData: Record<string, number> = {};
  for (const e of entries) {
    const vol = e.sets * e.reps * e.weight;
    heatmapData[e.date] = (heatmapData[e.date] || 0) + vol;
  }
  const maxVol = Math.max(...Object.values(heatmapData), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Strength</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("current")}
            className={`px-3 py-1 rounded-md text-sm ${view === "current" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Current Month
          </button>
          <button
            onClick={() => setView("summary")}
            className={`px-3 py-1 rounded-md text-sm ${view === "summary" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Monthly Summary
          </button>
        </div>
      </div>

      {view === "current" ? (
        <>
          {/* Heatmap */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">
                Workout Heatmap — {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Heatmap
                year={now.getFullYear()}
                month={now.getMonth() + 1}
                data={heatmapData}
                getIntensity={(v) => v / maxVol}
              />
            </CardContent>
          </Card>

          {/* Exercise Table with PPL Filter */}
          <Tabs defaultValue="all">
            <TabsList className="bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="push">Push</TabsTrigger>
              <TabsTrigger value="pull">Pull</TabsTrigger>
              <TabsTrigger value="legs">Legs</TabsTrigger>
            </TabsList>

            {["all", "push", "pull", "legs"].map((cat) => (
              <TabsContent key={cat} value={cat}>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800">
                          <TableHead>Exercise</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Last</TableHead>
                          <TableHead>Best</TableHead>
                          <TableHead>Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats
                          .filter((s) => cat === "all" || s.category === cat)
                          .map((s) => (
                            <>
                              <TableRow
                                key={s.exercise}
                                className="border-zinc-800 cursor-pointer hover:bg-zinc-800/50"
                                onClick={() =>
                                  setExpandedExercise(expandedExercise === s.exercise ? null : s.exercise)
                                }
                              >
                                <TableCell className="font-medium">{s.exercise}</TableCell>
                                <TableCell className="text-zinc-500 capitalize">{s.category}</TableCell>
                                <TableCell>{s.lastWeight}×{s.lastReps}</TableCell>
                                <TableCell>{s.bestWeight}×{s.bestReps}</TableCell>
                                <TableCell>
                                  <TrendIndicator direction={s.trend} delta={s.delta} />
                                </TableCell>
                              </TableRow>
                              {expandedExercise === s.exercise && (
                                <TableRow key={`${s.exercise}-detail`} className="border-zinc-800">
                                  <TableCell colSpan={5} className="bg-zinc-950 p-4">
                                    <div className="text-xs text-zinc-500 mb-2">Session History</div>
                                    <div className="flex gap-4 text-sm">
                                      {s.sessions.map((sess, i) => (
                                        <div key={i} className="text-zinc-400">
                                          <div className="text-zinc-600">{sess.date}</div>
                                          {sess.weight}×{sess.reps} ({sess.sets}s)
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      ) : (
        /* Monthly Summary Subview */
        <div className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">Volume by Category (6 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Legend />
                  <Bar dataKey="push" fill="#22c55e" name="Push" />
                  <Bar dataKey="pull" fill="#3b82f6" name="Pull" />
                  <Bar dataKey="legs" fill="#f59e0b" name="Legs" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

**Note:** Adjust Tabs and Table imports based on shadcn MCP response.

- [ ] **Step 3: Verify Strength page**

Open http://localhost:5173/strength — should show heatmap, PPL-filterable exercise table, and monthly summary toggle.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Strength.tsx
git commit -m "feat: implement Strength page with heatmap, PPL table, monthly summary"
```

---

## Task 11: Steps page

**Files:**
- Modify: `frontend/src/pages/Steps.tsx`

- [ ] **Step 1: Implement Steps page**

`frontend/src/pages/Steps.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type Targets, type StepsEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export default function Steps() {
  const [targets, setTargets] = useState<Targets>({});
  const [entries, setEntries] = useState<StepsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.all([api.targets(), api.steps(year, month)]).then(([t, s]) => {
      setTargets(t);
      setEntries(s.entries);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const dailyTarget = targets.steps?.daily || 10000;
  const weekStart = getWeekStart(new Date());
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);
  const weeklySteps = weekEntries.reduce((s, e) => s + e.steps, 0);
  const weeklyTarget = dailyTarget * 7;
  const weekDaysElapsed = new Set(weekEntries.map((e) => e.date)).size || 1;
  const weekDaysRemaining = 7 - weekDaysElapsed;

  const monthlySteps = entries.reduce((s, e) => s + e.steps, 0);
  const monthlyTarget = dailyTarget * daysInMonth;
  const monthDaysPassed = now.getDate();
  const monthDaysRemaining = daysInMonth - monthDaysPassed;

  const weekOnTrack = (weeklySteps / weekDaysElapsed) * 7 >= weeklyTarget;
  const monthOnTrack = (monthlySteps / monthDaysPassed) * daysInMonth >= monthlyTarget;

  // Bar chart data
  const stepsByDay: Record<string, number> = {};
  for (const e of entries) {
    stepsByDay[e.date] = (stepsByDay[e.date] || 0) + e.steps;
  }
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { date: String(day), steps: stepsByDay[dateStr] || 0 };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Steps</h1>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          label="Weekly Steps"
          value={weeklySteps.toLocaleString()}
          target={weeklyTarget}
          subtitle={`${weekDaysRemaining} days remaining · ${weekOnTrack ? "✓ On track" : "Behind pace"}`}
        />
        <MetricCard
          label="Monthly Steps"
          value={monthlySteps.toLocaleString()}
          target={monthlyTarget}
          subtitle={`${monthDaysRemaining} days remaining · ${monthOnTrack ? "✓ On track" : "Behind pace"}`}
        />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Daily Steps — {now.toLocaleString("default", { month: "long", year: "numeric" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <ReferenceLine y={dailyTarget} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Target", fill: "#ef4444", fontSize: 11 }} />
              <Bar dataKey="steps" fill="#f59e0b" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify Steps page**

Open http://localhost:5173/steps — should show weekly/monthly progress cards and bar chart with target line.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Steps.tsx
git commit -m "feat: implement Steps page with weekly/monthly progress and bar chart"
```

---

## Task 12: Weight page

**Files:**
- Modify: `frontend/src/pages/Weight.tsx`

- [ ] **Step 1: Implement Weight page with month/year toggle**

`frontend/src/pages/Weight.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type Targets, type WeightEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

function movingAverage(data: { date: string; weight: number }[], window: number): { date: string; avg: number }[] {
  return data.map((_, i, arr) => {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);
    const avg = slice.reduce((s, d) => s + d.weight, 0) / slice.length;
    return { date: arr[i].date, avg: Math.round(avg * 10) / 10 };
  });
}

export default function Weight() {
  const [targets, setTargets] = useState<Targets>({});
  const [monthEntries, setMonthEntries] = useState<WeightEntry[]>([]);
  const [yearData, setYearData] = useState<{ month: string; avg: number }[]>([]);
  const [range, setRange] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    Promise.all([api.targets(), api.weight(year, month)]).then(([t, w]) => {
      setTargets(t);
      setMonthEntries(w.entries);
      setLoading(false);
    });

    // Fetch all 12 months for year view
    const monthPromises = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, "0");
      return api.weight(year, m).then((data) => ({
        month: new Date(year, i).toLocaleString("default", { month: "short" }),
        entries: data.entries,
      }));
    });
    Promise.all(monthPromises).then((months) => {
      setYearData(
        months
          .filter((m) => m.entries.length > 0)
          .map((m) => ({
            month: m.month,
            avg: Math.round((m.entries.reduce((s, e) => s + e.weight, 0) / m.entries.length) * 10) / 10,
          }))
      );
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const targetWeight = targets.weight?.target;
  const current = monthEntries.length > 0 ? monthEntries[monthEntries.length - 1].weight : null;
  const remaining = current && targetWeight ? Math.round((current - targetWeight) * 10) / 10 : null;

  // Rate of loss: compare first and last weigh-in this month
  const first = monthEntries.length > 0 ? monthEntries[0] : null;
  const last = monthEntries.length > 0 ? monthEntries[monthEntries.length - 1] : null;
  let ratePerWeek: number | null = null;
  if (first && last && first.date !== last.date) {
    const daysBetween = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;
    if (daysBetween > 0) {
      ratePerWeek = Math.round(((first.weight - last.weight) / daysBetween) * 7 * 10) / 10;
    }
  }

  // Month chart data
  const monthChartData = monthEntries.map((e) => ({ date: e.date.slice(5), weight: e.weight }));
  const ma = movingAverage(monthEntries, 7);
  const monthChartWithMA = monthChartData.map((d, i) => ({
    ...d,
    trend: ma[i]?.avg,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Weight</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setRange("month")}
            className={`px-3 py-1 rounded-md text-sm ${range === "month" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            This Month
          </button>
          <button
            onClick={() => setRange("year")}
            className={`px-3 py-1 rounded-md text-sm ${range === "year" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            This Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Current Weight" value={current ?? "—"} unit="lbs" />
        <MetricCard label="Target Weight" value={targetWeight ?? "—"} unit="lbs" subtitle={remaining ? `${remaining} lbs to go` : undefined} />
        <MetricCard label="Rate of Loss" value={ratePerWeek !== null ? ratePerWeek : "—"} unit="lbs/week" />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">
            {range === "month" ? "Daily Weigh-ins" : "Monthly Averages"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {range === "month" ? (
              <LineChart data={monthChartWithMA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                {targetWeight && <ReferenceLine y={targetWeight} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "Target", fill: "#22c55e", fontSize: 11 }} />}
                <Line type="monotone" dataKey="weight" stroke="#3b82f6" dot={{ r: 3, fill: "#3b82f6" }} strokeWidth={1} />
                <Line type="monotone" dataKey="trend" stroke="#f59e0b" dot={false} strokeWidth={2} name="7-day avg" />
              </LineChart>
            ) : (
              <LineChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 12 }} />
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                {targetWeight && <ReferenceLine y={targetWeight} stroke="#22c55e" strokeDasharray="5 5" label={{ value: "Target", fill: "#22c55e", fontSize: 11 }} />}
                <Line type="monotone" dataKey="avg" stroke="#3b82f6" dot={{ r: 4, fill: "#3b82f6" }} strokeWidth={2} name="Avg Weight" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify Weight page**

Open http://localhost:5173/weight — should show summary cards, month/year toggle, and chart with trend line and target.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Weight.tsx
git commit -m "feat: implement Weight page with month/year toggle and trend line"
```

---

## Task 13: Stretching page

**Files:**
- Modify: `frontend/src/pages/Stretching.tsx`

- [ ] **Step 1: Implement Stretching page**

`frontend/src/pages/Stretching.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type StretchingEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import Heatmap from "@/components/Heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

export default function Stretching() {
  const [entries, setEntries] = useState<StretchingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    api.stretching(year, month).then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekStart = getWeekStart(now);

  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);
  const weekMinutes = weekEntries.reduce((s, e) => s + e.duration_min, 0);
  const monthMinutes = entries.reduce((s, e) => s + e.duration_min, 0);

  // Heatmap: 1 if stretched that day, 0 if not
  const heatmapData: Record<string, number> = {};
  for (const e of entries) {
    heatmapData[e.date] = 1;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stretching</h1>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">
            Stretching Heatmap — {now.getFullYear()}-{String(now.getMonth() + 1).padStart(2, "0")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap year={now.getFullYear()} month={now.getMonth() + 1} data={heatmapData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="This Week" value={weekMinutes} unit="min" />
        <MetricCard label="This Month" value={monthMinutes} unit="min" />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Stretching Log</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">No stretching logged this month.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Date</TableHead>
                  <TableHead>Stretch</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...entries].reverse().map((e, i) => (
                  <TableRow key={i} className="border-zinc-800">
                    <TableCell>{e.date}</TableCell>
                    <TableCell>{e.stretch}</TableCell>
                    <TableCell className="text-right">{e.duration_min} min</TableCell>
                    <TableCell className="text-zinc-500">{e.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify Stretching page**

Open http://localhost:5173/stretching — should show heatmap, weekly/monthly totals, and log table.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Stretching.tsx
git commit -m "feat: implement Stretching page with heatmap and log table"
```

---

## Task 14: Cardio page

**Files:**
- Modify: `frontend/src/pages/Cardio.tsx`

- [ ] **Step 1: Implement Cardio page**

`frontend/src/pages/Cardio.tsx`:

```tsx
import { useEffect, useState } from "react";
import { api, type CardioEntry } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from "recharts";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function getWeekNumber(dateStr: string): string {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - start.getTime();
  const week = Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
  return `W${week}`;
}

export default function Cardio() {
  const [entries, setEntries] = useState<CardioEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    api.cardio(year, month).then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-zinc-500">Loading...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart(new Date());

  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);
  const weeklyMinutes = weekEntries.reduce((s, e) => s + e.duration, 0);
  const monthlyMinutes = entries.reduce((s, e) => s + e.duration, 0);

  // Bar chart: duration by type per day
  const types = [...new Set(entries.map((e) => e.type))];
  const byDay: Record<string, Record<string, number>> = {};
  for (const e of entries) {
    if (!byDay[e.date]) byDay[e.date] = {};
    byDay[e.date][e.type] = (byDay[e.date][e.type] || 0) + e.duration;
  }
  const barData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, types]) => ({ date: date.slice(5), ...types }));

  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  // Weekly volume trend
  const byWeek: Record<string, number> = {};
  for (const e of entries) {
    const week = getWeekNumber(e.date);
    byWeek[week] = (byWeek[week] || 0) + e.duration;
  }
  const weeklyTrend = Object.entries(byWeek).map(([week, minutes]) => ({ week, minutes }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cardio</h1>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="This Week" value={weeklyMinutes} unit="min" />
        <MetricCard label="This Month" value={monthlyMinutes} unit="min" />
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm">Monthly Cardio by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length === 0 ? (
            <p className="text-sm text-zinc-500">No cardio logged this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                <Legend />
                {types.map((type, i) => (
                  <Bar key={type} dataKey={type} fill={colors[i % colors.length]} stackId="a" radius={i === types.length - 1 ? [2, 2, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {weeklyTrend.length > 1 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm">Weekly Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="week" tick={{ fill: "#71717a", fontSize: 12 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }} />
                <Line type="monotone" dataKey="minutes" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify Cardio page**

Open http://localhost:5173/cardio — should show weekly/monthly cards, stacked bar chart by type, and weekly trend line.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Cardio.tsx
git commit -m "feat: implement Cardio page with type breakdown and weekly trend"
```

---

## Task 15: Dev scripts, cleanup, and final verification

**Files:**
- Modify: `package.json` (project root)
- Delete: `src/dashboard/public/` directory

- [ ] **Step 1: Add dev scripts to root package.json**

Add the `frontend` and `dev` scripts. The `dev` script uses `bun run` for both processes:

In root `package.json`, update scripts:

```json
"scripts": {
  "mcp": "bun run src/mcp-server/run.ts",
  "dashboard": "bun run src/dashboard/run.ts",
  "frontend": "cd frontend && bunx vite",
  "dev": "bun run dashboard & cd frontend && bunx vite",
  "test": "bun test"
}
```

- [ ] **Step 2: Delete old frontend files**

```bash
rm -rf src/dashboard/public/
```

- [ ] **Step 3: Update CLAUDE.md CSV schemas**

In `CLAUDE.md`, update the Strength schema to include category and add Stretching:

Find the Strength schema line (may show `unit` field — the actual code never had it) and replace with:
```
- **Strength**: `date,exercise,category,sets,reps,weight,notes`
```

Add after the Weight schema line:
```
- **Stretching**: `date,stretch,duration_min,notes`
```

- [ ] **Step 4: Run all tests**

```bash
bun test
```

Expected: All tests pass.

- [ ] **Step 5: Full end-to-end verification**

Start both servers:
```bash
bun run dev
```

Verify each page:
1. http://localhost:5173/ → redirects to /nutrition
2. http://localhost:5173/nutrition → macro cards, weekly tracking, food log
3. http://localhost:5173/strength → heatmap, PPL table, monthly summary toggle
4. http://localhost:5173/steps → weekly/monthly progress, bar chart
5. http://localhost:5173/weight → summary cards, month/year toggle, chart
6. http://localhost:5173/stretching → heatmap, summary, log table
7. http://localhost:5173/cardio → summary cards, type chart, weekly trend

Verify sidebar navigation works between all pages.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dev scripts, remove old frontend, update CLAUDE.md schemas"
```
