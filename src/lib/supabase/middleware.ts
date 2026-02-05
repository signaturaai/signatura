/**
 * Supabase Middleware Client
 *
 * Used in Next.js middleware to refresh auth tokens and handle session.
 * CRITICAL: Enforces onboarding completion before dashboard access.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Check if onboarding is completed by checking both profiles tables.
 * Returns true only if onboarding_completed === true in either table.
 */
async function isOnboardingCompleted(
  supabase: ReturnType<typeof createServerClient<Database>>,
  userId: string
): Promise<{ completed: boolean; userType: string | null }> {
  // Check profiles table first (used by signup)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('onboarding_completed, user_type')
    .eq('id', userId)
    .single()

  const profile = profileData as unknown as {
    onboarding_completed: boolean | null
    user_type: string | null
  } | null

  if (profile?.onboarding_completed === true) {
    return { completed: true, userType: profile.user_type }
  }

  // Also check user_profiles table as fallback
  const { data: userProfileData } = await supabase
    .from('user_profiles')
    .select('onboarding_completed, user_type')
    .eq('id', userId)
    .single()

  const userProfile = userProfileData as unknown as {
    onboarding_completed: boolean | null
    user_type: string | null
  } | null

  if (userProfile?.onboarding_completed === true) {
    return { completed: true, userType: userProfile.user_type || profile?.user_type }
  }

  // Not completed in either table
  return { completed: false, userType: profile?.user_type || userProfile?.user_type || null }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Route classification
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isOnboardingPage = pathname.startsWith('/onboarding')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicPage = pathname === '/' || pathname.startsWith('/privacy') || pathname.startsWith('/terms')

  // Protected routes - ALL dashboard routes require onboarding completion
  const isProtectedPage = pathname.startsWith('/companion') ||
                          pathname.startsWith('/dashboard') ||
                          pathname.startsWith('/applications') ||
                          pathname.startsWith('/cv') ||
                          pathname.startsWith('/interview') ||
                          pathname.startsWith('/compensation') ||
                          pathname.startsWith('/contract') ||
                          pathname.startsWith('/settings') ||
                          pathname.startsWith('/jobs')

  // Redirect unauthenticated users to login (except for public/api routes)
  if (!user && (isProtectedPage || isOnboardingPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    const redirect = request.nextUrl.searchParams.get('redirect')
    url.pathname = redirect || '/dashboard'
    url.searchParams.delete('redirect')
    return NextResponse.redirect(url)
  }

  // CRITICAL: Check onboarding status for authenticated users on protected pages
  // This MUST redirect if profile doesn't exist OR onboarding is not completed
  if (user && isProtectedPage) {
    const { completed } = await isOnboardingCompleted(supabase, user.id)

    // Redirect to onboarding if NOT completed (catches missing profiles too!)
    if (!completed) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Redirect already onboarded users away from onboarding page
  if (user && isOnboardingPage) {
    const { completed, userType } = await isOnboardingCompleted(supabase, user.id)

    if (completed) {
      const url = request.nextUrl.clone()
      url.pathname = userType === 'recruiter' ? '/jobs' : '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
