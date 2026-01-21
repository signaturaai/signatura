/**
 * Consent Logging API
 *
 * POST /api/consent/log - Log a consent action
 * GET /api/consent/log - Get consent history
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ConsentType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'marketing_emails'
  | 'data_processing'
  | 'cookies'
type ConsentAction = 'granted' | 'revoked'

interface ConsentLogRequest {
  consent_type: ConsentType
  action: ConsentAction
  version?: string
}

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

    const body: ConsentLogRequest = await request.json()
    const { consent_type, action, version } = body

    if (!consent_type || !action) {
      return NextResponse.json(
        { error: 'consent_type and action are required' },
        { status: 400 }
      )
    }

    // Validate consent_type
    const validTypes = [
      'privacy_policy',
      'terms_of_service',
      'marketing_emails',
      'data_processing',
      'cookies',
    ]
    if (!validTypes.includes(consent_type)) {
      return NextResponse.json({ error: 'Invalid consent_type' }, { status: 400 })
    }

    // Validate action
    if (!['granted', 'revoked'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // Log consent
    const { error: logError } = await supabase.from('consent_log').insert({
      user_id: user.id,
      consent_type,
      action,
      version: version || null,
      ip_address: ip,
      user_agent: userAgent,
    })

    if (logError) {
      console.error('Error logging consent:', logError)
      throw logError
    }

    // Update profile based on consent type
    const profileUpdates: Record<string, unknown> = {}

    if (consent_type === 'privacy_policy' && action === 'granted') {
      profileUpdates.privacy_policy_accepted_at = new Date().toISOString()
    }

    if (consent_type === 'terms_of_service' && action === 'granted') {
      profileUpdates.terms_accepted_at = new Date().toISOString()
    }

    if (consent_type === 'marketing_emails') {
      profileUpdates.marketing_emails_consent = action === 'granted'
    }

    if (consent_type === 'data_processing') {
      profileUpdates.data_processing_consent = action === 'granted'
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        // Don't fail the request, consent was logged
      }
    }

    return NextResponse.json({
      success: true,
      message: `Consent ${action} for ${consent_type}`,
    })
  } catch (error) {
    console.error('Error logging consent:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log consent' },
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

    const { data: consents, error: fetchError } = await supabase
      .from('consent_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      throw fetchError
    }

    return NextResponse.json({
      success: true,
      consents: consents || [],
    })
  } catch (error) {
    console.error('Error fetching consent log:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch consent log' },
      { status: 500 }
    )
  }
}
