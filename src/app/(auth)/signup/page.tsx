/**
 * Signup Page
 *
 * Welcoming onboarding experience.
 * "You're taking the first step. I'm proud of you."
 */

import { SignupForm } from '@/components/auth/signup-form'

export const metadata = {
  title: 'Get Started | Signatura',
  description: 'Create your account and start your journey with an AI companion who understands job searching.',
}

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Let&apos;s get started
        </h2>
        <p className="text-sm text-muted-foreground">
          Taking this step takes courage. I&apos;m here to walk alongside you.
        </p>
      </div>

      <SignupForm />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <a
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </a>
      </div>
    </div>
  )
}
