/**
 * Single Application API
 *
 * GET /api/applications/[id] - Get a specific application
 * PATCH /api/applications/[id] - Update an application
 * DELETE /api/applications/[id] - Delete an application
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type JobApplicationUpdate = Database['public']['Tables']['job_applications']['Update']

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: application, error: fetchError } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      throw fetchError
    }

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error) {
    console.error('Error in GET /api/applications/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Build typed update object with field mapping
    const updates: JobApplicationUpdate = {}

    // Direct fields that match the database schema
    if ('company_name' in body) updates.company_name = body.company_name
    if ('position_title' in body) updates.position_title = body.position_title
    if ('job_description' in body) updates.job_description = body.job_description
    if ('job_url' in body) updates.job_url = body.job_url
    if ('notes' in body) updates.notes = body.notes
    if ('location' in body) updates.location = body.location

    // Mapped fields (API uses different names than database)
    if ('status' in body) updates.application_status = body.status
    if ('application_status' in body) updates.application_status = body.application_status
    if ('excitement_level' in body) updates.user_excitement_level = body.excitement_level
    if ('user_excitement_level' in body) updates.user_excitement_level = body.user_excitement_level
    if ('priority' in body) updates.priority_level = body.priority
    if ('priority_level' in body) updates.priority_level = body.priority_level

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Type assertion needed due to Supabase client/types mismatch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: application, error: updateError } = await (supabase
      .from('job_applications') as any)
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      throw updateError
    }

    return NextResponse.json({
      success: true,
      application,
    })
  } catch (error) {
    console.error('Error in PATCH /api/applications/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Error in DELETE /api/applications/[id]:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
