# Testing & Coverage Guide

## Running Tests

### Basic Test Run

```bash
# Run all tests
pnpm test

# Or using uv directly
uv run pytest
```

### With Coverage Report

```bash
# Generate HTML and terminal coverage report
pnpm test:cov

# View HTML report
open htmlcov/index.html  # macOS
xdg-open htmlcov/index.html  # Linux
```

### Watch Mode (Development)

```bash
# Auto-run tests on file changes
pnpm test:watch
```

### Run Specific Tests

```bash
# Single test file
uv run pytest tests/test_app.py

# Single test function
uv run pytest tests/test_app.py::test_health_check

# Tests matching pattern
uv run pytest -k "test_extract"

# Verbose output
uv run pytest -v

# Show print statements
uv run pytest -s
```

## Coverage Reports

### Terminal Report

```bash
uv run pytest --cov=ai_service --cov-report=term-missing
```

Output example:
```
Name                              Stmts   Miss  Cover   Missing
---------------------------------------------------------------
ai_service/__init__.py                1      0   100%
ai_service/api.py                   120     15    87%   45-48, 102-105
ai_service/app.py                    35      2    94%   28-29
ai_service/config.py                 42      5    88%   67-71
ai_service/db.py                     28      3    89%   45-47
ai_service/exceptions.py             15      0   100%
ai_service/knowledge_graph.py       180     45    75%   ...
ai_service/llm.py                    65     12    82%   ...
ai_service/middleware.py             45      5    89%   ...
ai_service/models.py                 50      0   100%
ai_service/search.py                 95     20    79%   ...
---------------------------------------------------------------
TOTAL                               676    107    84%
```

### HTML Report

```bash
# Generate and open
pnpm test:cov
open htmlcov/index.html
```

Features:
- Line-by-line coverage visualization
- Branch coverage
- Missing lines highlighted
- Sortable by coverage percentage

### XML Report (for CI/CD)

```bash
uv run pytest --cov=ai_service --cov-report=xml
```

Generates `coverage.xml` for tools like:
- Codecov
- Coveralls
- SonarQube

## Coverage Configuration

### Minimum Coverage Threshold

Add to `pyproject.toml`:

```toml
[tool.coverage.report]
fail_under = 80  # Fail if coverage < 80%
```

### Exclude Lines from Coverage

```python
# Exclude specific lines
def debug_only():  # pragma: no cover
    print("Debug info")

# Exclude blocks
if TYPE_CHECKING:  # pragma: no cover
    from typing import Protocol
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test & Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install uv
        uses: astral-sh/setup-uv@v1
      
      - name: Run tests with coverage
        run: |
          cd apps/ai-service
          uv run pytest --cov=ai_service --cov-report=xml
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./apps/ai-service/coverage.xml
          flags: ai-service
```

## Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| API Routes | 90% | - |
| Models | 100% | - |
| Middleware | 85% | - |
| Knowledge Graph | 75% | - |
| LLM Integration | 70% | - |
| Overall | 80% | - |

## Best Practices

1. **Write tests first** (TDD)
2. **Test edge cases** (empty inputs, errors)
3. **Mock external services** (LLM, database)
4. **Test async code** properly
5. **Keep tests fast** (< 1s per test)
6. **Use fixtures** for common setup

## Troubleshooting

### Tests fail with import errors

```bash
# Ensure dependencies are installed
uv sync
```

### Coverage report not generated

```bash
# Install pytest-cov
uv add --dev pytest-cov
```

### Async tests fail

```bash
# Ensure pytest-asyncio is installed
uv add --dev pytest-asyncio
```

### Database tests fail

```bash
# Set test database URL
export GRAPH_DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
```

## Example Test

```python
import pytest
from httpx import AsyncClient
from ai_service.app import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "C404 Insight AI"}
```
