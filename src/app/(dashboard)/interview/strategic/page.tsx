'use client'

/**
 * Strategic Interview Setup — Full Page
 *
 * Flow:
 * 1. Wizard: 4-step StrategicInterviewWizard
 * 2. Context: CV + JD + Narrative Profile input
 * 3. Preparing: thinking engine animation
 * 4. Ready: session brief with narrative anchors, question themes, gap targets
 */

import { useState, useCallback, useMemo } from 'react'
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
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle,
  Target,
  Shield,
  Zap,
  Compass,
  Mic,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StrategicInterviewWizard } from '@/components/interview/StrategicInterviewWizard'
import {
  prepareInterviewSession,
  type NarrativeProfile,
  type CoreStrength,
  type SeniorityLevel,
} from '@/lib/ai/siggy-integration-guide'
import type {
  StrategicWizardConfig,
  PreparedInterviewSession,
} from '@/types/interview'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRENGTH_OPTIONS: { value: CoreStrength; label: string }[] = [
  { value: 'strategic-leadership', label: 'Strategic Leadership' },
  { value: 'technical-mastery', label: 'Technical Mastery' },
  { value: 'operational-excellence', label: 'Operational Excellence' },
  { value: 'business-innovation', label: 'Business Innovation' },
]

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
]

type Phase = 'wizard' | 'context' | 'preparing' | 'ready'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StrategicInterviewPage() {
  const [phase, setPhase] = useState<Phase>('wizard')
  const [wizardConfig, setWizardConfig] = useState<StrategicWizardConfig | null>(null)
  const [session, setSession] = useState<PreparedInterviewSession | null>(null)

  // Context inputs
  const [cvText, setCvText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [seniority, setSeniority] = useState<SeniorityLevel>('senior')
  const [strength, setStrength] = useState<CoreStrength>('strategic-leadership')
  const [desiredBrand, setDesiredBrand] = useState('')
  const [useNarrative, setUseNarrative] = useState(true)

  const narrativeProfile: NarrativeProfile | null = useMemo(() => {
    if (!useNarrative || targetRole.trim().length < 3) return null
    return {
      targetRole: targetRole.trim(),
      seniorityLevel: seniority,
      coreStrength: strength,
      painPoint: '',
      desiredBrand: desiredBrand.trim(),
    }
  }, [useNarrative, targetRole, seniority, strength, desiredBrand])

  const handleWizardComplete = useCallback((config: StrategicWizardConfig) => {
    setWizardConfig(config)
    setPhase('context')
  }, [])

  const handlePrepare = useCallback(() => {
    if (!wizardConfig) return
    setPhase('preparing')

    setTimeout(() => {
      const cvBullets = cvText.split('\n').map(b => b.trim()).filter(Boolean)
      const prepared = prepareInterviewSession(
        wizardConfig,
        narrativeProfile,
        cvBullets,
        jobDescription
      )
      setSession(prepared)
      setPhase('ready')
    }, 1200)
  }, [wizardConfig, cvText, jobDescription, narrativeProfile])

  const handleReset = useCallback(() => {
    setPhase('wizard')
    setWizardConfig(null)
    setSession(null)
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-rose" />
            Strategic Interview Wizard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Prepare for interviews with narrative-driven intelligence.
          </p>
        </div>
        {phase !== 'wizard' && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Start Over
          </Button>
        )}
      </div>

      {/* ============================================================= */}
      {/* WIZARD PHASE */}
      {/* ============================================================= */}
      {phase === 'wizard' && (
        <StrategicInterviewWizard
          onComplete={handleWizardComplete}
        />
      )}

      {/* ============================================================= */}
      {/* CONTEXT PHASE */}
      {/* ============================================================= */}
      {phase === 'context' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-100 shadow-soft-lg">
            <CardHeader>
              <CardTitle className="text-base font-bold text-gray-900">
                Provide context for your session
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                The AI will use your CV and JD to hunt for narrative gaps.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CV + JD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Tailored CV (bullets, one per line)
                  </Label>
                  <Textarea
                    value={cvText}
                    onChange={e => setCvText(e.target.value)}
                    rows={5}
                    placeholder="Led product roadmap strategy..."
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Description
                  </Label>
                  <Textarea
                    value={jobDescription}
                    onChange={e => setJobDescription(e.target.value)}
                    rows={5}
                    placeholder="Paste the job description..."
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Narrative Profile Toggle */}
              <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-800">Narrative Anchor (North Star)</span>
                  </div>
                  <button
                    onClick={() => setUseNarrative(!useNarrative)}
                    className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors',
                      useNarrative
                        ? 'bg-amber-200/60 text-amber-700'
                        : 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {useNarrative ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {useNarrative && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs text-amber-700">Target Role</Label>
                      <Input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="VP of Product" className="mt-1 text-sm bg-white" />
                    </div>
                    <div>
                      <Label className="text-xs text-amber-700">Seniority</Label>
                      <select value={seniority} onChange={e => setSeniority(e.target.value as SeniorityLevel)} className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                        {SENIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-700">Core Strength</Label>
                      <select value={strength} onChange={e => setStrength(e.target.value as CoreStrength)} className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
                        {STRENGTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-amber-700">Desired Brand</Label>
                      <Input value={desiredBrand} onChange={e => setDesiredBrand(e.target.value)} placeholder="A strategic leader who..." className="mt-1 text-sm bg-white" />
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Config Summary */}
              {wizardConfig && (
                <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Session Config</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-light/50 text-[10px] font-medium text-rose-dark">
                      {wizardConfig.interviewType.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-lavender-light/50 text-[10px] font-medium text-lavender-dark">
                      {wizardConfig.difficultyLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-light/50 text-[10px] font-medium text-sky-dark">
                      {wizardConfig.interviewMode}
                    </span>
                    {wizardConfig.extractedValues && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-700">
                        LinkedIn intel active
                      </span>
                    )}
                  </div>
                </div>
              )}

              <Button
                onClick={handlePrepare}
                className="bg-gradient-to-r from-rose to-lavender text-white hover:from-rose-dark hover:to-lavender-dark"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Prepare Session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* PREPARING PHASE */}
      {/* ============================================================= */}
      {phase === 'preparing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-rose animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            Preparing your strategic interview session...
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            Analyzing narrative gaps and interviewer values
          </div>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* READY PHASE */}
      {/* ============================================================= */}
      {phase === 'ready' && session && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Session Brief */}
          <Card className="border-rose/30 shadow-soft-lg overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-rose via-lavender to-rose" />
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-light flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-rose-dark" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">
                    Session Prepared
                  </CardTitle>
                  <p className="text-xs text-gray-500">
                    Your strategic interview is ready to begin.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Brief */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {session.sessionBrief}
                </p>
              </div>

              {/* Scoring Mode */}
              <div className="flex items-center gap-2">
                {session.scoringMode === 'content_and_delivery' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200">
                    <Mic className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-700">Content + Delivery Scoring</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-light/50 border border-sky/30">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-dark" />
                    <span className="text-xs font-medium text-sky-dark">Content Only Scoring</span>
                  </div>
                )}
              </div>

              {/* Narrative Anchors */}
              {session.narrativeAnchors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3 h-3" />
                    Narrative Anchors (North Star)
                  </p>
                  <div className="space-y-1">
                    {session.narrativeAnchors.map((anchor, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="text-amber-400 mt-0.5">▸</span>
                        {anchor}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prioritized Question Themes */}
              {session.prioritizedQuestionThemes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-rose-dark uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Prioritized Question Themes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {session.prioritizedQuestionThemes.map((theme, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full bg-rose-light/40 text-[10px] font-medium text-rose-dark border border-rose/20"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gap Hunting Targets */}
              {session.gapHuntingTargets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Gap-Hunting Targets (Watch Out)
                  </p>
                  <div className="bg-red-50/50 rounded-lg p-3 border border-red-100">
                    <div className="flex flex-wrap gap-1.5">
                      {session.gapHuntingTargets.map((gap, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-full bg-red-100 text-[10px] font-medium text-red-700"
                        >
                          {gap}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-red-500 mt-2">
                      The interviewer will likely probe these narrative gaps. Prepare strong answers.
                    </p>
                  </div>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  className="bg-gradient-to-r from-rose to-lavender text-white hover:from-rose-dark hover:to-lavender-dark"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Begin Interview
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPhase('context')}>
                  Edit Context
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
