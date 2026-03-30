# Discord Fitness

A personal fitness companion powered by Claude Code. Tracks workouts, nutrition, sleep, weight, and steps via CSV files. Interact through Discord or Claude web, view analytics on a web dashboard.

## Architecture

- **Discord Agent** — Claude Code running in a Discord channel. Logs data, provides coaching, maintains memory.
- **MCP Server** — Data CRUD tools served via Streamable HTTP. Accessible from Claude web (claude.ai) or any MCP client.
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

The MCP server runs as an HTTP server using Streamable HTTP transport. Start it with:

```bash
bun run mcp
```

This starts the server at `http://localhost:3001/mcp`.

To add it to Claude web or Claude Code as a remote MCP server, configure the URL:

```json
{
  "mcpServers": {
    "discord-fitness": {
      "type": "url",
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

If accessing remotely (e.g., via Cloudflare Tunnel), replace `localhost:3001` with your tunnel URL.

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
```

Create `~/.cloudflared/config.yml`:

```yaml
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

### Start the MCP server

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
