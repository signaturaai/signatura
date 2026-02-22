/**
 * Email Notification Service
 *
 * Sends job match digest emails to users based on their notification preferences.
 * Uses Resend for email delivery.
 */

import { Resend } from 'resend'
import { getSupabaseAdmin } from './clients'
import type {
  JobPostingRow,
  JobSearchPreferencesRow,
  EmailNotificationFrequency,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

export interface EmailJob {
  title: string
  company_name: string
  location: string | null
  match_score: number
  work_type: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  source_url: string
  id: string
}

export interface SendDigestResult {
  success: boolean
  emailsSent: number
  error?: string
}

interface UserEmailData {
  id: string
  email: string
  full_name: string | null
}

// ============================================================================
// Resend Client (Lazy Initialization)
// ============================================================================

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// ============================================================================
// Constants
// ============================================================================

const FREQUENCY_HOURS: Record<EmailNotificationFrequency, number> = {
  daily: 24,
  weekly: 168, // 7 * 24
  monthly: 720, // 30 * 24
  disabled: 0,
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.signatura.ai'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'jobs@signatura.ai'

// ============================================================================
// Subject Line Builders
// ============================================================================

function getSubjectLine(frequency: EmailNotificationFrequency, count: number): string {
  const month = new Date().toLocaleDateString('en-US', { month: 'long' })

  switch (frequency) {
    case 'daily':
      return `${count} New Job Match${count !== 1 ? 'es' : ''} for You — Signatura`
    case 'weekly':
      return `Your Weekly Job Digest: ${count} New Match${count !== 1 ? 'es' : ''} — Signatura`
    case 'monthly':
      return `${month} Job Market Summary — Signatura`
    default:
      return `${count} New Job Match${count !== 1 ? 'es' : ''} — Signatura`
  }
}

// ============================================================================
// HTML Email Builder
// ============================================================================

function formatSalary(min: number | null, max: number | null, currency: string | null): string {
  if (!min && !max) return 'Not specified'

  const curr = currency || 'USD'
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 0,
  })

  if (min && max) {
    return `${formatter.format(min)} - ${formatter.format(max)}`
  } else if (min) {
    return `${formatter.format(min)}+`
  } else if (max) {
    return `Up to ${formatter.format(max)}`
  }

  return 'Not specified'
}

function buildJobCard(job: EmailJob): string {
  const viewUrl = `${APP_URL}/jobs/${job.id}`
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const location = job.location || 'Location not specified'
  const workType = job.work_type ? job.work_type.charAt(0).toUpperCase() + job.work_type.slice(1) : ''

  return `
    <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h3 style="margin: 0 0 4px 0; color: #111827; font-size: 18px; font-weight: 600;">
            ${job.title}
          </h3>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
            ${job.company_name}
          </p>
        </div>
        <div style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
          ${job.match_score}% Match
        </div>
      </div>
      <div style="margin-top: 12px; color: #374151; font-size: 14px;">
        <p style="margin: 0 0 4px 0;">📍 ${location}${workType ? ` • ${workType}` : ''}</p>
        <p style="margin: 0;">💰 ${salary}</p>
      </div>
      <div style="margin-top: 16px;">
        <a href="${viewUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          View in App
        </a>
        <a href="${job.source_url}" style="display: inline-block; margin-left: 12px; color: #2563eb; font-size: 14px; text-decoration: none;">
          View Original →
        </a>
      </div>
    </div>
  `
}

/**
 * Builds the HTML email content.
 * Exported for testing purposes.
 */
export function buildEmailHtml(
  userName: string | null,
  jobs: EmailJob[],
  frequency: EmailNotificationFrequency,
  unsubscribeUrl: string
): string {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  const jobCount = jobs.length

  let introText: string
  switch (frequency) {
    case 'daily':
      introText = `We found ${jobCount} new job match${jobCount !== 1 ? 'es' : ''} for you today.`
      break
    case 'weekly':
      introText = `Here's your weekly roundup: ${jobCount} new job match${jobCount !== 1 ? 'es' : ''} that fit your profile.`
      break
    case 'monthly':
      introText = `Your monthly job market summary is here with ${jobCount} new match${jobCount !== 1 ? 'es' : ''}.`
      break
    default:
      introText = `We found ${jobCount} new job match${jobCount !== 1 ? 'es' : ''} for you.`
  }

  const jobCards = jobs.slice(0, 5).map(buildJobCard).join('')
  const moreJobsLink = jobs.length > 5
    ? `<p style="text-align: center; margin-top: 16px;">
        <a href="${APP_URL}/jobs" style="color: #2563eb; font-size: 14px;">
          View ${jobs.length - 5} more matches →
        </a>
      </p>`
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Matches — Signatura</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0;">
        Signatura
      </h1>
      <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0 0;">
        Your AI-Powered Career Assistant
      </p>
    </div>

    <!-- Main Content -->
    <div style="background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 16px; margin: 0 0 8px 0;">
        ${greeting}
      </p>
      <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">
        ${introText}
      </p>

      <!-- Job Cards -->
      ${jobCards}

      ${moreJobsLink}

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <a href="${APP_URL}/jobs" style="display: inline-block; background: #111827; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
          View All Matches
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        You're receiving this email because you signed up for job match notifications.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">
          Unsubscribe
        </a>
        or
        <a href="${APP_URL}/settings/notifications" style="color: #6b7280; text-decoration: underline;">
          manage preferences
        </a>
      </p>
      <p style="margin: 16px 0 0 0; color: #9ca3af;">
        © ${new Date().getFullYear()} Signatura. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generates an unsubscribe URL with a signed token.
 */
function generateUnsubscribeUrl(userId: string): string {
  // In production, this should be a signed JWT token
  // For now, we use a simple base64 encoding
  const token = Buffer.from(JSON.stringify({ userId, action: 'unsubscribe' })).toString('base64url')
  return `${APP_URL}/api/job-search/unsubscribe?token=${token}`
}

/**
 * Sends a job match digest email to a user based on their notification frequency.
 */
export async function sendJobMatchDigest(
  userId: string,
  frequency: EmailNotificationFrequency
): Promise<SendDigestResult> {
  if (frequency === 'disabled') {
    return { success: true, emailsSent: 0 }
  }

  const supabase = getSupabaseAdmin()

  // 1. Fetch user's email and name
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single()

  if (userError || !userData) {
    console.error('[EmailNotify] Failed to fetch user:', userError)
    return { success: false, emailsSent: 0, error: 'User not found' }
  }

  // Also get email from auth.users if not in profile
  let userEmail: string | null = (userData as unknown as UserEmailData).email || null
  if (!userEmail) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    userEmail = authUser?.user?.email || null
  }

  if (!userEmail) {
    console.error('[EmailNotify] No email found for user:', userId)
    return { success: false, emailsSent: 0, error: 'No email address' }
  }

  // 2. Fetch preferences to check last_email_sent_at
  const { data: prefsData, error: prefsError } = await supabase
    .from('job_search_preferences')
    .select('last_email_sent_at')
    .eq('user_id', userId)
    .single()

  if (prefsError && prefsError.code !== 'PGRST116') {
    console.error('[EmailNotify] Failed to fetch preferences:', prefsError)
    return { success: false, emailsSent: 0, error: 'Failed to fetch preferences' }
  }

  // Type assertion for preferences data
  const typedPrefsData = (prefsData as unknown) as { last_email_sent_at: string | null } | null

  // 3. Determine time window based on frequency
  const hoursAgo = FREQUENCY_HOURS[frequency]
  const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()

  // 4. Fetch new matches since last email or within frequency window
  const cutoffDate = typedPrefsData?.last_email_sent_at || sinceDate

  const { data: jobsData, error: jobsError } = await supabase
    .from('job_postings')
    .select('id, title, company_name, location, match_score, work_type, salary_min, salary_max, salary_currency, source_url')
    .eq('user_id', userId)
    .gte('match_score', 75)
    .in('status', ['new', 'viewed', 'liked'])
    .gte('discovered_at', cutoffDate)
    .order('match_score', { ascending: false })
    .limit(20)

  if (jobsError) {
    console.error('[EmailNotify] Failed to fetch jobs:', jobsError)
    return { success: false, emailsSent: 0, error: 'Failed to fetch jobs' }
  }

  const jobs = (jobsData as unknown) as EmailJob[]

  // 5. Skip if no new matches
  if (!jobs || jobs.length === 0) {
    console.log(`[EmailNotify] No new matches for user ${userId}, skipping email`)
    return { success: true, emailsSent: 0 }
  }

  // 6. Build and send email
  const unsubscribeUrl = generateUnsubscribeUrl(userId)
  const html = buildEmailHtml(
    (userData as unknown as UserEmailData).full_name,
    jobs,
    frequency,
    unsubscribeUrl
  )
  const subject = getSubjectLine(frequency, jobs.length)

  try {
    const resendClient = getResend()
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject,
      html,
    })

    console.log(`[EmailNotify] Sent ${frequency} digest to ${userEmail} with ${jobs.length} jobs`)
  } catch (error) {
    console.error('[EmailNotify] Failed to send email:', error)
    return { success: false, emailsSent: 0, error: 'Failed to send email' }
  }

  // 7. Update last_email_sent_at
  const { error: updateError } = await supabase
    .from('job_search_preferences')
    .update({ last_email_sent_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (updateError) {
    console.warn('[EmailNotify] Failed to update last_email_sent_at:', updateError)
    // Don't fail the operation - email was sent
  }

  return { success: true, emailsSent: 1 }
}

/**
 * Sends digest emails to all users with the specified frequency.
 * Called by cron job.
 */
export async function sendBatchDigests(
  frequency: EmailNotificationFrequency
): Promise<{ success: boolean; sent: number; failed: number }> {
  const supabase = getSupabaseAdmin()

  // Fetch all users with this notification frequency
  const { data: prefsData, error: prefsError } = await supabase
    .from('job_search_preferences')
    .select('user_id')
    .eq('email_notification_frequency', frequency)
    .eq('is_active', true)

  if (prefsError) {
    console.error('[EmailNotify] Failed to fetch users for batch:', prefsError)
    return { success: false, sent: 0, failed: 0 }
  }

  // Type assertion for preferences data
  const typedPrefsData = (prefsData as unknown) as { user_id: string }[] | null

  if (!typedPrefsData || typedPrefsData.length === 0) {
    console.log(`[EmailNotify] No users with ${frequency} notification frequency`)
    return { success: true, sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const { user_id } of typedPrefsData) {
    const result = await sendJobMatchDigest(user_id, frequency)
    if (result.emailsSent > 0) {
      sent++
    } else if (result.error) {
      failed++
    }
  }

  console.log(`[EmailNotify] Batch ${frequency}: sent=${sent}, failed=${failed}`)
  return { success: true, sent, failed }
}
