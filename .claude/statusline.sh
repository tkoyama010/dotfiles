#!/bin/bash

# ANSI color codes
WHITE=$'\033[97m'
BLUE=$'\033[38;5;67m'  # Muted blue for progress bar
DIM=$'\033[90m'
RESET=$'\033[0m'

# Generate progress bar with ANSI colors
generate_progress_bar() {
    local current=$1
    local max=$2
    local width=8

    local filled=$((current * width / max))
    [ $filled -gt $width ] && filled=$width
    local empty=$((width - filled))

    local bar=""
    # Filled portion in muted blue
    bar+="${BLUE}"
    for ((i=0; i<filled; i++)); do bar+="█"; done
    # Empty portion in dim gray
    bar+="${DIM}"
    for ((i=0; i<empty; i++)); do bar+="█"; done
    # Return to white for rest of statusline
    bar+="${WHITE}"

    printf '%s' "$bar"
}

# Read input JSON from stdin
input=$(cat)

# Extract model display name and transcript path
model_name=$(echo "$input" | jq -r '.model.display_name // "Claude"')
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')

# Extract directory information
current_dir=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // empty')
project_dir=$(echo "$input" | jq -r '.workspace.project_dir // empty')

# Get directory basenames
current_name=""
project_name=""
[ -n "$current_dir" ] && current_name=$(basename "$current_dir")
[ -n "$project_dir" ] && project_name=$(basename "$project_dir")

# Check if in a git repository and get branch/commit info
is_git_repo=false
branch=""
commit_hash=""
if [ -n "$current_dir" ] && git -C "$current_dir" rev-parse --git-dir > /dev/null 2>&1; then
    is_git_repo=true
    branch=$(git -C "$current_dir" branch --show-current 2>/dev/null)
    commit_hash=$(git -C "$current_dir" rev-parse --short HEAD 2>/dev/null)
fi

# Get token usage from transcript
tokens_display=""
if [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
    token_data=$(grep '"usage"' "$transcript_path" 2>/dev/null | tail -1 | jq -r '
        .message.usage |
        if . then
            ((.input_tokens // 0) +
             (.cache_creation_input_tokens // 0) +
             (.cache_read_input_tokens // 0) +
             (.output_tokens // 0)) as $total |
            "\($total)"
        else
            empty
        end
    ' 2>/dev/null)

    if [ -n "$token_data" ] && [ "$token_data" != "null" ]; then
        total_tokens=$token_data
        progress_bar=$(generate_progress_bar $total_tokens 155000)

        if [ $total_tokens -ge 1000 ]; then
            formatted_tokens="$((total_tokens / 1000))k"
        else
            formatted_tokens="$total_tokens"
        fi

        tokens_display="${formatted_tokens} ${progress_bar}"
    fi
fi

# Build output
# Start with model name and tokens
if [ -n "$tokens_display" ]; then
    result="${model_name} (${tokens_display})"
else
    result="${model_name}"
fi

# Add directory and branch info
if [ "$is_git_repo" = true ]; then
    # Get relative path from git worktree root (reliable method)
    git_prefix=$(git -C "$current_dir" rev-parse --show-prefix 2>/dev/null)
    # Remove trailing slash if present
    git_prefix="${git_prefix%/}"

    if [ -n "$git_prefix" ]; then
        path_part="${project_name}/${git_prefix}"
    else
        path_part="${project_name}"
    fi

    # Build git info: [branch] (commit) or just (commit) for detached HEAD
    if [ -n "$branch" ]; then
        git_info="[${branch}] (${commit_hash})"
    else
        git_info="(${commit_hash})"
    fi
    result="${result} | ${path_part} ${git_info}"
elif [ -n "$project_name" ]; then
    # Not a git repo: show directory name only
    result="${result} | ${current_name}"
fi

# Output with white color, progress bar has its own colors
printf '%s%s%s\n' "$WHITE" "$result" "$RESET"
