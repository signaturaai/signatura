# Subscription System — Production Setup Guide

## 1. Activation Checklist

The subscription system ships in **dormant mode** by default. All users have unlimited access until you flip the kill switch.

To activate enforcement:

```bash
SUBSCRIPTION_ENABLED=true
NEXT_PUBLIC_SUBSCRIPTION_ENABLED=true
```

Redeploy. That's it — limits, gates, pricing page, and usage badges all activate instantly.

No code changes needed. No feature flags to configure. The entire system reads these two variables at runtime.

## 2. Emergency Deactivation

To instantly roll back to unlimited access:

```bash
SUBSCRIPTION_ENABLED=false
NEXT_PUBLIC_SUBSCRIPTION_ENABLED=false
```

Redeploy. All gates open, all limits removed. **No data is lost** — usage counters continue to be tracked silently in the background. When you re-enable, all historical data is preserved.

## 3. Production API Switch

### Grow (Meshulam) — Payment Processing

| Variable | Sandbox | Production |
|---|---|---|
| `GROW_API_URL` | `https://sandbox.meshulam.co.il/api/light/server/1.0` | `https://api.meshulam.co.il/api/light/server/1.0` |
| `GROW_USER_ID` | Sandbox merchant ID | Production merchant ID |
| `GROW_WEBHOOK_KEY` | Sandbox webhook key | Production webhook key |

### Morning (Green Invoice) — Invoicing

| Variable | Sandbox | Production |
|---|---|---|
| `MORNING_API_URL` | `https://sandbox.d.greeninvoice.co.il/api/v1` | `https://api.greeninvoice.co.il/api/v1` |
| `MORNING_API_KEY` | Sandbox API key | Production API key |
| `MORNING_API_SECRET` | Sandbox API secret | Production API secret |

Update all credentials with production values and redeploy.

## 4. Grow Setup

### Register Webhook URL

In the Grow merchant dashboard, register:

```
https://{your-domain}/api/webhooks/grow
```

The webhook handler is always active (even when the kill switch is OFF) to ensure payment events are never missed.

### Create 9 Recurring Payment Pages

Create one payment page per tier/period combination in Grow:

| Env Variable | Tier | Period |
|---|---|---|
| `GROW_PAGE_CODE_MOMENTUM_MONTHLY` | Momentum | Monthly ($12) |
| `GROW_PAGE_CODE_MOMENTUM_QUARTERLY` | Momentum | Quarterly ($30) |
| `GROW_PAGE_CODE_MOMENTUM_YEARLY` | Momentum | Yearly ($99) |
| `GROW_PAGE_CODE_ACCELERATE_MONTHLY` | Accelerate | Monthly ($18) |
| `GROW_PAGE_CODE_ACCELERATE_QUARTERLY` | Accelerate | Quarterly ($45) |
| `GROW_PAGE_CODE_ACCELERATE_YEARLY` | Accelerate | Yearly ($149) |
| `GROW_PAGE_CODE_ELITE_MONTHLY` | Elite | Monthly ($29) |
| `GROW_PAGE_CODE_ELITE_QUARTERLY` | Elite | Quarterly ($75) |
| `GROW_PAGE_CODE_ELITE_YEARLY` | Elite | Yearly ($249) |

Set each page code as the corresponding environment variable.

## 5. Cron Job

The subscription system requires a daily cron job to process expirations and reconcile usage snapshots.

### Vercel (automatic)

Already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/process-subscriptions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Runs daily at midnight UTC.

### External Cron (e.g., cron-job.org)

If not using Vercel cron, set up an external service to call:

```
GET https://{your-domain}/api/cron/process-subscriptions
Authorization: Bearer {CRON_SECRET}
```

Generate the secret:

```bash
openssl rand -hex 32
```

Set it as `CRON_SECRET` in your environment.

### What the Cron Does

1. **Process Expirations**: Marks cancelled and past_due subscriptions as expired when their grace period ends
2. **Reconcile Snapshots**: Verifies monthly usage snapshots match subscription data, logs warnings for mismatches

## 6. Test Card Numbers

Grow sandbox test cards for development:

| Card Number | Expiry | CVV | Result |
|---|---|---|---|
| `4580000000000000` | Any future date | Any 3 digits | Success |
| `4580000000000001` | Any future date | Any 3 digits | Declined |
| `4580000000000002` | Any future date | Any 3 digits | Error |

Use the sandbox endpoint (`https://sandbox.meshulam.co.il/...`) for testing.

## 7. Database Migration

Run the subscription system migration:

```bash
supabase db push
```

This applies `supabase/migrations/010_subscription_system.sql`, which creates:

- **`user_subscriptions`** — Subscription state, 6 usage counters, payment gateway references
- **`subscription_events`** — Audit log for all subscription lifecycle events
- **`usage_monthly_snapshots`** — Historical usage data per month
- Row Level Security policies (users can only read their own data)
- Helper RPC functions (`upsert_usage_snapshot`)
- Indexes on user_id, status, month columns

## 8. File Manifest

### New Files

#### Core Library (`src/lib/subscription/`)

| File | Purpose |
|---|---|
| `index.ts` | Barrel export |
| `config.ts` | Tiers, kill switch, pricing, limits, helpers |
| `grow-adapter.ts` | Grow (Meshulam) payment gateway — 9 page codes, recurring payments, one-time charges for prorated upgrades |
| `morning-adapter.ts` | Morning (Green Invoice) — USD invoicing, credit invoices |
| `subscription-manager.ts` | Lifecycle: activate, renew, upgrade (prorated), downgrade (scheduled), cancel |
| `access-control.ts` | Feature gating, usage limits, increment (split pattern), silent tracking |
| `recommendation-engine.ts` | Monthly usage averages, tier recommendation algorithm |

#### Types

| File | Purpose |
|---|---|
| `src/types/subscription.ts` | SubscriptionTier, BillingPeriod, SubscriptionStatus, TierLimits, TierFeatures |

#### API Routes — Subscription (`src/app/api/subscription/`)

| File | Purpose |
|---|---|
| `status/route.ts` | GET subscription status (tier, usage, features, UI flags) |
| `initiate/route.ts` | POST initiate payment flow via Grow |
| `cancel/route.ts` | POST cancel subscription (effective at period end) |
| `change-plan/route.ts` | POST upgrade (prorated) / downgrade (scheduled) / cancel change |
| `check-access/route.ts` | POST check feature access by tier |
| `check-limit/route.ts` | POST check usage limit for resource |
| `increment-usage/route.ts` | POST increment usage counter |
| `recommendation/route.ts` | GET tier recommendation based on usage |
| `trends/route.ts` | GET usage trends from monthly snapshots |

#### API Routes — Webhooks & Cron

| File | Purpose |
|---|---|
| `src/app/api/webhooks/grow/route.ts` | POST Grow payment webhook — always active, handles activation/renewal, triggers Morning invoicing |
| `src/app/api/cron/process-subscriptions/route.ts` | GET daily cron — expiration processing, snapshot reconciliation |

#### React Hook

| File | Purpose |
|---|---|
| `src/hooks/useSubscription.ts` | Client-side hook for subscription data (status, usage, features) |

#### UI Components (`src/components/subscription/`)

| File | Purpose |
|---|---|
| `index.ts` | Barrel export |
| `FeatureGate.tsx` | Conditionally render children based on feature access |
| `UsageBadge.tsx` | Progress bar showing usage vs limit |
| `UpgradePrompt.tsx` | Modal shown when usage limit reached |
| `SubscriptionGuard.tsx` | Page-level subscription protection wrapper |

#### Pages

| File | Purpose |
|---|---|
| `src/app/(dashboard)/pricing/page.tsx` | Tier comparison with pricing cards |
| `src/app/(dashboard)/subscription/success/page.tsx` | Post-payment confirmation with status polling |
| `src/app/(dashboard)/settings/subscription/page.tsx` | Subscription management (usage, billing, cancel) |

#### Database & Deployment

| File | Purpose |
|---|---|
| `supabase/migrations/010_subscription_system.sql` | 3 tables, indexes, RLS policies, RPC functions |
| `vercel.json` | Cron schedule configuration |

### Modified Files

#### Dashboard Pages (added UsageBadge + UpgradePrompt)

| File | Change |
|---|---|
| `src/app/(dashboard)/applications/page.tsx` | UsageBadge, UpgradePrompt, 402/403 handling |
| `src/app/(dashboard)/cv/page.tsx` | UsageBadge, UpgradePrompt, 402/403 handling |
| `src/app/(dashboard)/interview/page.tsx` | UsageBadge, UpgradePrompt, 402/403 handling |
| `src/app/(dashboard)/compensation/page.tsx` | UsageBadge, UpgradePrompt, 402/403 handling |
| `src/app/(dashboard)/contract/page.tsx` | UsageBadge, UpgradePrompt, 402/403 handling |

#### Components (added FeatureGate wrapping)

| File | Change |
|---|---|
| `src/components/companion/dashboard.tsx` | FeatureGate wrapping CompanionChat for aiAvatarInterviews |
| `src/components/applications/NewApplicationWizard.tsx` | onLimitReached callback, 402/403 error handling |

#### API Routes (added SPLIT PATTERN: check limit → create → increment)

| File | Change |
|---|---|
| `src/app/api/applications/route.ts` | checkUsageLimit + incrementUsage, 402/403 responses |
| `src/app/api/cv/tailor/route.ts` | checkUsageLimit + incrementUsage, 402/403 responses |
| `src/app/api/interview/generate-plan/route.ts` | checkUsageLimit + incrementUsage, 402/403 responses |
| `src/app/api/compensation/generate-strategy/route.ts` | checkUsageLimit + incrementUsage, 402/403 responses |
| `src/app/api/contract/analyze/route.ts` | checkUsageLimit + incrementUsage, 402/403 responses |
| `src/app/api/companion/chat/route.ts` | checkFeatureAccess + checkUsageLimit + incrementUsage, 402/403 responses |

### Test Files

#### Subscription Library Tests (`tests/subscription/`)

| File | Tests |
|---|---|
| `types.test.ts` | Type definitions validation |
| `schema.test.ts` | Database schema structure |
| `cross-validation.test.ts` | SQL-TS-Config drift detection |
| `config.test.ts` | Tier configs, pricing, kill switch, helpers (195 tests) |
| `env.test.ts` | Environment variable validation |
| `grow-adapter.test.ts` | Grow API calls, payments, webhooks |
| `morning-adapter.test.ts` | Morning auth, customers, invoices |
| `subscription-manager.test.ts` | Lifecycle operations, business rules (62 tests) |
| `access-control.test.ts` | Feature access, usage limits, status (69 tests) |
| `recommendation-engine.test.ts` | Usage averages, tier recommendations |
| `analytics.test.ts` | Phase 14 spec analytics tests (21 tests) |

#### API Tests

| File | Tests |
|---|---|
| `tests/api/webhooks/grow/route.test.ts` | Webhook verification, activation, renewal |
| `tests/api/subscription/routes.test.ts` | All 9 subscription endpoints |
| `tests/api/cron/process-subscriptions.test.ts` | Cron auth, expiration, reconciliation |

#### Integration Tests (SPLIT PATTERN)

| File | Tests |
|---|---|
| `tests/api/applications/subscription-integration.test.ts` | 402/403, usage increment |
| `tests/api/cv/tailor-subscription-integration.test.ts` | 402/403, usage increment |
| `tests/api/interview/subscription-integration.test.ts` | 402/403, usage increment |
| `tests/api/compensation/subscription-integration.test.ts` | 402/403, usage increment |
| `tests/api/contract/subscription-integration.test.ts` | 402/403, usage increment |
| `tests/api/companion/subscription-integration.test.ts` | Feature + usage checks |

#### UI & Page Tests

| File | Tests |
|---|---|
| `tests/hooks/useSubscription.test.ts` | Hook logic, API interactions |
| `tests/components/subscription/subscription-components.test.ts` | FeatureGate, UsageBadge, UpgradePrompt |
| `tests/pages/pricing.test.ts` | Tier configs, pricing calculations |
| `tests/pages/subscription-settings.test.ts` | Progress bars, trends, actions |
| `tests/pages/subscription-success.test.ts` | Polling behavior, tier display |
| `tests/pages/dashboard-subscription-integration.test.ts` | Dashboard page integration (33 tests) |

## 9. Environment Variables — Complete Reference

```bash
# Kill Switch (both required for full activation)
SUBSCRIPTION_ENABLED=false
NEXT_PUBLIC_SUBSCRIPTION_ENABLED=false

# Grow (Meshulam) Payment Gateway
GROW_API_URL=https://sandbox.meshulam.co.il/api/light/server/1.0
GROW_USER_ID=
GROW_WEBHOOK_KEY=
GROW_PAGE_CODE_MOMENTUM_MONTHLY=
GROW_PAGE_CODE_MOMENTUM_QUARTERLY=
GROW_PAGE_CODE_MOMENTUM_YEARLY=
GROW_PAGE_CODE_ACCELERATE_MONTHLY=
GROW_PAGE_CODE_ACCELERATE_QUARTERLY=
GROW_PAGE_CODE_ACCELERATE_YEARLY=
GROW_PAGE_CODE_ELITE_MONTHLY=
GROW_PAGE_CODE_ELITE_QUARTERLY=
GROW_PAGE_CODE_ELITE_YEARLY=

# Morning (Green Invoice) Invoicing
MORNING_API_URL=https://sandbox.d.greeninvoice.co.il/api/v1
MORNING_API_KEY=
MORNING_API_SECRET=

# Cron Job Secret
CRON_SECRET=
```

## 10. Tier Limits Quick Reference

| Resource | Momentum | Accelerate | Elite |
|---|---|---|---|
| Applications | 8 | 15 | Unlimited |
| Tailored CVs | 8 | 15 | Unlimited |
| Interview Plans | 8 | 15 | Unlimited |
| Compensation Sessions | 8 | 15 | Unlimited |
| Contract Reviews | 8 | 15 | Unlimited |
| AI Avatar Interviews | 0 | 5 | 10 |

## 11. Pricing Quick Reference

| Tier | Monthly | Quarterly | Yearly |
|---|---|---|---|
| Momentum | $12/mo | $30/qtr ($10/mo) | $99/yr ($8.25/mo) |
| Accelerate | $18/mo | $45/qtr ($15/mo) | $149/yr ($12.42/mo) |
| Elite | $29/mo | $75/qtr ($25/mo) | $249/yr ($20.75/mo) |

## 12. Architecture Notes

### Kill Switch Behavior

- **OFF** (`SUBSCRIPTION_ENABLED=false`): All features allowed, all limits unlimited, usage still tracked silently
- **ON** (`SUBSCRIPTION_ENABLED=true`): Enforcement active — feature gates, usage limits, 402/403 responses

### SPLIT PATTERN (API Routes)

Every resource-creating API route follows this pattern:
1. Check usage limit (`checkUsageLimit`)
2. Return 402 (NO_SUBSCRIPTION) or 403 (LIMIT_REACHED) if denied
3. Create the resource
4. Increment usage counter (`incrementUsage`)
5. Return success

### Business Rules

- **Upgrades**: Immediate — tier changes instantly, counters NOT reset, period dates NOT changed, prorated charge calculated
- **Downgrades**: Scheduled — takes effect at end of billing period via `renewSubscription`
- **Cancellation**: Effective at period end — user retains access until `cancellation_effective_at`
- **Double-reset prevention**: `renewSubscription` checks `last_reset_at >= current_period_start` before resetting counters
- **Grace period**: 3 days for past_due subscriptions before access is revoked
