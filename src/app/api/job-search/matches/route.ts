/**
 * Job Matches API
 *
 * GET /api/job-search/matches - Returns user's current job matches for display
 *
 * Query parameters:
 * - limit: Number of jobs to return (default 10, max 20)
 * - offset: Pagination offset (default 0)
 * - status: Optional filter ("new", "viewed", "liked")
 *
 * Returns jobs with match_score >= 75, excluding dismissed and applied jobs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { JobPostingRow, JobPostingStatus } from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

interface MatchesResponse {
  jobs: JobPostingRow[]
  total: number
  hasMore: boolean
  lastSearchAt: string | null
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 20
const MIN_MATCH_SCORE = 75
const VALID_STATUSES: JobPostingStatus[] = ['new', 'viewed', 'liked']

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<MatchesResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { jobs: [], total: 0, hasMore: false, lastSearchAt: null, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    let limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)
    let offset = parseInt(searchParams.get('offset') || '0', 10)
    const statusFilter = searchParams.get('status') as JobPostingStatus | null

    // Validate limit
    if (isNaN(limit) || limit < 1) {
      limit = DEFAULT_LIMIT
    } else if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT
    }

    // Validate offset
    if (isNaN(offset) || offset < 0) {
      offset = 0
    }

    // Validate status filter
    if (statusFilter && !VALID_STATUSES.includes(statusFilter)) {
      return NextResponse.json(
        {
          jobs: [],
          total: 0,
          hasMore: false,
          lastSearchAt: null,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Use service client for queries (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // 3. Get last_search_at from preferences
    const { data: prefsData } = await serviceSupabase
      .from('job_search_preferences')
      .select('last_search_at')
      .eq('user_id', user.id)
      .single()

    const lastSearchAt = prefsData?.last_search_at || null

    // 4. Build the query for job postings
    // Base conditions:
    // - user_id = current user
    // - status IN ('new', 'viewed', 'liked')
    // - match_score >= 75
    // - (discarded_until IS NULL OR discarded_until < now())
    const now = new Date().toISOString()

    // Build count query first (for total)
    let countQuery = serviceSupabase
      .from('job_postings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('match_score', MIN_MATCH_SCORE)

    // Add status filter
    if (statusFilter) {
      countQuery = countQuery.eq('status', statusFilter)
    } else {
      countQuery = countQuery.in('status', VALID_STATUSES)
    }

    // Handle discarded_until (null OR < now)
    // Using or() filter for discarded_until
    countQuery = countQuery.or(`discarded_until.is.null,discarded_until.lt.${now}`)

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('[JobMatches] Count query error:', countError)
      return NextResponse.json(
        { jobs: [], total: 0, hasMore: false, lastSearchAt, error: 'Failed to count matches' },
        { status: 500 }
      )
    }

    const total = count || 0

    // If no results, return early
    if (total === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        hasMore: false,
        lastSearchAt,
      })
    }

    // 5. Build data query with ordering and pagination
    let dataQuery = serviceSupabase
      .from('job_postings')
      .select('*')
      .eq('user_id', user.id)
      .gte('match_score', MIN_MATCH_SCORE)

    // Add status filter
    if (statusFilter) {
      dataQuery = dataQuery.eq('status', statusFilter)
    } else {
      dataQuery = dataQuery.in('status', VALID_STATUSES)
    }

    // Handle discarded_until
    dataQuery = dataQuery.or(`discarded_until.is.null,discarded_until.lt.${now}`)

    // Order by match_score DESC, then discovered_at DESC
    dataQuery = dataQuery
      .order('match_score', { ascending: false })
      .order('discovered_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: jobs, error: dataError } = await dataQuery

    if (dataError) {
      console.error('[JobMatches] Data query error:', dataError)
      return NextResponse.json(
        { jobs: [], total: 0, hasMore: false, lastSearchAt, error: 'Failed to fetch matches' },
        { status: 500 }
      )
    }

    // 6. Calculate hasMore
    const hasMore = offset + (jobs?.length || 0) < total

    return NextResponse.json({
      jobs: (jobs as JobPostingRow[]) || [],
      total,
      hasMore,
      lastSearchAt,
    })
  } catch (error) {
    console.error('[JobMatches] Error in GET /api/job-search/matches:', error)
    return NextResponse.json(
      {
        jobs: [],
        total: 0,
        hasMore: false,
        lastSearchAt: null,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
