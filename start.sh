#!/bin/bash
# Start the Claude Code Discord agent in a tmux session
# Runs as agent-fitness so the Discord plugin reads the right token.

SESSION="fitness-agent"
DIR="$(cd "$(dirname "$0")" && pwd)"
USER="agent-fitness"

# Kill existing session if present
tmux kill-session -t "$SESSION" 2>/dev/null

# Start as agent-fitness
tmux new-session -d -s "$SESSION" -n "agent" \
  "sudo -u $USER bash -c \"cd '$DIR' && claude --channels plugin:discord@claude-plugins-official\""

echo "Started fitness agent in tmux session '$SESSION'"
echo "Attach with: tmux attach -t $SESSION"
echo ""
echo "Once attached, start the heartbeat:"
echo "  /loop 2h /heartbeat"
