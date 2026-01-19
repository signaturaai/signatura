/**
 * Landing Page
 *
 * Welcome to Signatura - Your AI Career Companion
 * Using the warm, empathetic brand color palette
 */

import Link from 'next/link'
import { Button } from '@/components/ui'
import { Heart, Shield, Sparkles, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand">
      {/* Header with subtle gradient */}
      <header className="bg-brand-gradient">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/80 flex items-center justify-center shadow-soft">
              <Heart className="h-4 w-4 text-rose" />
            </div>
            <span className="text-xl font-semibold text-text-primary">Signatura</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-text-primary hover:bg-white/50">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-white text-text-primary hover:bg-white/90 shadow-soft">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Gradient Background */}
      <section className="bg-brand-gradient py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm text-text-primary text-sm shadow-soft animate-fade-up">
              <Heart className="h-4 w-4 text-rose" />
              <span>You&apos;re not alone in this journey</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-primary animate-fade-up">
              Your AI Career
              <br />
              <span className="text-rose-dark">Companion</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto animate-fade-up">
              Job searching is lonely. Signatura walks alongside you with emotional support,
              practical tools, and a companion who remembers your journey.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 animate-fade-up">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-text-primary text-white hover:bg-text-primary/90 shadow-soft-md group"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-white/70 border-rose-light hover:bg-white hover:border-rose text-text-primary"
                >
                  Welcome Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-primary mb-4">
              Built for your emotional wellbeing
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Every feature is designed with emotional intelligence first.
              Because finding a job shouldn&apos;t cost you your mental health.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Daily Companion */}
            <div className="card-warm text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-rose-light flex items-center justify-center mx-auto">
                <Heart className="h-7 w-7 text-rose-dark" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Daily Companion</h3>
              <p className="text-text-secondary">
                Check in daily with an AI that remembers your journey, celebrates your wins,
                and supports you through setbacks.
              </p>
            </div>

            {/* Feature 2: Smart Tools */}
            <div className="card-warm text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-lavender-light flex items-center justify-center mx-auto">
                <Sparkles className="h-7 w-7 text-lavender-dark" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">Smart Tools</h3>
              <p className="text-text-secondary">
                CV tailoring, interview coaching, salary negotiation, and contract review—
                all with emotional intelligence built in.
              </p>
            </div>

            {/* Feature 3: You're in Control */}
            <div className="card-warm text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-sky-light flex items-center justify-center mx-auto">
                <Shield className="h-7 w-7 text-sky-dark" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary">You&apos;re in Control</h3>
              <p className="text-text-secondary">
                Decide when you&apos;re visible to recruiters. Age-blind options. Block companies.
                Your job search, your rules.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 bg-brand-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="bg-white rounded-3xl p-10 shadow-soft-lg">
              <blockquote className="text-2xl md:text-3xl font-medium text-text-primary leading-relaxed">
                &ldquo;This is not a job search app with AI features.
                <br />
                <span className="text-rose-dark">This is an AI companion with job search tools.</span>&rdquo;
              </blockquote>
              <p className="mt-6 text-text-secondary text-lg">
                The difference is everything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-xl mx-auto space-y-8">
            <h3 className="text-3xl font-bold text-text-primary">
              Ready to feel less alone?
            </h3>
            <p className="text-text-secondary text-lg">
              Take the first step. I&apos;ll be here.
            </p>
            <Link href="/signup">
              <button className="btn-gradient">
                Get Started — It&apos;s Free
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-rose-light/50 bg-brand">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose" />
              <p className="text-sm text-text-secondary">
                © 2026 Signatura. Making job seekers feel less alone.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <Link href="/privacy" className="hover:text-text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
