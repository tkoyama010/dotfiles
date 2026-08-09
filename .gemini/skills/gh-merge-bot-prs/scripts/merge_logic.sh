#!/bin/bash
# merge_logic.sh: Logic to check CI and merge bot PRs

AUTHOR=$1
OWNER=${2:-$(gh api user -q .login)}

if [ -z "$AUTHOR" ]; then
	echo "Usage: $0 <author_login> [owner]"
	exit 1
fi

echo "Searching for open PRs by $AUTHOR in repositories owned by $OWNER..."

# Fetching all open PRs by author
prs_json=$(gh search prs --owner "$OWNER" --state open --author "$AUTHOR" --json repository,number,title --limit 100)

if [ "$prs_json" == "[]" ] || [ -z "$prs_json" ]; then
	echo "No open PRs found for $AUTHOR."
	exit 0
fi

echo "$prs_json" | jq -r '.[] | "\(.repository.nameWithOwner):\(.number):\(.title)"' | while read -r line; do
	repo=$(echo "$line" | cut -d: -f1)
	num=$(echo "$line" | cut -d: -f2)
	title=$(echo "$line" | cut -d: -f3-)

	echo "Processing $repo #$num: $title"

	# Check if CI is passing
	checks=$(gh pr checks -R "$repo" "$num" --json state -q '.[].state' 2>/dev/null)

	if [ -z "$checks" ]; then
		# Fallback to statusCheckRollup for different check types
		checks=$(gh pr view -R "$repo" "$num" --json statusCheckRollup -q '.statusCheckRollup[] | "\(.status) \(.conclusion)"' 2>/dev/null)
	fi

	if [ -z "$checks" ]; then
		echo "  ⚠️ No checks or status found. Skipping."
		continue
	fi

	failed=$(echo "$checks" | grep -vE "SUCCESS|COMPLETED|NEUTRAL|SKIPPED" | wc -l)
	pending=$(echo "$checks" | grep -E "PENDING|IN_PROGRESS|QUEUED" | wc -l)

	if [ "$failed" -eq 0 ] && [ "$pending" -eq 0 ]; then
		echo "  ✅ Checks passed. Approving and merging..."
		gh pr review -R "$repo" "$num" --approve
		# Try normal merge, then admin merge
		if gh pr merge -R "$repo" "$num" --squash --delete-branch; then
			echo "  🚀 Merged successfully."
		else
			echo "  ⚠️ Normal merge failed. Attempting admin merge..."
			if gh pr merge -R "$repo" "$num" --squash --delete-branch --admin; then
				echo "  🚀 Admin merged successfully."
			else
				echo "  ❌ Merge failed even with admin privileges."
			fi
		fi
	else
		echo "  ❌ Checks not passing or still pending. Skipping."
		# echo "  Status details: $checks"
	fi
	echo "-----------------------------------"
done
