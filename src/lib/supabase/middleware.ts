/**
 * Supabase Middleware Client
 *
 * Used in Next.js middleware to refresh auth tokens and handle session.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

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

  // Protected routes check
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')
  const isOnboardingPage = request.nextUrl.pathname.startsWith('/onboarding')
  const isProtectedPage = request.nextUrl.pathname.startsWith('/companion') ||
                          request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/applications') ||
                          request.nextUrl.pathname.startsWith('/cv') ||
                          request.nextUrl.pathname.startsWith('/interview') ||
                          request.nextUrl.pathname.startsWith('/settings') ||
                          request.nextUrl.pathname.startsWith('/jobs')

  // Redirect unauthenticated users to login
  if (!user && (isProtectedPage || isOnboardingPage)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
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

  // Check onboarding status for authenticated users on protected pages
  if (user && isProtectedPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    // Redirect to onboarding if not completed
    if (profile && !profile.onboarding_completed) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  // Redirect already onboarded users away from onboarding page
  if (user && isOnboardingPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, user_type')
      .eq('id', user.id)
      .single()

    if (profile && profile.onboarding_completed) {
      const url = request.nextUrl.clone()
      url.pathname = profile.user_type === 'recruiter' ? '/jobs' : '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
