'use client'

/**
 * Signup Form Component
 *
 * Welcoming signup experience with validation, user type selection, and GDPR consent.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button, Input, Label, Card, CardContent, CardFooter } from '@/components/ui'
import { PrivacyPolicyLink } from '@/components/legal'
import { Loader2, User, Briefcase } from 'lucide-react'

type UserType = 'candidate' | 'recruiter'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [userType, setUserType] = useState<UserType>('candidate')
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validation
    if (!acceptedPrivacy) {
      setError('You must accept the Privacy Policy to continue')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          user_type: userType,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      setMessage('Check your email to confirm your account. Then come back and sign in.')
      setLoading(false)
      return
    }

    // If user created successfully, update profile with user_type and consent
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email,
          full_name: name,
          user_type: userType,
          is_admin: false,
          privacy_policy_accepted_at: new Date().toISOString(),
          terms_accepted_at: new Date().toISOString(),
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        // Continue anyway - profile might be created by trigger
      }

      // Log consent
      try {
        await fetch('/api/consent/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consent_type: 'privacy_policy',
            action: 'granted',
            version: '2.0',
          }),
        })
      } catch {
        // Silently fail - consent was recorded in profile
      }
    }

    // Redirect based on user type
    const redirectPath = userType === 'recruiter' ? '/jobs' : '/companion'
    router.push(redirectPath)
    router.refresh()
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4 pt-6">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 text-sm text-celebration bg-celebration/10 rounded-md">
              {message}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              type="text"
              placeholder="What should I call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Type it again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* User Type Selection */}
          <div className="space-y-3">
            <Label>I am:</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('candidate')}
                disabled={loading}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  userType === 'candidate'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <User className={`w-5 h-5 mb-2 ${userType === 'candidate' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium text-sm">Looking for a job</div>
                <div className="text-xs text-muted-foreground mt-1">
                  CV tools, interview prep
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUserType('recruiter')}
                disabled={loading}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  userType === 'recruiter'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/30'
                }`}
              >
                <Briefcase className={`w-5 h-5 mb-2 ${userType === 'recruiter' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium text-sm">Hiring talent</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Job postings, candidates
                </div>
              </button>
            </div>
          </div>

          {/* Privacy Policy Acceptance */}
          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="acceptPrivacy"
              checked={acceptedPrivacy}
              onChange={(e) => setAcceptedPrivacy(e.target.checked)}
              disabled={loading}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="acceptPrivacy" className="text-sm text-muted-foreground">
              I accept the <PrivacyPolicyLink className="text-primary underline" /> and consent to data processing as described
            </label>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !acceptedPrivacy}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              `Create ${userType === 'recruiter' ? 'recruiter' : 'candidate'} account`
            )}
          </Button>

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <PrivacyPolicyLink className="underline hover:text-primary" />
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
