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

### Path Operations

Always use `pathlib.Path` instead of `os.path` operations:

```python
from pathlib import Path

# Good
path = Path(__file__).parent / "config.json"
if path.exists():
    content = path.read_text()

# Avoid
import os
path = os.path.join(os.path.dirname(__file__), "config.json")
```

### String Formatting

Prefer f-strings over `.format()` or `%` formatting:

```python
# Good
message = f"Hello, {name}!"

# Avoid
message = "Hello, {}!".format(name)
message = "Hello, %s!" % name
```

### Type Hints

Add type hints to all function signatures:

```python
from pathlib import Path

def process_data(input_file: Path, output_dir: Path) -> bool:
    """Process data from input file."""
    ...
```

### Exception Handling

Use explicit exception types instead of bare `except:`:

```python
# Good
try:
    result = risky_operation()
except ValueError as e:
    logger.error("Invalid value: %s", e)
except FileNotFoundError as e:
    logger.error("File not found: %s", e)

# Avoid
try:
    result = risky_operation()
except:
    pass
```

## Workflow

When making any Python code changes, follow this workflow:

1. Write or modify Python code
2. Run `ruff check . --select ALL --fix` to auto-fix issues
3. Run `ruff format .` to format code
4. Address any remaining linting errors manually
5. Commit only when all Ruff checks pass

## Notes

- Ruff is 10-100x faster than traditional Python linters
- All code must pass Ruff checks before committing
- Zero tolerance for linting violations
- This ensures consistent, high-quality Python code across the project
- Always run `ruff check` before committing to ensure code quality
- Use `--fix` to automatically resolve fixable violations
- For print statement errors (T201), replace with logger calls
