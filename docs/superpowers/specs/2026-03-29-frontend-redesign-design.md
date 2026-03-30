# Frontend Redesign: React + shadcn/ui Dashboard

## Overview

Replace the current vanilla JS fitness dashboard with a React SPA using Vite, shadcn/ui, Tailwind CSS, and Recharts. The new frontend lives in a separate `frontend/` directory and runs on its own dev server, proxying API requests to the existing Elysia backend. Six dedicated pages replace the current 5-view single-page app. Sleep page is removed. Stretching page is added as a new domain.

## Architecture

### Frontend (`frontend/` at project root)

- **Vite** + **React 19** + **TypeScript**
- **shadcn/ui** components + **Tailwind CSS v4**
- **Recharts** for data visualization (React-native charting, replaces Chart.js)
- **React Router** for client-side routing across 6 pages
- Dev server on port **5173**, proxies `/api` to `http://localhost:3000`

### Backend (existing `src/dashboard/`)

- Elysia on port **3000** stays as-is for API routes
- Remove `public/` directory (no longer serving static files from Elysia)
- Add **CORS headers** for dev mode (frontend on port 5173)
- Add `stretching` domain to csv-store
- Add `category` field to strength entries

### Data Model Changes

1. **Strength CSV**: `date,exercise,sets,reps,weight,notes` → `date,exercise,category,sets,reps,weight,notes`
   - `category` values: `push`, `pull`, `legs`
   - Update `StrengthEntry` type, `CSV_HEADERS`, and MCP `log_strength` tool
2. **New domain — Stretching**: schema `date,stretch,duration_min,notes`
   - Add to `DOMAINS` array, create `StretchingEntry` type, add `CSV_HEADERS` entry
   - New MCP tool `log_stretching`
3. **Targets**: Add `stretching` section to `targets.yaml` (optional — no hard targets needed initially)

### Scripts

- `bun run dev` — starts both Elysia API + Vite dev server (concurrently)
- `bun run frontend` — Vite dev server only
- `bun run dashboard` — Elysia API only

## Pages

### 1. Nutrition (`/nutrition`)

**Purpose**: Daily macros at a glance, weekly calorie tracking with on-track projection, today's food log.

**Layout** (single column, top to bottom):

1. **Daily Macro Cards** (4-column grid): Calories, Protein, Carbs, Fat
   - Each card: current value, target, progress bar
   - Green if on pace, red if over target
2. **Weekly Tracking** (2-column grid):
   - Weekly Calories: current sum / (daily target × 7), progress bar, days remaining
   - Weekly Projection: (average daily calories so far this week) × 7 = estimated weekly total
   - On-track indicator: green check "On track" or red warning "Going over by ~X"
3. **Today's Food Log** (table):
   - Rows from nutrition CSV entries matching today's date
   - Columns: Meal, Calories, Protein (g), Carbs (g), Fat (g)
   - Totals row at bottom

**API calls**: `GET /api/today`, `GET /api/targets`, `GET /api/nutrition/{year}/{month}`

### 2. Strength (`/strength`)

**Purpose**: Workout frequency heatmap, progressive overload tracking per Push/Pull/Legs.

**Layout**:

1. **Monthly Workout Heatmap** (GitHub-style grid):
   - Days colored by whether a workout was logged
   - Color intensity by volume (sets x reps x weight)
   - Day-of-week headers (M T W T F S S)
2. **PPL Filter Tabs**: All | Push | Pull | Legs
3. **Exercise Table** (below tabs):
   - Columns: Exercise, Category, Last (weight × reps from most recent session), Best (heaviest weight × reps across all data), Trend
   - Trend: compares last 2 sessions for same exercise
     - Green up arrow + delta = progressing
     - Yellow dash = plateau (same weight)
     - Red down arrow + delta = regressing
   - Click row to expand: shows session history for that lift
4. **Monthly Summary Subview** (tab or toggle alongside main view):
   - Month-over-month total volume per PPL category (bar chart)
   - Progressive overload trend per exercise across months (did your best set improve month to month?)
   - Fetches multiple months of data to compare

**API calls**: `GET /api/strength/{year}/{month}` (multiple months for summary), `GET /api/targets`

### 3. Steps (`/steps`)

**Purpose**: Weekly and monthly step goal tracking with projections.

**Layout**:

1. **Progress Cards** (2-column grid):
   - Weekly: current week total / (10,000 × 7), days remaining, on-track indicator
   - Monthly: current month total / (10,000 × days in month), on-track indicator
2. **Daily Steps Bar Chart**:
   - Bar per day for the current month
   - Horizontal target line at 10,000

**API calls**: `GET /api/steps/{year}/{month}`, `GET /api/targets`

### 4. Weight (`/weight`)

**Purpose**: Fat loss trend visualization.

**Layout**:

1. **Summary Card**: Current weight, target weight, remaining to lose, rate of loss (lbs/week from trend)
2. **Time Range Toggle**: "This Month" | "This Year"
   - **This Month**: Daily weigh-in data points with 7-day moving average trend line, target weight horizontal line
   - **This Year**: Monthly average weight per month (12 data points), trend line across the year, target weight horizontal line — shows the big-picture fat loss arc
3. **Weight Chart** (line chart, changes based on toggle):
   - Data points + trend line + target line

**API calls**: `GET /api/weight/{year}/{month}` (single month or all 12 for yearly), `GET /api/targets`

### 5. Stretching (`/stretching`)

**Purpose**: Track stretching consistency and duration.

**Layout**:

1. **Monthly Heatmap**: Did you stretch today (yes/no green/empty grid)
2. **Summary Cards**: Total minutes this week, total minutes this month
3. **Log Table**: Date, stretch name, duration (min). Entries for current month.

**API calls**: `GET /api/stretching/{year}/{month}`

### 6. Cardio (`/cardio`)

**Purpose**: Cardio volume and trends.

**Layout**:

1. **Summary Cards** (2-column): Weekly total duration, monthly total duration
2. **Monthly Bar Chart**: Grouped by cardio type (running, cycling, etc.)
3. **Weekly Volume Trend**: Line chart of total cardio minutes per week over time

**API calls**: `GET /api/cardio/{year}/{month}`, `GET /api/targets`

## Component Structure

```
frontend/
├── src/
│   ├── App.tsx                — Layout shell: sidebar + <Outlet />
│   ├── main.tsx               — React entry point, router setup
│   ├── lib/
│   │   └── api.ts             — Typed fetch wrapper, base URL from env
│   ├── components/
│   │   ├── Sidebar.tsx        — Fixed sidebar nav, 6 page links with icons
│   │   ├── MetricCard.tsx     — Reusable: label, value, target, progress bar
│   │   ├── Heatmap.tsx        — Reusable monthly grid (Strength, Stretching)
│   │   └── TrendIndicator.tsx — Up/down/plateau arrow + color
│   ├── pages/
│   │   ├── Nutrition.tsx
│   │   ├── Strength.tsx
│   │   ├── Steps.tsx
│   │   ├── Weight.tsx
│   │   ├── Stretching.tsx
│   │   └── Cardio.tsx
│   └── index.css              — Tailwind directives
├── index.html
├── vite.config.ts             — proxy /api → localhost:3000
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── components.json            — shadcn/ui config
```

### shadcn/ui Components

- `Card` — metric cards on every page
- `Progress` — progress bars in metric cards
- `Table` — strength exercise table, food log, stretching log
- `Tabs` — PPL filter on strength page
- `Badge` — trend indicators (up/down/plateau), on-track/behind labels

### Routing (React Router)

| Path | Page |
|------|------|
| `/` | Redirects to `/nutrition` |
| `/nutrition` | Nutrition |
| `/strength` | Strength |
| `/steps` | Steps |
| `/weight` | Weight |
| `/stretching` | Stretching |
| `/cardio` | Cardio |

### Design System

- **Dark theme**: Tailwind dark mode as default (dark background, light text)
- **Sidebar**: Fixed left, ~200px wide, dark background, active page highlighted
- **Colors**: Green (#22c55e) for on-track/progress, Red (#ef4444) for over/regressing, Yellow (#f59e0b) for plateau, Blue (#3b82f6) for neutral charts
- **Typography**: System font stack via Tailwind defaults
- **Cards**: Rounded corners, subtle border, consistent padding
- **Charts**: Recharts with dark theme — dark grid lines, light text labels

## Backend Changes Summary

1. **csv-store/types.ts**: Add `stretching` to `DOMAINS`, add `StretchingEntry` interface, add `category` to `StrengthEntry`, update `CSV_HEADERS`
2. **MCP server**: Add `log_stretching` tool, add `category` param to `log_strength`
3. **Dashboard API**: Add CORS for dev mode, `stretching` domain auto-works via existing `/:domain/:year/:month` route
4. **targets.yaml**: No changes required (stretching has no hard targets initially)
