# Claude Code Custom Instructions

## Python Code Quality Standards

### Ruff Linting - ALL Rules Enforced

When working with Python code in this project, **ALWAYS** enforce ALL Ruff linting rules.

#### Before Making Any Code Changes

1. Check for linting issues:
   ```bash
   ruff check . --select ALL
   ```

2. Fix all auto-fixable issues:
   ```bash
   ruff check . --select ALL --fix
   ```

3. Format code:
   ```bash
   ruff format .
   ```

#### Coding Standards

**Print Statements (T201)**
- NEVER use `print()` statements
- ALWAYS use `logging` module instead:

```python
import logging

logger = logging.getLogger(__name__)

# Bad - will cause T201 error
print("message")

# Good
logger.info("message")
logger.debug("debug message")
logger.warning("warning message")
logger.error("error message")
```

**Path Operations**
- Use `pathlib.Path` instead of `os.path` operations
- Example:
```python
from pathlib import Path

# Good
path = Path(__file__).parent / "config.json"
if path.exists():
    content = path.read_text()
```

**String Formatting**
- Prefer f-strings over `.format()` or `%` formatting
- Example:
```python
# Good
message = f"Hello, {name}!"

# Avoid
message = "Hello, {}!".format(name)
message = "Hello, %s!" % name
```

**Type Hints**
- Add type hints to all function signatures
- Example:
```python
def process_data(input_file: Path, output_dir: Path) -> bool:
    """Process data from input file."""
    ...
```

**Exception Handling**
- Use explicit exception types instead of bare `except:`
- Example:
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

## Project Configuration

This project uses the following Ruff configuration in `pyproject.toml`:

```toml
[tool.ruff.lint]
extend-select = ["ALL"]  # Enable all rules
ignore = []              # No rules ignored
```

## Workflow

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
