/**
 * Auth Callback Route
 *
 * Handles OAuth and magic link redirects from Supabase.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/companion'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Create user profile if it doesn't exist
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // Create new profile - using type assertion since schema may not be loaded
          await (supabase.from('user_profiles') as any).insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            profile_image: user.user_metadata?.avatar_url || null,
            role: 'candidate',
          })

          // Create default personalization
          await (supabase.from('companion_personalization') as any).insert({
            user_id: user.id,
            preferred_companion_name: 'companion',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          })

          // Create default visibility settings
          await (supabase.from('candidate_visibility_settings') as any).insert({
            user_id: user.id,
            visible_in_talent_pool: false,
            anonymization_level: 'full',
          })
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
