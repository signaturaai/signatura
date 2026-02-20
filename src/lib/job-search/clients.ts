/**
 * Job Search Agent — Client Initializers
 *
 * Lazily initialized clients for backend/cron operations.
 * Each client is created on first use, not at import time.
 */

import { createServiceClient } from '@/lib/supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Resend } from 'resend'

// ============================================================================
// Supabase Admin Client (service role — bypasses RLS)
// ============================================================================

let supabaseAdmin: ReturnType<typeof createServiceClient> | null = null

/**
 * Returns the Supabase admin client (service role).
 * Lazily initialized on first call.
 */
export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createServiceClient()
  }
  return supabaseAdmin
}

// ============================================================================
// Google Generative AI (Gemini) Client
// ============================================================================

let geminiClient: GoogleGenerativeAI | null = null

/**
 * Returns the Google Generative AI (Gemini) client.
 * Lazily initialized on first call.
 */
export function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set')
    }
    geminiClient = new GoogleGenerativeAI(apiKey)
  }
  return geminiClient
}

// ============================================================================
// Resend Client (email notifications)
// ============================================================================

let resendClient: Resend | null = null

/**
 * Returns the Resend email client.
 * Lazily initialized on first call.
 */
export function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}
