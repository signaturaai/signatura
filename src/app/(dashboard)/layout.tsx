/**
 * Dashboard Layout
 *
 * Main layout for authenticated users.
 * Includes navigation and the companion presence indicator.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/dashboard/nav'
import { CompanionPresence } from '@/components/companion/presence'

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

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, profile_image, current_streak')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <DashboardNav
        user={{
          name: profile?.full_name || user.email || 'User',
          email: user.email || '',
          image: profile?.profile_image,
        }}
      />

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Companion presence indicator */}
      <CompanionPresence
        streak={profile?.current_streak || 0}
      />
    </div>
  )
}
