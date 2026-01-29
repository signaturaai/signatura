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

  // Get user profile (type assertion since tables may not exist yet)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, profile_image, current_streak')
    .eq('id', user.id)
    .single() as { data: { full_name: string | null; profile_image: string | null; current_streak: number } | null }

  const userName = (profile?.full_name as string) || user.email || 'User'
  const streak = (profile?.current_streak as number) || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <DashboardNav
        user={{
          name: userName,
          email: user.email || '',
          image: profile?.profile_image as string | null,
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
