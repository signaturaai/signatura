-- ============================================================================
-- SIGNATURA: PROFILES TABLE RLS POLICIES
-- Enables Row Level Security on profiles table and adds policies for
-- authenticated users to manage their own profile data.
-- ============================================================================
-- CRITICAL FIX: Users could not INSERT/UPDATE their own profiles during
-- signup and onboarding because RLS was enabled but policies were missing.
-- ============================================================================

-- ============================================================================
-- PART 1: Ensure RLS is enabled on profiles table
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Drop existing policies (if any) to avoid conflicts
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;

-- ============================================================================
-- PART 3: Create policies for authenticated users
-- ============================================================================

-- SELECT: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- INSERT: Users can create their own profile (id must match their auth.uid())
-- This is CRITICAL for the signup flow to work!
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can delete their own profile (for account deletion)
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- PART 4: Admin policies
-- ============================================================================

-- Admins can view all profiles (for admin dashboard)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.is_admin = true
    )
  );

-- ============================================================================
-- PART 5: Verification
-- ============================================================================

SELECT 'RLS enabled on profiles: ' ||
  CASE WHEN relrowsecurity THEN 'YES' ELSE 'NO' END
FROM pg_class
WHERE relname = 'profiles';

SELECT 'Policies on profiles table:' AS status;
SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
