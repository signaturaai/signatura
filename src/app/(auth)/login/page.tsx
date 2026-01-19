/**
 * Login Page
 *
 * Warm, welcoming login experience.
 * "Welcome back. I'm here for you."
 */

import { LoginForm } from '@/components/auth/login-form'

export const metadata = {
  title: 'Welcome Back | Signatura',
  description: 'Sign in to continue your job search journey with your AI companion.',
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          Good to see you again. Let&apos;s continue where we left off.
        </p>
      </div>

      <LoginForm />

      <div className="text-center text-sm">
        <span className="text-muted-foreground">New here? </span>
        <a
          href="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create an account
        </a>
      </div>
    </div>
  )
}
