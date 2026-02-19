/**
 * Applications API
 *
 * POST /api/applications - Create a new job application
 * GET /api/applications - Get all applications for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkUsageLimit, incrementUsage } from '@/lib/subscription/access-control'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // SPLIT PATTERN: Check usage limit first
    const serviceSupabase = createServiceClient()
    const limitCheck = await checkUsageLimit(serviceSupabase, user.id, 'applications')
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'NO_SUBSCRIPTION') {
        return NextResponse.json({ error: 'Subscription required', ...limitCheck }, { status: 402 })
      }
      return NextResponse.json({ error: 'Usage limit reached', ...limitCheck }, { status: 403 })
    }

    const body = await request.json()
    const {
      company_name,
      position_title,
      job_description,
      job_url,
      status = 'preparing',
      excitement_level,
      priority,
      industry,
      source = 'manual',
    } = body

    // Validate required fields
    if (!company_name || typeof company_name !== 'string') {
      return NextResponse.json(
        { error: 'company_name is required' },
        { status: 400 }
      )
    }

    if (!position_title || typeof position_title !== 'string') {
      return NextResponse.json(
        { error: 'position_title is required' },
        { status: 400 }
      )
    }

    if (!job_description || typeof job_description !== 'string') {
      return NextResponse.json(
        { error: 'job_description is required' },
        { status: 400 }
      )
    }

    // Create the application
    // Type assertion needed due to Supabase client/types mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: application, error: insertError } = await (supabase
      .from('job_applications') as any)
      .insert({
        user_id: user.id,
        company_name: company_name.trim(),
        position_title: position_title.trim(),
        job_description: job_description.trim(),
        job_url: job_url || null,
        application_status: status || 'prepared',
        user_excitement_level: excitement_level || null,
        priority_level: priority || 'medium',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating application:', insertError)
      return NextResponse.json(
        { error: 'Failed to create application' },
        { status: 500 }
      )
    }

    // SPLIT PATTERN: Increment usage after successful creation
    await incrementUsage(serviceSupabase, user.id, 'applications')

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error) {
    console.error('Error in POST /api/applications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('job_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data: applications, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching applications:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      applications: applications || [],
    })
  } catch (error) {
    console.error('Error in GET /api/applications:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
