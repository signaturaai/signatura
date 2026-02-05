/**
 * Dashboard Layout
 *
 * Main layout for authenticated users.
 * Includes navigation and the persistent global overlay (FABs + Siggy).
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { GlobalOverlay } from '@/components/global'

/**
 * Get display name using fallback chain:
 * 1. profile.full_name (from database)
 * 2. user.user_metadata.full_name (from auth metadata during signup)
 * 3. user.email (last resort)
 */
function getDisplayName(
  profile: { full_name: string | null } | null,
  user: { user_metadata?: { full_name?: string }; email?: string }
): string {
  // 1. Try profile from database
  if (profile?.full_name) {
    return profile.full_name
  }

  // 2. Try auth metadata (set during signup)
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name
  }

  // 3. Fall back to email
  return user.email || 'User'
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Try to get user profile from user_profiles table
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, profile_image, current_streak')
    .eq('id', user.id)
    .single() as { data: { full_name: string | null; profile_image: string | null; current_streak: number } | null }

  // Also try profiles table (used by signup) as fallback
  let profileFromProfiles = null
  if (!profile?.full_name) {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single() as { data: { full_name: string | null; avatar_url: string | null } | null }
    profileFromProfiles = data
  }

  // Use fallback chain for display name
  const combinedProfile = {
    full_name: profile?.full_name || profileFromProfiles?.full_name || null,
  }
  const userName = getDisplayName(combinedProfile, user)
  const streak = (profile?.current_streak as number) || 0
  const profileImage = profile?.profile_image || profileFromProfiles?.avatar_url || null

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <DashboardNav
        user={{
          name: userName,
          email: user.email || '',
          image: profileImage,
        }}
      />

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Global Overlay: FABs + Siggy AI Companion */}
      <GlobalOverlay
        userId={user.id}
        userName={userName}
        streak={streak}
      />
    </div>
  )
}
