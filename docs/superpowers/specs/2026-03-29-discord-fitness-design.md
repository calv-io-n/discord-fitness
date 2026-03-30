# Discord Fitness — Design Spec

A personal fitness companion that runs as a Claude Code Discord channel agent, backed by CSV files, an MCP server for data access, and a web dashboard for analytics.

## Architecture

Monorepo, TypeScript, Bun runtime.

```
discord-fitness/
├── CLAUDE.md                     # Agent instructions, personality, domain knowledge
├── targets.yaml                  # Current fitness targets/goals
├── start.sh                      # tmux launcher for Claude Code Discord session
├── data/                         # CSV storage (source of truth)
│   ├── strength/                 # Monthly: 2026-03.csv
│   ├── cardio/
│   ├── steps/
│   ├── nutrition/
│   ├── sleep/
│   └── weight/
├── memory/                       # OpenClaw-style agent memory
│   ├── MEMORY.md                 # Long-term persistent knowledge
│   ├── USER.md                   # User profile, goals, injuries, preferences
│   └── daily/                    # Daily append-only observation logs
│       └── YYYY-MM-DD.md
├── .claude/
│   └── skills/
│       └── heartbeat/
│           └── SKILL.md          # Heartbeat checklist invoked via /loop
├── src/
│   ├── csv-store/                # Shared CSV parsing/writing module
│   ├── mcp-server/               # MCP server (data CRUD, no coaching)
│   └── dashboard/                # Elysia app + static frontend (Chart.js)
├── package.json
├── tsconfig.json
└── docs/
```

### Components

- **Discord agent** — Claude Code connected to a Discord channel via `claude --channel discord`. Runs in a tmux session. Provides coaching, answers questions, references data and targets. Has personality and memory.
- **MCP server** — Pure data tool. Logs entries, queries data, reads/updates targets. No coaching, no personality. Installable in claude.ai for access via Claude web.
- **Dashboard** — Elysia HTTP server serving a static frontend with Chart.js. Displays analytics from CSV files. Accessed remotely via Cloudflare Tunnel with Zero Trust.
- **CSV store** — Shared TypeScript module for reading/writing/querying CSVs. Used by both MCP server and dashboard.

### Data flow

- User interacts via Discord channel or Claude web (via MCP server)
- Agent/MCP writes to CSV files in `data/`
- Dashboard reads CSV files and renders analytics
- Agent reads CSVs + `targets.yaml` + memory files for coaching context

## CSV Schemas

Six domains, one CSV per month per domain (e.g., `data/strength/2026-03.csv`).

### Strength

```csv
date,exercise,sets,reps,weight,unit,notes
2026-03-29,bench press,4,8,185,lb,felt strong
2026-03-29,incline db press,3,12,60,lb,
```

### Cardio

```csv
date,type,duration_min,distance,distance_unit,avg_hr,notes
2026-03-29,running,30,3.1,mi,155,easy pace
```

### Steps

```csv
date,steps,notes
2026-03-29,10432,
```

### Nutrition

```csv
date,meal,calories,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,sugar_g,cholesterol_mg,notes
2026-03-29,breakfast,450,35,40,15,8,600,5,120,eggs and oats
```

### Sleep

```csv
date,bed_time,wake_time,duration_hr,quality,notes
2026-03-29,22:30,06:15,7.75,good,
```

### Weight

```csv
date,weight,unit,notes
2026-03-29,185.4,lb,morning fasted
```

## Targets

`targets.yaml` at repo root. Single source of truth for current goals. Readable and writable by both the user and the agent (via MCP server).

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

## MCP Server

Pure data CRUD. No coaching, no personality. Exposes tools for Claude to call.

### Logging tools

| Tool | Description |
|------|-------------|
| `log_strength` | Add a strength entry (exercise, sets, reps, weight, unit, notes) |
| `log_cardio` | Add a cardio entry (type, duration, distance, hr, notes) |
| `log_steps` | Add step count for a day |
| `log_nutrition` | Add a meal entry (macros + key micros) |
| `log_sleep` | Add a sleep entry (bed/wake time, quality) |
| `log_weight` | Add a weight entry |

### Query tools

| Tool | Description |
|------|-------------|
| `query_domain` | Read entries for a domain with date range filtering |
| `get_today` | Get all entries across all domains for today |
| `get_summary` | Aggregated stats for a domain over a date range (totals, averages) |

### Target tools

| Tool | Description |
|------|-------------|
| `get_targets` | Read current targets from targets.yaml |
| `update_targets` | Update one or more target values |

### Resources

- `targets.yaml` exposed as an MCP resource for passive reading

## Dashboard

Elysia HTTP server + static HTML/JS frontend with Chart.js.

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/:domain/:year/:month` | Raw CSV data as JSON |
| `GET /api/:domain/summary?from=&to=` | Aggregated stats |
| `GET /api/targets` | Current targets |
| `GET /api/today` | Today's entries across all domains |

### Frontend Views

1. **Overview** — Today's snapshot across all domains vs targets. Cards with progress bars.
2. **Trends** — Line charts per domain over selectable time range (weight curve, calorie trend, volume progression, step count, sleep duration).
3. **Adherence** — Hit/miss calendar heatmaps (protein target, step goal, sleep goal per day).
4. **Domain detail** — Drill into a single domain. All entries, domain-specific charts (e.g., exercise-level strength progression).
5. **Macro breakdown** — Donut/pie chart showing protein/carbs/fat split, daily and over a period.
6. **Calorie tracking** — Daily calories vs daily target, weekly total vs weekly target (daily target x 7).

### Deployment

- Runs locally via Bun
- Accessed remotely via Cloudflare Tunnel with Zero Trust access policy
- No auth in the app — Cloudflare Zero Trust handles access control

## Agent Memory (OpenClaw-style)

Plain markdown files on disk. The agent only "remembers" what gets saved to files.

### Structure

| Path | Purpose | Loaded when |
|------|---------|-------------|
| `memory/MEMORY.md` | Long-term: PRs, decisions, training phase, preferences | Every session start |
| `memory/USER.md` | User profile: goals, injuries, schedule, dietary needs | Every session start |
| `memory/daily/YYYY-MM-DD.md` | Daily observations, what was logged, patterns noticed | Today + yesterday |

### What goes where

- **MEMORY.md** — Curated long-term knowledge. Training phase (bulk/cut/maintenance), milestone PRs, learned preferences, key decisions.
- **USER.md** — Who the user is. Goals, injuries, schedule, dietary restrictions, training style.
- **Daily logs** — Append-only running context. "Missed protein target 3 days running", "new squat PR", "sleep quality declining".

## Heartbeat

A Claude Code skill at `.claude/skills/heartbeat/SKILL.md`, invoked periodically via `/loop`.

```
/loop 2h /heartbeat
```

### Checklist

```markdown
# Heartbeat Checklist
- Check today's logged data against targets in targets.yaml
- If meals are logged but protein is under target, nudge about it
- If no workout logged by evening, ask about rest day
- Append observations to daily memory log
- If nothing needs attention, reply HEARTBEAT_OK
```

### Behavior

- Runs every 2 hours while the Claude Code session is active
- Reads today's CSV data and compares against targets
- Sends nudges/reminders via the Discord channel when relevant
- Appends observations to `memory/daily/YYYY-MM-DD.md`
- Replies `HEARTBEAT_OK` (suppressed) when nothing needs attention

## Infrastructure

### tmux session (`start.sh`)

Starts a tmux session running the Claude Code Discord channel agent. The heartbeat `/loop` is kicked off within the Claude Code session.

The MCP server and dashboard run independently outside tmux.

### Cloudflare Tunnel + Zero Trust

- `cloudflared tunnel` points to `localhost:<dashboard-port>`
- Zero Trust access policy restricts to the user's email/identity
- No application-level auth needed

### Prerequisites

- Bun runtime
- Claude Code CLI
- Discord bot token (with Message Content intent)
- Cloudflare account + `cloudflared` CLI
- MCP server configured in Claude Code settings

## Discord Agent (CLAUDE.md)

The `CLAUDE.md` file defines the agent's behavior in the Discord channel:

- **Role** — Fitness coach. Knowledgeable about training principles, nutrition, progressive overload.
- **Tone** — Configurable. Encouraging but direct.
- **Data access** — Reads CSVs from `data/` and `targets.yaml` for context.
- **Memory** — Reads/writes `memory/` files to maintain continuity across sessions.
- **Coaching** — Reviews logged data, flags missed targets, suggests adjustments, celebrates milestones.
- **Logging** — Logs entries on behalf of the user when asked via Discord by writing directly to CSV files (has filesystem access). Claude web users log via the MCP server instead.
