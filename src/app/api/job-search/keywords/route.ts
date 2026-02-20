/**
 * AI Keywords API
 *
 * PATCH /api/job-search/keywords - Add or remove individual keywords from ai_keywords array
 *
 * Request body:
 * {
 *   action: "add" | "remove",
 *   keyword: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================================================
// Types
// ============================================================================

interface KeywordsResponse {
  success: boolean
  keywords?: string[]
  error?: string
}

// ============================================================================
// Validation Schema
// ============================================================================

const KeywordUpdateSchema = z.object({
  action: z.enum(['add', 'remove']),
  keyword: z.string().min(1).max(100),
})

// ============================================================================
// PATCH Handler
// ============================================================================

export async function PATCH(request: NextRequest): Promise<NextResponse<KeywordsResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = KeywordUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json({ success: false, error: `Validation error: ${errors}` }, { status: 400 })
    }

    const { action, keyword } = parseResult.data
    const normalizedKeyword = keyword.trim().toLowerCase()

    const serviceSupabase = createServiceClient()

    // 3. Fetch current preferences
    const { data: prefs, error: fetchError } = await serviceSupabase
      .from('job_search_preferences')
      .select('ai_keywords')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Preferences not found' }, { status: 404 })
      }
      console.error('[Keywords] Failed to fetch preferences:', fetchError)
      return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 })
    }

    // 4. Update keywords array
    const currentKeywords: string[] = prefs.ai_keywords || []
    let updatedKeywords: string[]

    if (action === 'add') {
      // Add keyword if not already present
      if (currentKeywords.map((k) => k.toLowerCase()).includes(normalizedKeyword)) {
        // Keyword already exists, return current state
        return NextResponse.json({
          success: true,
          keywords: currentKeywords,
        })
      }
      updatedKeywords = [...currentKeywords, keyword.trim()]
    } else {
      // Remove keyword (case-insensitive)
      updatedKeywords = currentKeywords.filter(
        (k) => k.toLowerCase() !== normalizedKeyword
      )

      // If no change, return current state
      if (updatedKeywords.length === currentKeywords.length) {
        return NextResponse.json({
          success: true,
          keywords: currentKeywords,
        })
      }
    }

    // 5. Update preferences
    const { error: updateError } = await serviceSupabase
      .from('job_search_preferences')
      .update({
        ai_keywords: updatedKeywords,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[Keywords] Failed to update keywords:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update keywords' }, { status: 500 })
    }

    console.log(`[Keywords] ${action === 'add' ? 'Added' : 'Removed'} keyword "${keyword}" for user ${user.id}`)

    return NextResponse.json({
      success: true,
      keywords: updatedKeywords,
    })
  } catch (error) {
    console.error('[Keywords] Error in PATCH:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
