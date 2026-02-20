/**
 * Job Search Agent — Environment Variable Validation
 *
 * Validates all required env vars for the Job Search Agent at runtime.
 * Call validateJobSearchEnv() at the top of each API route that needs these vars.
 */

import { z } from 'zod'

const jobSearchEnvSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().min(1, 'GOOGLE_AI_API_KEY is required'),
  RESEND_API_KEY: z
    .string()
    .min(1, 'RESEND_API_KEY is required')
    .refine((val) => val.startsWith('re_'), {
      message: "RESEND_API_KEY must start with 're_'",
    }),
  RESEND_FROM_EMAIL: z
    .string()
    .min(1, 'RESEND_FROM_EMAIL is required')
    .email('RESEND_FROM_EMAIL must be a valid email'),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_APP_URL is required')
    .url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  CRON_SECRET: z
    .string()
    .min(16, 'CRON_SECRET must be at least 16 characters'),
})

export type JobSearchEnv = z.infer<typeof jobSearchEnvSchema>

/**
 * Validates that all required Job Search Agent environment variables are set.
 * Throws a descriptive error if any variable is missing or invalid.
 */
export function validateJobSearchEnv(): JobSearchEnv {
  const result = jobSearchEnvSchema.safeParse({
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
  })

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(
      `Job Search Agent environment validation failed:\n${errors}`
    )
  }

  return result.data
}
