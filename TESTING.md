# Testing Guide for Signatura

This document explains how to run tests and perform manual verification for the Signatura application.

## RALPH Evaluation Framework

RALPH is a systematic evaluation framework used to verify application changes:

- **R (Routing)**: Navigation and back button behavior
- **A (API)**: Field names match Supabase schema
- **L (Logic)**: Business logic handles edge cases (null, empty, etc.)
- **P (Parameters)**: Data flows correctly through components
- **H (Handling)**: Empty states and error handling

## Test Directory Structure

```
tests/
├── dashboard/
│   └── dashboard.test.ts      # Dashboard metrics, routing, Quick Actions
├── cv-tailor/
│   └── cv-tailor.test.ts      # CV tailoring flow, application selection
├── interview/
│   └── interview.test.ts      # Interview Coach, intelligence continuity
├── negotiator/
│   └── negotiator.test.ts     # Compensation negotiation, leverage data
├── contract/
│   └── contract.test.ts       # Contract review, terms verification
└── integration/
    └── ralph-evaluation.test.ts  # Original comprehensive RALPH tests
```

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

### Run Tests by Module

```bash
# Dashboard tests
npm test -- tests/dashboard

# CV Tailor tests
npm test -- tests/cv-tailor

# Interview Coach tests
npm test -- tests/interview

# Negotiator tests
npm test -- tests/negotiator

# Contract Reviewer tests
npm test -- tests/contract

# Integration tests
npm test -- tests/integration
```

### Watch Mode

For development, run tests in watch mode:

```bash
npx vitest watch
```

## Application-Centric Architecture

All tools now require application selection first. This ensures:

1. **Context Awareness**: Each tool knows which job you're working on
2. **Intelligence Continuity**: Data flows from previous steps (CV → Interview → Negotiation → Contract)
3. **Back Navigation**: Returns you to the application detail page

### Intelligence Flow

```
Application Created
       ↓
   CV Tailor
   (pulls job_description)
       ↓
 Interview Coach
 (pulls tailored_cv, job_description)
       ↓
   Negotiator
   (pulls salary_range, cv_score, interview_strengths)
       ↓
Contract Reviewer
(pulls negotiated_terms, salary_agreed)
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

### Interview Coach Application-Centric Flow

1. **Application Selection Required**
   - Navigate to `/interview`
   - Verify application selector is shown
   - Select an application to proceed

2. **Intelligence Continuity**
   - If application has tailored CV, verify "Tailored CV Ready" indicator
   - Verify CV score is displayed
   - Verify global insights (if any) are shown

3. **Context Passing**
   - Start interview wizard
   - Verify company name and position are pre-filled

### Negotiator Application-Centric Flow

1. **Application Priority**
   - Navigate to `/compensation`
   - Verify applications with offers are shown first
   - Verify "Has Offer" badge on relevant applications

2. **Intelligence Aggregation**
   - Select an application with tailored CV
   - Verify CV score is shown as leverage
   - If interview completed, verify strengths are shown

### Contract Reviewer Application-Centric Flow

1. **Application Selection**
   - Navigate to `/contract`
   - Verify accepted/offer applications are prioritized
   - Select an application to upload contract

2. **Terms Verification**
   - If negotiation completed, verify agreed terms are listed
   - Verify "We'll Check For" section shows negotiated salary

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

## Test Coverage Summary

### Dashboard Tests
| Category | Tests |
|----------|-------|
| R - Routing | Card navigation, Quick Actions links |
| A - API | job_applications, base_cvs field names |
| L - Logic | Metric calculations, status filtering |
| P - Parameters | User context, query filters |
| H - Handling | Empty states, loading states |

### CV Tailor Tests
| Category | Tests |
|----------|-------|
| R - Routing | Back URL construction, returnTo handling |
| A - API | job_applications, base_cvs, cv_tailoring_sessions fields |
| L - Logic | Null handling, CV detection, JD population |
| P - Parameters | application_id flow, API request body |
| H - Handling | Empty states, no CV warning, canSubmit validation |

### Interview Coach Tests
| Category | Tests |
|----------|-------|
| R - Routing | Application-based navigation |
| A - API | cv_tailoring_sessions, global_user_insights fields |
| L - Logic | Tailored CV detection, context passing |
| P - Parameters | Company context, global insights |
| H - Handling | Empty states, missing CV warning |

### Negotiator Tests
| Category | Tests |
|----------|-------|
| R - Routing | Application-based navigation |
| A - API | interview_sessions, salary fields |
| L - Logic | Offer prioritization, intelligence aggregation |
| P - Parameters | CV achievements, interview strengths |
| H - Handling | Missing intelligence, offer detection |

### Contract Reviewer Tests
| Category | Tests |
|----------|-------|
| R - Routing | Application-based navigation |
| A - API | negotiation_sessions, global_user_insights fields |
| L - Logic | Terms verification, priority sorting |
| P - Parameters | Negotiated terms, red flag detection |
| H - Handling | Missing data, salary formatting |

## Continuous Integration

Tests are automatically run on:
- Pull request creation
- Push to main branch

Failed tests will block merge until resolved.
