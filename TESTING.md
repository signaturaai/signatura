# Testing Guide for Signatura

This document explains how to run tests and perform manual verification for the Signatura application.

## RALPH Evaluation Framework

RALPH is a systematic evaluation framework used to verify application changes:

- **R (Routing)**: Navigation and back button behavior
- **A (API)**: Field names match Supabase schema
- **L (Logic)**: Business logic handles edge cases (null, empty, etc.)
- **P (Parameters)**: Data flows correctly through components
- **H (Handling)**: Empty states and error handling

## Running Tests

### Prerequisites

Ensure you have the development dependencies installed:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run RALPH Evaluation Tests

```bash
npm test -- tests/integration/ralph-evaluation.test.ts
```

Or with Vitest directly:

```bash
npx vitest run tests/integration/ralph-evaluation.test.ts
```

### Watch Mode

For development, run tests in watch mode:

```bash
npx vitest watch tests/integration/ralph-evaluation.test.ts
```

## Manual Verification Steps

### CV Tailor Application-Centric Flow

1. **Application Selection Required**
   - Navigate to `/cv/tailor`
   - Verify that the page shows an application selector
   - Verify you cannot proceed without selecting an application

2. **Job Description Auto-Population**
   - Select an application with a job description
   - Verify the job description field is populated
   - Select an application without a job description
   - Verify the job description field is cleared

3. **CV Auto-Fetch**
   - Verify your saved CVs are loaded from `base_cvs` table
   - Select a CV with content - verify it populates the CV text area
   - Select a CV without content - verify the text area is cleared

4. **Back Button Behavior**
   - From CV Tailor with an application selected, click Back
   - Verify you return to `/applications/{id}`
   - From CV Tailor without an application, click Back
   - Verify you return to `/dashboard`

### Dashboard Metrics

1. **Interactive Cards**
   - Hover over each metric card
   - Verify hover effects (scale, shadow)
   - Click each card and verify navigation:
     - Total Applications → `/applications`
     - Active Applications → `/applications?filter=active`
     - Interviews Scheduled → `/interview`
     - Offers Received → `/applications?filter=offers`

2. **Real Data**
   - Verify metrics match your actual Supabase data
   - Create a new application and refresh - verify count updates

### Application Detail Quick Actions

1. Navigate to `/applications/{id}` for any application
2. Verify Quick Actions section displays:
   - "Tailor CV" or "Re-Tailor CV" (if tailoring session exists)
   - "Practice Interview"
   - "Negotiate Offer" (only for offer/interviewing status)
3. Click each action and verify `application_id` is passed in URL

## Test Coverage

The RALPH evaluation tests cover:

| Category | Test Description |
|----------|-----------------|
| R - Routing | Back URL construction with/without application |
| R - Routing | Custom returnTo parameter handling |
| A - API | job_applications field name validation |
| A - API | base_cvs field name validation |
| L - Logic | Job description null handling |
| L - Logic | CV raw_text null handling |
| L - Logic | Usable CVs detection |
| P - Parameters | application_id URL extraction |
| P - Parameters | Application lookup by ID |
| P - Parameters | API request body construction |
| H - Handling | Empty state detection |
| H - Handling | CV card description logic |
| H - Handling | canSubmit validation |

## Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch

Failed tests will block merge until resolved.
