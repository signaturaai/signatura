'use client'

/**
 * Strategic Narrative Alignment Page
 *
 * Three-phase flow:
 *   Phase 1 — The Compass: 5-question onboarding to capture desired brand
 *   Phase 2 — Analysis: CV bullets + profile → semantic gap computation
 *   Phase 3 — The Reflection: side-by-side comparison with evidence
 *
 * Routes to the tailoring pipeline on CTA click.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Label,
  Button,
} from '@/components/ui'
import {
  Compass,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NarrativeCompass } from '@/components/cv/NarrativeCompass'
import { NarrativeReflection } from '@/components/cv/NarrativeReflection'
import {
  analyzeNarrativeGap,
  type NarrativeProfile,
  type NarrativeAnalysisResult,
} from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sample bullets
// ---------------------------------------------------------------------------

const SAMPLE_BULLETS = [
  'Managed the product roadmap for the internal tools platform',
  'Built REST API endpoints and maintained deployment pipeline using Docker and CI/CD',
  'Participated in sprint planning and daily standups for 6-person engineering team',
  'Implemented caching layer that reduced page load time from 3s to 400ms',
  'Wrote technical documentation for onboarding new engineers',
  'Resolved 200+ customer support tickets related to platform stability',
]

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col items-center py-8">
        <div className="w-48 h-28 rounded-t-full border-8 border-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200 mt-4" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border-2 border-gray-200 p-5 space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-gray-200" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-2">
            <div className="h-3 w-48 rounded bg-gray-200" />
            <div className="h-1.5 w-full rounded bg-gray-200" />
            <div className="h-2 w-64 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

type Phase = 'compass' | 'cv-input' | 'analyzing' | 'reflection'

export default function NarrativeAlignmentPage() {
  const [phase, setPhase] = useState<Phase>('compass')

  // State
  const [profile, setProfile] = useState<NarrativeProfile | null>(null)
  const [bulletsText, setBulletsText] = useState('')
  const [analysis, setAnalysis] = useState<NarrativeAnalysisResult | null>(null)

  const handleCompassComplete = useCallback((p: NarrativeProfile) => {
    setProfile(p)
    setPhase('cv-input')
  }, [])

  const loadSample = useCallback(() => {
    setBulletsText(SAMPLE_BULLETS.join('\n'))
  }, [])

  const handleAnalyze = useCallback(() => {
    if (!profile) return
    const bullets = bulletsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0)

    if (bullets.length === 0) return

    setPhase('analyzing')

    // Brief delay for premium analysis feel
    setTimeout(() => {
      const result = analyzeNarrativeGap(bullets, profile)
      setAnalysis(result)
      setPhase('reflection')
    }, 1500)
  }, [profile, bulletsText])

  const handleAlignNarrative = useCallback(() => {
    // In production, this would route to the tailoring pipeline
    // For now, scroll to top or show success state
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const hasBullets = bulletsText.trim().length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Compass className="h-8 w-8 text-indigo-500" />
          Narrative Alignment
        </h1>
        <p className="text-gray-500">
          Discover the gap between how you want to be seen and what your CV actually signals.
        </p>
      </motion.div>

      {/* Phase 1: The Compass */}
      <AnimatePresence mode="wait">
        {phase === 'compass' && (
          <motion.div
            key="compass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <NarrativeCompass onComplete={handleCompassComplete} />
          </motion.div>
        )}

        {/* Phase 1.5: CV Input */}
        {phase === 'cv-input' && (
          <motion.div
            key="cv-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Profile summary badge */}
            {profile && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3"
              >
                <Compass className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="text-sm">
                  <span className="font-medium text-indigo-700">{profile.targetRole}</span>
                  <span className="text-gray-400 mx-1.5">|</span>
                  <span className="text-gray-600">{profile.seniorityLevel.charAt(0).toUpperCase() + profile.seniorityLevel.slice(1)}</span>
                  <span className="text-gray-400 mx-1.5">|</span>
                  <span className="text-gray-600">{profile.coreStrength.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                </div>
              </motion.div>
            )}

            <Card className="border border-gray-200 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <CardTitle className="text-lg">Your CV Bullets</CardTitle>
                </div>
                <p className="text-sm text-gray-500">
                  Paste your current CV bullets below — we&apos;ll analyze what narrative they actually convey.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cv-bullets">CV Bullets (one per line)</Label>
                  <Textarea
                    id="cv-bullets"
                    value={bulletsText}
                    onChange={e => setBulletsText(e.target.value)}
                    placeholder="Paste your CV bullet points here, one per line..."
                    rows={10}
                    className="mt-1.5 font-mono text-sm"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleAnalyze}
                    disabled={!hasBullets}
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:opacity-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze My Narrative
                  </Button>
                  <button
                    onClick={loadSample}
                    className="text-sm text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                  >
                    Load sample data
                  </button>
                  <button
                    onClick={() => setPhase('compass')}
                    className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
                  >
                    Edit compass
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Phase 2: Analyzing */}
        {phase === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4 text-indigo-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Reading your CV and computing narrative alignment...</span>
            </div>
            <AnalysisSkeleton />
          </motion.div>
        )}

        {/* Phase 3: The Reflection */}
        {phase === 'reflection' && profile && analysis && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <NarrativeReflection
              profile={profile}
              analysis={analysis}
              onAlignNarrative={handleAlignNarrative}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
