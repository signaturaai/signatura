'use client'

/**
 * Application Strategy Page
 *
 * Final step in the CV tailoring pipeline. Generates a comprehensive
 * winning strategy from tailored bullets, job description, and title.
 *
 * Flow: Input → Analyzing (skeleton) → Strategy Card → Download
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
  Input,
  Button,
} from '@/components/ui'
import {
  Sparkles,
  Trophy,
  Loader2,
  ChevronDown,
  FileDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApplicationStrategyCard } from '@/components/cv/ApplicationStrategyCard'
import {
  generateApplicationStrategy,
  type ApplicationStrategy,
} from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_BULLETS = [
  'Led product roadmap strategy using RICE prioritization framework, shipping 15 features that drove 25% revenue growth across 3 markets',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly sprint ceremonies',
  'Analyzed user behavior data using Mixpanel and Amplitude, identifying 3 key drop-off points and improving conversion by 18%',
  'Spearheaded migration from monolith to microservices architecture, reducing deployment time from 4 hours to 15 minutes',
  'Presented quarterly product review to C-suite stakeholders, securing $2M budget increase for platform expansion initiative',
  'Conducted 40+ user interviews to validate MVP hypothesis, resulting in 30% higher adoption rate vs. previous launches',
]

const SAMPLE_JD = `We are looking for a Senior Product Manager to lead our platform growth team.
You will own the product roadmap, drive data-driven decisions, and collaborate
cross-functionally with engineering, design, and marketing.
Experience with agile methodology, A/B testing, stakeholder management,
and analytics tools (Amplitude, Mixpanel) is required.
Must demonstrate strategic thinking and user-centric product development.`

const SAMPLE_TITLE = 'Senior Product Manager'

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function StrategySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-xl border-2 border-gray-200 bg-white/60 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="space-y-1.5">
            <div className="h-5 w-48 rounded bg-gray-200" />
            <div className="h-3 w-64 rounded bg-gray-200" />
          </div>
        </div>
        {/* Value prop */}
        <div className="rounded-xl bg-gray-100 p-5 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-5 w-full rounded bg-gray-200" />
        </div>
        {/* Pillars */}
        <div className="grid gap-4 md:grid-cols-[1fr_160px]">
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-gray-100 p-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="h-32 w-32 rounded-full border-8 border-gray-200" />
          </div>
        </div>
        {/* Summary */}
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-gray-200" />
          <div className="rounded-lg bg-gray-100 p-4 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-3/4 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

type Mode = 'input' | 'analyzing' | 'strategy'

export default function ApplicationStrategyPage() {
  const [mode, setMode] = useState<Mode>('input')
  const [inputCollapsed, setInputCollapsed] = useState(false)

  // Input state
  const [bulletsText, setBulletsText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('')

  // Result
  const [strategy, setStrategy] = useState<ApplicationStrategy | null>(null)

  const loadSample = useCallback(() => {
    setBulletsText(SAMPLE_BULLETS.join('\n'))
    setJobDescription(SAMPLE_JD)
    setJobTitle(SAMPLE_TITLE)
  }, [])

  const handleGenerate = useCallback(() => {
    const bullets = bulletsText
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0)

    if (bullets.length === 0) return

    setMode('analyzing')
    setInputCollapsed(true)

    // Brief delay for premium feel
    setTimeout(() => {
      const result = generateApplicationStrategy(
        bullets,
        jobTitle || undefined,
        jobDescription || undefined
      )
      setStrategy(result)
      setMode('strategy')
    }, 1200)
  }, [bulletsText, jobTitle, jobDescription])

  const hasInput = bulletsText.trim().length > 0

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-8 w-8 text-emerald-500" />
          Application Strategy
        </h1>
        <p className="text-gray-500">
          Your AI-powered winning strategy — the final step before you apply.
        </p>
      </motion.div>

      {/* Input Section */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => mode !== 'input' && setInputCollapsed(!inputCollapsed)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Tailored CV Bullets</CardTitle>
            {mode !== 'input' && (
              <ChevronDown className={cn(
                'h-5 w-5 text-gray-400 transition-transform',
                inputCollapsed && '-rotate-90'
              )} />
            )}
          </div>
        </CardHeader>

        <AnimatePresence>
          {(!inputCollapsed || mode === 'input') && (
            <motion.div
              initial={mode !== 'input' ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor="bullets">Tailored Bullets (one per line)</Label>
                  <Textarea
                    id="bullets"
                    value={bulletsText}
                    onChange={e => setBulletsText(e.target.value)}
                    placeholder="Paste your tailored CV bullets here — one per line..."
                    rows={8}
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="job-title">Job Title (optional)</Label>
                    <Input
                      id="job-title"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                      placeholder="e.g., Senior Product Manager"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="jd">Job Description (optional)</Label>
                    <Textarea
                      id="jd"
                      value={jobDescription}
                      onChange={e => setJobDescription(e.target.value)}
                      placeholder="Paste the job description..."
                      rows={3}
                      className="mt-1.5 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={!hasInput}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Strategy
                  </Button>
                  <button
                    onClick={loadSample}
                    className="text-sm text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                  >
                    Load sample data
                  </button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Loading State */}
      <AnimatePresence>
        {mode === 'analyzing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 mb-4 text-emerald-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">Crafting your winning strategy...</span>
            </div>
            <StrategySkeleton />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategy Card */}
      <AnimatePresence>
        {mode === 'strategy' && strategy && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <ApplicationStrategyCard strategy={strategy} />

            {/* Download CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center"
            >
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 px-8 py-3 text-base shadow-lg shadow-emerald-200/50"
              >
                <FileDown className="mr-2 h-5 w-5" />
                Download Tailored PDF
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
