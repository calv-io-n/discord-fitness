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
