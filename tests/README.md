# Signatura Tests

All tests for the Signatura application are organized in this directory.

## Directory Structure

```
tests/
├── unit/                        # Unit tests (Vitest)
│   ├── companion/               # AI Companion tests
│   │   └── emotional-intelligence.test.ts
│   └── indicators/              # 10-Indicator scoring system tests
│       ├── indicators.test.ts
│       └── test-data.ts
│
├── ralph/                       # RALPH specification tests (by module)
│   ├── cv-tailor/               # CV Tailor module
│   │   └── holy-trinity.md
│   ├── companion/               # AI Companion
│   │   └── glassmorphism-ui.md
│   ├── interview-coach/         # Interview Coach module
│   │   └── module-3.md
│   ├── compensation/            # Compensation Negotiator module
│   │   └── module-4.md
│   ├── contract-reviewer/       # Contract Reviewer module
│   │   └── module-5.md
│   ├── dashboard/               # Dashboard components
│   │   └── base44-migration.md
│   ├── ui/                      # UI components
│   │   └── persistent-ui-layer.md
│   └── README.md
│
└── README.md
```

## Test Types

### Unit Tests (`/unit`)

Automated tests run with Vitest. These test specific functions and components in isolation.

**Current Coverage:**
- `companion/` - AI Companion emotional intelligence tests (22 tests)
- `indicators/` - 10-Indicator framework scoring tests (44 tests)

### RALPH Tests (`/ralph`)

**RALPH** (Requirements Analysis & Logical Path Handler) tests are manual verification processes that validate implementations against their specifications.

**Current Coverage:**

| Module | Result | Location |
|--------|--------|----------|
| CV Tailor - Holy Trinity | ✅ 32/32 | `ralph/cv-tailor/` |
| Interview Coach | ✅ 82/82 | `ralph/interview-coach/` |
| Compensation Negotiator | ✅ 78/78 | `ralph/compensation/` |
| Contract Reviewer | ✅ 52/52 | `ralph/contract-reviewer/` |
| Dashboard Migration | ✅ 36/36 | `ralph/dashboard/` |
| Companion Glassmorphism | ✅ 22/22 | `ralph/companion/` |
| Persistent UI Layer | ✅ 40/40 | `ralph/ui/` |

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

### Specific Module
```bash
npx vitest run tests/unit/companion/
```

## Test Coverage Summary

| Category | Tests | Status |
|----------|-------|--------|
| Unit Tests | 66 | ✅ Passing |
| RALPH Tests | 342 | ✅ Passing |
| **Total** | **408** | ✅ |

## Writing New Tests

### Unit Tests
1. Create file in appropriate subdirectory under `tests/unit/`
2. Use `*.test.ts` or `*.test.tsx` naming convention
3. Follow Vitest patterns (describe, it, expect)

### RALPH Tests
1. Create subdirectory for your module under `tests/ralph/` if needed
2. Create markdown file following the existing template
3. Document all requirements from specification
4. Include Pass/Fail status and file references
5. Update `tests/ralph/README.md` with the new report link
