/**
 * Landing Page
 *
 * Welcome to Signatura - Your AI Career Companion
 */

import Link from 'next/link'
import { Button } from '@/components/ui'
import { Heart, Shield, Sparkles } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Signatura</h1>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-companion/10 text-companion text-sm">
            <Heart className="h-4 w-4" />
            <span>You&apos;re not alone in this journey</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your AI Career Companion
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Job searching is lonely. Signatura walks alongside you with emotional support,
            practical tools, and a companion who remembers your journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Your Journey
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Welcome Back
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-companion/10 flex items-center justify-center mx-auto">
              <Heart className="h-6 w-6 text-companion" />
            </div>
            <h3 className="text-xl font-semibold">Daily Companion</h3>
            <p className="text-muted-foreground">
              Check in daily with an AI that remembers your journey, celebrates your wins,
              and supports you through setbacks.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-celebration/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-celebration" />
            </div>
            <h3 className="text-xl font-semibold">Smart Tools</h3>
            <p className="text-muted-foreground">
              CV tailoring, interview coaching, salary negotiation, and contract review—
              all with emotional intelligence built in.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-support/10 flex items-center justify-center mx-auto">
              <Shield className="h-6 w-6 text-support" />
            </div>
            <h3 className="text-xl font-semibold">You&apos;re in Control</h3>
            <p className="text-muted-foreground">
              Decide when you&apos;re visible to recruiters. Age-blind options. Block companies.
              Your job search, your rules.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6 p-8 rounded-2xl bg-companion-muted">
          <h3 className="text-2xl font-semibold">
            &ldquo;This is not a job search app with AI features.
            <br />
            This is an AI companion with job search tools.&rdquo;
          </h3>
          <p className="text-muted-foreground">
            The difference is everything.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-xl mx-auto space-y-6">
          <h3 className="text-2xl font-semibold">
            Ready to feel less alone?
          </h3>
          <p className="text-muted-foreground">
            Take the first step. I&apos;ll be here.
          </p>
          <Link href="/signup">
            <Button size="lg">
              Get Started — It&apos;s Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Signatura. Making job seekers feel less alone.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
