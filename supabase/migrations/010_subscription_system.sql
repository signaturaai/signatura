-- Migration: Subscription System
-- Description: Creates tables for subscription management, usage tracking,
--              and billing integration with Grow payment processor.
--
-- CRITICAL DESIGN PRINCIPLES:
-- 1. Kill Switch: System ships DORMANT (SUBSCRIPTION_ENABLED=false by default)
--    When false: all users have unlimited access. When true: limits enforced.
-- 2. Silent Tracking: Usage counters increment from deployment onward, regardless
--    of kill switch state. Legacy data is NEVER counted.
-- 3. tier=NULL means "tracking-only user who hasn't subscribed yet"
-- 4. Upgrades are IMMEDIATE (counters NOT reset, period dates NOT changed)
-- 5. Downgrades are SCHEDULED for end of billing cycle
-- 6. Reset prevention: check last_reset_at >= current_period_start before resetting

-- ============================================================================
-- PART 1: Create user_subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription identity (NULL = tracking-only, no plan chosen yet)
    tier TEXT CHECK (tier IS NULL OR tier IN ('momentum', 'accelerate', 'elite')),
    billing_period TEXT CHECK (billing_period IS NULL OR billing_period IN ('monthly', 'quarterly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),

    -- Grow payment fields
    grow_transaction_token TEXT,
    grow_recurring_id TEXT,
    grow_last_transaction_code TEXT,

    -- Morning invoice fields
    morning_customer_id TEXT,

    -- Billing period dates (NULL until user subscribes)
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,

    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancellation_effective_at TIMESTAMPTZ,

    -- Scheduled changes (applied at next renewal)
    scheduled_tier_change TEXT,
    scheduled_billing_period_change TEXT,

    -- Pending (awaiting payment confirmation from Grow webhook)
    pending_tier TEXT,
    pending_billing_period TEXT,

    -- Usage counters (tracked from deployment, reset on subscription/renewal — NOT on upgrade)
    usage_applications INTEGER NOT NULL DEFAULT 0,
    usage_cvs INTEGER NOT NULL DEFAULT 0,
    usage_interviews INTEGER NOT NULL DEFAULT 0,
    usage_compensation INTEGER NOT NULL DEFAULT 0,
    usage_contracts INTEGER NOT NULL DEFAULT 0,
    usage_ai_avatar_interviews INTEGER NOT NULL DEFAULT 0,

    -- Reset tracking: updated ONLY when counters are zeroed (new sub, renewal, period rollover)
    -- NOT updated on mid-cycle upgrades. Used to prevent double-resets.
    last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id)
);

-- ============================================================================
-- PART 2: Create subscription_events table (audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    tier TEXT,
    billing_period TEXT,
    amount NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    grow_transaction_code TEXT,
    morning_document_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 3: Create usage_monthly_snapshots table (permanent historical record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_monthly_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month DATE NOT NULL,  -- always 1st of month: '2026-01-01', '2026-02-01'
    applications INTEGER NOT NULL DEFAULT 0,
    cvs INTEGER NOT NULL DEFAULT 0,
    interviews INTEGER NOT NULL DEFAULT 0,
    compensation INTEGER NOT NULL DEFAULT 0,
    contracts INTEGER NOT NULL DEFAULT 0,
    ai_avatar_interviews INTEGER NOT NULL DEFAULT 0,
    tier_at_snapshot TEXT,
    billing_period_at_snapshot TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT usage_monthly_snapshots_user_month_key UNIQUE (user_id, month)
);

-- ============================================================================
-- PART 4: Create updated_at triggers
-- ============================================================================

-- Trigger for user_subscriptions
DROP TRIGGER IF EXISTS set_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER set_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Trigger for usage_monthly_snapshots
DROP TRIGGER IF EXISTS set_usage_monthly_snapshots_updated_at ON public.usage_monthly_snapshots;
CREATE TRIGGER set_usage_monthly_snapshots_updated_at
    BEFORE UPDATE ON public.usage_monthly_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- PART 5: Create indexes for performance
-- ============================================================================

-- user_subscriptions indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
    ON public.user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status
    ON public.user_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier
    ON public.user_subscriptions(tier);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end
    ON public.user_subscriptions(current_period_end)
    WHERE current_period_end IS NOT NULL;

-- subscription_events indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_created
    ON public.subscription_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type
    ON public.subscription_events(event_type);

-- usage_monthly_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_usage_monthly_snapshots_user
    ON public.usage_monthly_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_monthly_snapshots_user_month
    ON public.usage_monthly_snapshots(user_id, month DESC);

-- ============================================================================
-- PART 6: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: RLS Policies for user_subscriptions
-- Users can SELECT their own row. Only service_role can INSERT/UPDATE/DELETE.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscription"
    ON public.user_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypass (for backend operations)
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.user_subscriptions;
CREATE POLICY "Service role full access to subscriptions"
    ON public.user_subscriptions FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PART 8: RLS Policies for subscription_events
-- Users can SELECT their own rows. Only service_role can INSERT.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscription events" ON public.subscription_events;
CREATE POLICY "Users can view own subscription events"
    ON public.subscription_events FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypass (for backend operations)
DROP POLICY IF EXISTS "Service role full access to subscription events" ON public.subscription_events;
CREATE POLICY "Service role full access to subscription events"
    ON public.subscription_events FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PART 9: RLS Policies for usage_monthly_snapshots
-- Users can SELECT their own rows. Only service_role can INSERT/UPDATE.
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own usage snapshots" ON public.usage_monthly_snapshots;
CREATE POLICY "Users can view own usage snapshots"
    ON public.usage_monthly_snapshots FOR SELECT
    USING (auth.uid() = user_id);

-- Service role bypass (for backend operations)
DROP POLICY IF EXISTS "Service role full access to usage snapshots" ON public.usage_monthly_snapshots;
CREATE POLICY "Service role full access to usage snapshots"
    ON public.usage_monthly_snapshots FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PART 10: Auto-create tracking row for new signups
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_subscriptions (user_id, tier, billing_period, status)
    VALUES (NEW.id, NULL, NULL, 'active')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;

-- Create trigger to auto-create subscription row on new user signup
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_subscription();

-- ============================================================================
-- PART 11: Backfill existing users with tracking-only rows
-- All counters start at 0. Legacy data is NEVER counted. Forward-only tracking.
-- ============================================================================

INSERT INTO public.user_subscriptions (user_id, tier, billing_period, status, last_reset_at)
SELECT id, NULL, NULL, 'active', NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PART 12: Helper function to get tier limits
-- Returns the usage limits for a given tier (used by application code)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tier_limits(p_tier TEXT)
RETURNS TABLE (
    applications_limit INTEGER,
    cvs_limit INTEGER,
    interviews_limit INTEGER,
    compensation_limit INTEGER,
    contracts_limit INTEGER,
    ai_avatar_interviews_limit INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE p_tier
            WHEN 'momentum' THEN 8
            WHEN 'accelerate' THEN 15
            WHEN 'elite' THEN -1  -- -1 means unlimited
            ELSE 0  -- NULL tier has 0 limits (blocked when kill switch is ON)
        END AS applications_limit,
        CASE p_tier
            WHEN 'momentum' THEN 8
            WHEN 'accelerate' THEN 15
            WHEN 'elite' THEN -1
            ELSE 0
        END AS cvs_limit,
        CASE p_tier
            WHEN 'momentum' THEN 8
            WHEN 'accelerate' THEN 15
            WHEN 'elite' THEN -1
            ELSE 0
        END AS interviews_limit,
        CASE p_tier
            WHEN 'momentum' THEN 8
            WHEN 'accelerate' THEN 15
            WHEN 'elite' THEN -1
            ELSE 0
        END AS compensation_limit,
        CASE p_tier
            WHEN 'momentum' THEN 8
            WHEN 'accelerate' THEN 15
            WHEN 'elite' THEN -1
            ELSE 0
        END AS contracts_limit,
        CASE p_tier
            WHEN 'momentum' THEN 0
            WHEN 'accelerate' THEN 5
            WHEN 'elite' THEN 10
            ELSE 0
        END AS ai_avatar_interviews_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 13: Helper function to check if user can perform action
-- Returns TRUE if user has remaining quota, FALSE otherwise
-- When SUBSCRIPTION_ENABLED=false, this check is bypassed by application code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_usage_limit(
    p_user_id UUID,
    p_usage_type TEXT  -- 'applications', 'cvs', 'interviews', 'compensation', 'contracts', 'ai_avatar_interviews'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_tier TEXT;
    v_status TEXT;
    v_current_usage INTEGER;
    v_limit INTEGER;
BEGIN
    -- Get user's subscription
    SELECT tier, status INTO v_tier, v_status
    FROM public.user_subscriptions
    WHERE user_id = p_user_id;

    -- No subscription row = not allowed
    IF v_tier IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Not active = not allowed
    IF v_status NOT IN ('active', 'cancelled') THEN
        RETURN FALSE;
    END IF;

    -- Get current usage
    SELECT
        CASE p_usage_type
            WHEN 'applications' THEN usage_applications
            WHEN 'cvs' THEN usage_cvs
            WHEN 'interviews' THEN usage_interviews
            WHEN 'compensation' THEN usage_compensation
            WHEN 'contracts' THEN usage_contracts
            WHEN 'ai_avatar_interviews' THEN usage_ai_avatar_interviews
        END
    INTO v_current_usage
    FROM public.user_subscriptions
    WHERE user_id = p_user_id;

    -- Get limit for tier
    SELECT
        CASE p_usage_type
            WHEN 'applications' THEN applications_limit
            WHEN 'cvs' THEN cvs_limit
            WHEN 'interviews' THEN interviews_limit
            WHEN 'compensation' THEN compensation_limit
            WHEN 'contracts' THEN contracts_limit
            WHEN 'ai_avatar_interviews' THEN ai_avatar_interviews_limit
        END
    INTO v_limit
    FROM public.get_tier_limits(v_tier);

    -- -1 means unlimited
    IF v_limit = -1 THEN
        RETURN TRUE;
    END IF;

    -- Check if under limit
    RETURN v_current_usage < v_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 14: Function to increment usage counter
-- Always increments (silent tracking). Application code handles limit checks.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_usage(
    p_user_id UUID,
    p_usage_type TEXT  -- 'applications', 'cvs', 'interviews', 'compensation', 'contracts', 'ai_avatar_interviews'
)
RETURNS INTEGER AS $$
DECLARE
    v_new_usage INTEGER;
BEGIN
    -- Increment the appropriate counter and return new value
    UPDATE public.user_subscriptions
    SET
        usage_applications = CASE WHEN p_usage_type = 'applications' THEN usage_applications + 1 ELSE usage_applications END,
        usage_cvs = CASE WHEN p_usage_type = 'cvs' THEN usage_cvs + 1 ELSE usage_cvs END,
        usage_interviews = CASE WHEN p_usage_type = 'interviews' THEN usage_interviews + 1 ELSE usage_interviews END,
        usage_compensation = CASE WHEN p_usage_type = 'compensation' THEN usage_compensation + 1 ELSE usage_compensation END,
        usage_contracts = CASE WHEN p_usage_type = 'contracts' THEN usage_contracts + 1 ELSE usage_contracts END,
        usage_ai_avatar_interviews = CASE WHEN p_usage_type = 'ai_avatar_interviews' THEN usage_ai_avatar_interviews + 1 ELSE usage_ai_avatar_interviews END,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING
        CASE p_usage_type
            WHEN 'applications' THEN usage_applications
            WHEN 'cvs' THEN usage_cvs
            WHEN 'interviews' THEN usage_interviews
            WHEN 'compensation' THEN usage_compensation
            WHEN 'contracts' THEN usage_contracts
            WHEN 'ai_avatar_interviews' THEN usage_ai_avatar_interviews
        END
    INTO v_new_usage;

    RETURN COALESCE(v_new_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 15: Function to reset usage counters (called on new subscription/renewal)
-- Includes double-reset prevention: skips if last_reset_at >= current_period_start
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_usage_counters(
    p_user_id UUID,
    p_period_start TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
DECLARE
    v_last_reset TIMESTAMPTZ;
BEGIN
    -- Check for double-reset prevention
    SELECT last_reset_at INTO v_last_reset
    FROM public.user_subscriptions
    WHERE user_id = p_user_id;

    -- If last_reset_at >= period_start, skip reset
    IF v_last_reset IS NOT NULL AND v_last_reset >= p_period_start THEN
        RETURN FALSE;
    END IF;

    -- Reset all counters
    UPDATE public.user_subscriptions
    SET
        usage_applications = 0,
        usage_cvs = 0,
        usage_interviews = 0,
        usage_compensation = 0,
        usage_contracts = 0,
        usage_ai_avatar_interviews = 0,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 16: Grant execute permissions on functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_tier_limits(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_usage_counters(UUID, TIMESTAMPTZ) TO service_role;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
--
-- Summary:
-- - Created user_subscriptions table with usage tracking
-- - Created subscription_events audit log table
-- - Created usage_monthly_snapshots for historical records
-- - Set up RLS policies (users can only see their own data)
-- - Created auto-insert trigger for new user signups
-- - Backfilled existing users with tier=NULL tracking rows
-- - Created helper functions for limit checking and usage tracking
--
-- IMPORTANT: This system ships DORMANT. Set SUBSCRIPTION_ENABLED=true
-- in environment variables to activate subscription enforcement.
-- ============================================================================
