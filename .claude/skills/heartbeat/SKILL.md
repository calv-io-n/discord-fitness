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
