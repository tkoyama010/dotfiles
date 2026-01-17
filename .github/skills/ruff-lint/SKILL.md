---
name: ruff-lint
description: Lint and fix Python code using Ruff linter with all rules enabled. Use this when asked to check Python code style, fix lint errors, or ensure code quality.
---

## Instructions

### Check Python code for ALL linting issues

```bash
ruff check . --select ALL
```

### Automatically fix all fixable issues

```bash
ruff check . --select ALL --fix
```

### Format code (Black-compatible)

```bash
ruff format .
```

### Show diff without applying changes

```bash
ruff check . --select ALL --diff
```

### Check specific file

```bash
ruff check <file> --select ALL
```

### Fix specific file

```bash
ruff check <file> --select ALL --fix
```

## Configuration

This project uses the following Ruff configuration in `pyproject.toml`:

```toml
[tool.ruff.lint]
extend-select = ["ALL"]  # Enable all rules
ignore = []              # No rules ignored
```

## Coding Standards

### Logging instead of print statements

When you encounter print statement linting errors (T201), always replace `print()` with proper logging:

```python
import logging

logger = logging.getLogger(__name__)

# Bad (will cause T201 error)
print("message")

# Good
logger.info("message")
logger.debug("debug message")
logger.warning("warning message")
logger.error("error message")
```

### Other important rules

- Use `pathlib.Path` instead of `os.path` operations
- Prefer f-strings over `.format()` or `%` formatting
- Add type hints to function signatures
- Use explicit exception types instead of bare `except:`

## Notes

- Ruff is extremely fast (10-100x faster than traditional Python linters)
- It enforces all Python code quality rules by default in this project
- Always run `ruff check` before committing to ensure code quality
- Use `--fix` to automatically resolve fixable violations
- For print statement errors (T201), replace with logger calls
