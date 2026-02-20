/**
 * Email Unsubscribe API
 *
 * GET /api/job-search/unsubscribe - Handles email unsubscribe requests
 *
 * Validates the token from email unsubscribe links and disables
 * email notifications for the user.
 *
 * Query params: token (base64url encoded JSON with userId)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ============================================================================
// Types
// ============================================================================

interface UnsubscribeToken {
  userId: string
  action: 'unsubscribe'
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Extract and validate token
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return createErrorPage('Missing unsubscribe token')
    }

    // 2. Decode and validate token structure
    let tokenData: UnsubscribeToken
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8')
      tokenData = JSON.parse(decoded) as UnsubscribeToken

      if (!tokenData.userId || tokenData.action !== 'unsubscribe') {
        throw new Error('Invalid token structure')
      }
    } catch {
      return createErrorPage('Invalid unsubscribe token')
    }

    const { userId } = tokenData
    const serviceSupabase = createServiceClient()

    // 3. Verify user exists
    const { data: userData, error: userError } = await serviceSupabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      return createErrorPage('User not found')
    }

    // 4. Update preferences to disable email notifications
    const { error: updateError } = await serviceSupabase
      .from('job_search_preferences')
      .update({
        email_notification_frequency: 'disabled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('[Unsubscribe] Failed to update preferences:', updateError)
      return createErrorPage('Failed to update preferences')
    }

    console.log(`[Unsubscribe] User ${userId} unsubscribed from email notifications`)

    // 5. Return success page
    return createSuccessPage()
  } catch (error) {
    console.error('[Unsubscribe] Error in GET:', error)
    return createErrorPage('An unexpected error occurred')
  }
}

// ============================================================================
// HTML Page Builders
// ============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.signatura.ai'

function createSuccessPage(): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Signatura</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      background: white;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      background: #111827;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
    }
    .link {
      display: block;
      margin-top: 16px;
      color: #2563eb;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✓</div>
    <h1>You've been unsubscribed</h1>
    <p>
      You will no longer receive job match digest emails from Signatura.
      You can re-enable notifications anytime in your settings.
    </p>
    <a href="${APP_URL}/settings/notifications" class="button">
      Manage Preferences
    </a>
    <a href="${APP_URL}" class="link">
      Return to Signatura
    </a>
  </div>
</body>
</html>
  `.trim()

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

function createErrorPage(message: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error — Signatura</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      background: white;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    p {
      color: #6b7280;
      font-size: 16px;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .error {
      background: #fef2f2;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: #111827;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Unable to Unsubscribe</h1>
    <div class="error">${message}</div>
    <p>
      Please try again or manage your notification preferences directly in your account settings.
    </p>
    <a href="${APP_URL}/settings/notifications" class="button">
      Manage Preferences
    </a>
  </div>
</body>
</html>
  `.trim()

  return new NextResponse(html, {
    status: 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
