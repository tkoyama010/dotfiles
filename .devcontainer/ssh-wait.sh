#!/usr/bin/env bash
# Exit 0 once first-time dotfiles setup finishes, 1 if it failed.
# While setup runs, stream its log. Used by the `codespace-ssh` app.
set -uo pipefail

log=/tmp/setup-nix.log
done_marker=/tmp/setup-nix.done
failed_marker=/tmp/setup-nix.failed

if [ -f "$done_marker" ]; then
	exit 0
fi
if [ -f "$failed_marker" ]; then
	echo "Dotfiles setup failed. Check $log for details." >&2
	exit 1
fi

echo "Waiting for dotfiles setup to finish (first run takes ~20 minutes)..."
tail -n 5 -F "$log" 2>/dev/null &
tail_pid=$!
while [ ! -f "$done_marker" ] && [ ! -f "$failed_marker" ]; do
	sleep 2
done
kill "$tail_pid" 2>/dev/null
wait "$tail_pid" 2>/dev/null

if [ -f "$done_marker" ]; then
	exit 0
fi
echo "Dotfiles setup failed. Check $log for details." >&2
exit 1
