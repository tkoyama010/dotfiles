# Claude Code - Global Project Guidelines

This file contains common guidelines for all projects. Copy or reference this in project-specific CLAUDE.md files.

## General Behavior

When stuck in an error loop (same error 2+ times), stop, summarize the problem, and ask the user for guidance instead of retrying the same approach.

## Environment

Always use `uv` as the Python tool runner (e.g., `uv run python ...`, `uv pip install ...`). Never use bare `python` or `pip` without being explicitly told otherwise.

## Code Style

Use `logger` (Python logging module) instead of `print()` for all output in production code.

## Project Architecture

For this project, integrate new scripts into `__main__.py` as CLI subcommands rather than creating standalone scripts, unless told otherwise.

## Git / PR Workflow

### PR Creation
When creating a PR on a branch that may have no diff from the base, check for commits first. If there are none, ask the user whether to make an empty commit or start implementation before opening the PR — don't just fail.

### Data Files
Never commit data files (e.g., CSVs, large binaries) unless explicitly asked. When in doubt, ask before staging data files.
