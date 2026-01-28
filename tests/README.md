# Signatura Tests

All tests for the Signatura application are organized in this directory.

## Directory Structure

```
tests/
├── unit/                    # Unit tests (Vitest)
│   ├── indicators/          # 10-Indicator scoring system tests
│   └── companion/           # AI Companion tests
│
├── ralph/                   # RALPH specification tests
│   ├── cv-tailor-holy-trinity.md
│   ├── module-3-interview-coach.md
│   ├── module-4-compensation-negotiator.md
│   └── module-5-contract-reviewer.md
│
└── README.md
```

## Test Types

### Unit Tests (`/unit`)

Automated tests run with Vitest. Execute with:

```bash
npx vitest run
```

### RALPH Tests (`/ralph`)

**RALPH** (Requirements Analysis & Logical Path Handler) tests are manual verification processes that validate implementations against their specifications.

Each RALPH test documents:
- Requirements from the specification
- Pass/Fail status for each requirement
- Implementation file references
- Summary statistics

## Running Tests

### All Unit Tests
```bash
npx vitest run
```

### Watch Mode
```bash
npx vitest
```

### Specific Test File
```bash
npx vitest run tests/unit/indicators/indicators.test.ts
```

## Test Coverage

| Module | Unit Tests | RALPH Tests |
|--------|------------|-------------|
| 10-Indicator Scoring | ✅ 44 tests | - |
| AI Companion | ✅ 22 tests | - |
| CV Tailor - Holy Trinity | - | ✅ 32/32 |
| Interview Coach Module 3 | - | ✅ 82/82 |
| Compensation Negotiator Module 4 | - | ✅ 78/78 |
| Contract Reviewer Module 5 | - | ✅ 52/52 |

## Writing New Tests

### Unit Tests
1. Create file in appropriate subdirectory under `tests/unit/`
2. Use `*.test.ts` or `*.test.tsx` naming convention
3. Follow Vitest patterns (describe, it, expect)

### RALPH Tests
1. Create markdown file in `tests/ralph/`
2. Follow the template in existing RALPH reports
3. Document all requirements from specification
4. Include Pass/Fail status and file references
