'use client'

/**
 * Narrative Validation & Results Dashboard
 *
 * The final "victory lap" page after tailoring completes.
 *
 * Flow:
 * 1. Input: paste original + tailored bullets, JD, and narrative profile
 * 2. Analyzing (skeleton)
 * 3. Results: NarrativeTransformationCard + AuthenticityFeedback
 * 4. PDF Download with seniority framing
 *
 * Integrates:
 * - generateNarrativeTransformationSummary (before/after archetype comparison)
 * - retailorWithToneNudge (one-click re-tailor on feedback)
 * - formatBulletsForPDFExport (seniority-framed export)
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
  Sparkles,
  Trophy,
  Loader2,
  FileDown,
  Target,
  CheckCircle,
  ArrowRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NarrativeTransformationCard } from '@/components/cv/NarrativeTransformationCard'
import { AuthenticityFeedback } from '@/components/cv/AuthenticityFeedback'
import {
  generateNarrativeTransformationSummary,
  retailorWithToneNudge,
  formatBulletsForPDFExport,
  extractJobKeywords,
  analyzeTailoringPair,
  type NarrativeTransformationSummary,
  type NarrativeProfile,
  type ToneNudge,
  type CoreStrength,
  type SeniorityLevel,
} from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const SAMPLE_ORIGINAL = [
  'Managed the product roadmap',
  'Worked with engineering and design teams',
  'Built features for users',
  'Attended meetings and provided updates',
  'Responsible for project timelines',
]

const SAMPLE_TAILORED = [
  'Led product roadmap strategy using RICE framework, shipping 15 high-impact features over 6 months resulting in 25% revenue growth',
  'Partnered with cross-functional team of 12 engineers and designers, achieving 95% on-time delivery through weekly syncs and stakeholder alignment',
  'Launched user-facing analytics platform for 50K customers, increasing engagement by 40% and reducing churn by 15%',
  'Drove executive stakeholder alignment through weekly product reviews, resulting in $2M budget approval and accelerated roadmap execution',
  'Established agile sprint cadence with data-driven prioritization, reducing time-to-market by 35% while improving team velocity by 20%',
]

const SAMPLE_JD = `We are looking for a Senior Product Manager with experience in:
- Strategic roadmap planning and RICE prioritization
- Cross-functional leadership with engineering and design teams
- Data-driven decision making with KPI tracking
- Stakeholder management and executive communication
- Agile methodology and sprint planning`

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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Phase = 'input' | 'analyzing' | 'results'

export default function NarrativeResultsPage() {
  // Input state
  const [originalText, setOriginalText] = useState('')
  const [tailoredText, setTailoredText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [jobTitle, setJobTitle] = useState('Senior Product Manager')
  const [candidateName, setCandidateName] = useState('')
  const [targetRole, setTargetRole] = useState('VP of Product')
  const [seniority, setSeniority] = useState<SeniorityLevel>('executive')
  const [strength, setStrength] = useState<CoreStrength>('strategic-leadership')
  const [desiredBrand, setDesiredBrand] = useState('A transformational product leader who sets vision and aligns organizations.')

  // Results state
  const [phase, setPhase] = useState<Phase>('input')
  const [summary, setSummary] = useState<NarrativeTransformationSummary | null>(null)
  const [currentTailored, setCurrentTailored] = useState<string[]>([])
  const [isRetailoring, setIsRetailoring] = useState(false)
  const [isAuthentic, setIsAuthentic] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const profile: NarrativeProfile = useMemo(() => ({
    targetRole,
    seniorityLevel: seniority,
    coreStrength: strength,
    painPoint: '',
    desiredBrand,
  }), [targetRole, seniority, strength, desiredBrand])

  // Load sample
  const handleLoadSample = useCallback(() => {
    setOriginalText(SAMPLE_ORIGINAL.join('\n'))
    setTailoredText(SAMPLE_TAILORED.join('\n'))
    setJobDescription(SAMPLE_JD)
  }, [])

  // Run analysis
  const handleAnalyze = useCallback(() => {
    const origArr = originalText.split('\n').map(b => b.trim()).filter(Boolean)
    const tailArr = tailoredText.split('\n').map(b => b.trim()).filter(Boolean)
    if (origArr.length === 0 || tailArr.length === 0) return

    setPhase('analyzing')

    setTimeout(() => {
      // Compute JD scores for the summary
      const keywords = extractJobKeywords(jobDescription)
      const maxLen = Math.max(origArr.length, tailArr.length)
      let totalOrigJd = 0
      let totalTailJd = 0
      for (let i = 0; i < maxLen; i++) {
        const orig = origArr[i] || ''
        const tail = tailArr[i] || orig
        const analysis = analyzeTailoringPair(orig, tail, keywords, jobTitle || undefined)
        totalOrigJd += analysis.originalScore
        totalTailJd += analysis.suggestedScore
      }
      const avgOrigJd = maxLen > 0 ? Math.round(totalOrigJd / maxLen) : 0
      const avgTailJd = maxLen > 0 ? Math.round(totalTailJd / maxLen) : 0

      const result = generateNarrativeTransformationSummary(
        origArr,
        tailArr,
        profile,
        avgTailJd,
        avgOrigJd
      )

      setSummary(result)
      setCurrentTailored(tailArr)
      setPhase('results')
    }, 800)
  }, [originalText, tailoredText, jobDescription, jobTitle, profile])

  // Re-tailor with tone nudge
  const handleRetailor = useCallback((nudge: ToneNudge) => {
    setIsRetailoring(true)

    setTimeout(() => {
      const origArr = originalText.split('\n').map(b => b.trim()).filter(Boolean)
      const reTailored = retailorWithToneNudge(currentTailored, profile, nudge)

      // Recompute JD scores
      const keywords = extractJobKeywords(jobDescription)
      const maxLen = Math.max(origArr.length, reTailored.length)
      let totalOrigJd = 0
      let totalTailJd = 0
      for (let i = 0; i < maxLen; i++) {
        const orig = origArr[i] || ''
        const tail = reTailored[i] || orig
        const analysis = analyzeTailoringPair(orig, tail, keywords, jobTitle || undefined)
        totalOrigJd += analysis.originalScore
        totalTailJd += analysis.suggestedScore
      }
      const avgOrigJd = maxLen > 0 ? Math.round(totalOrigJd / maxLen) : 0
      const avgTailJd = maxLen > 0 ? Math.round(totalTailJd / maxLen) : 0

      const newSummary = generateNarrativeTransformationSummary(
        origArr,
        reTailored,
        profile,
        avgTailJd,
        avgOrigJd
      )

      setCurrentTailored(reTailored)
      setSummary(newSummary)
      setIsRetailoring(false)
      setIsAuthentic(false)
    }, 600)
  }, [originalText, currentTailored, jobDescription, jobTitle, profile])

  // PDF download
  const handleDownloadPDF = useCallback(() => {
    const formatted = formatBulletsForPDFExport(
      currentTailored,
      profile,
      jobTitle,
      candidateName || undefined
    )
    const blob = new Blob([formatted], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(candidateName || 'cv').replace(/\s+/g, '-').toLowerCase()}-tailored-cv.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 3000)
  }, [currentTailored, profile, jobTitle, candidateName])

  // Reset
  const handleReset = useCallback(() => {
    setPhase('input')
    setSummary(null)
    setCurrentTailored([])
    setIsAuthentic(false)
    setDownloaded(false)
  }, [])

  const canAnalyze = originalText.trim().length > 0 && tailoredText.trim().length > 0 && desiredBrand.trim().length >= 10

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-6 w-6 text-emerald-500" />
            Narrative Transformation Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            See exactly how your professional identity has been transformed.
          </p>
        </div>
        {phase === 'results' && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* ============================================================= */}
      {/* INPUT PHASE */}
      {/* ============================================================= */}
      {phase === 'input' && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
            <CardContent className="p-6 space-y-4">
              {/* Bullet inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original CV Bullets (one per line)
                  </Label>
                  <Textarea
                    value={originalText}
                    onChange={e => setOriginalText(e.target.value)}
                    rows={5}
                    placeholder="Managed the product roadmap..."
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tailored CV Bullets (one per line)
                  </Label>
                  <Textarea
                    value={tailoredText}
                    onChange={e => setTailoredText(e.target.value)}
                    rows={5}
                    placeholder="Led product roadmap strategy..."
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* JD + Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</Label>
                  <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Your Name (optional)</Label>
                  <Input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="For PDF header" className="text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Job Description</Label>
                <Textarea
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={3}
                  placeholder="Paste the job description..."
                  className="text-xs"
                />
              </div>

              {/* Narrative Profile */}
              <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/30 p-4 space-y-3">
                <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Narrative Profile
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs text-emerald-700">Target Role</Label>
                    <Input value={targetRole} onChange={e => setTargetRole(e.target.value)} className="mt-1 text-sm bg-white" />
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-700">Seniority</Label>
                    <select
                      value={seniority}
                      onChange={e => setSeniority(e.target.value as SeniorityLevel)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {SENIORITY_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-700">Core Strength</Label>
                    <select
                      value={strength}
                      onChange={e => setStrength(e.target.value as CoreStrength)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    >
                      {STRENGTH_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-emerald-700">Desired Brand (1 sentence)</Label>
                    <Input value={desiredBrand} onChange={e => setDesiredBrand(e.target.value)} className="mt-1 text-sm bg-white" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Analyze Transformation
                </Button>
                <Button variant="outline" onClick={handleLoadSample}>
                  Load Sample
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* ANALYZING PHASE */}
      {/* ============================================================= */}
      {phase === 'analyzing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-20 flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            Analyzing your narrative transformation...
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            Comparing archetypes and measuring identity shift
          </div>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* RESULTS PHASE */}
      {/* ============================================================= */}
      {phase === 'results' && summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Transformation Card */}
          <NarrativeTransformationCard summary={summary} />

          {/* Authenticity Feedback */}
          <AuthenticityFeedback
            onConfirmAuthentic={() => setIsAuthentic(true)}
            onRetailor={handleRetailor}
            isRetailoring={isRetailoring}
          />

          {/* Final Tailored Bullets Preview */}
          <Card className="bg-white/80 backdrop-blur-sm border-gray-100">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Your Transformed CV Bullets
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {currentTailored.map((bullet, idx) => (
                  <div
                    key={idx}
                    className="text-sm leading-relaxed pl-3 border-l-2 border-emerald-400 text-gray-800"
                  >
                    {bullet}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PDF Download + Progress Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Download Card */}
            <Card className="border-emerald-200/60 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <FileDown className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">Download Tailored CV</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Seniority-framed export with your narrative positioning
                    </p>
                    <Button
                      size="sm"
                      onClick={handleDownloadPDF}
                      className={cn(
                        'mt-3 transition-all',
                        downloaded
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                      )}
                    >
                      {downloaded ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                          Downloaded
                        </>
                      ) : (
                        <>
                          <FileDown className="w-3.5 h-3.5 mr-1.5" />
                          Export with Seniority Framing
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Progress Card */}
            <Card className="border-indigo-200/60 overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400" />
              <CardContent className="p-5">
                <p className="text-sm font-bold text-gray-900 mb-3">Tailoring Progress</p>
                <div className="space-y-3">
                  {/* Content Match */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-indigo-600">Content Match</span>
                        <span className="text-xs font-bold text-indigo-700">
                          {summary.jdAlignmentMaintained ? '100%' : `${summary.jdScore}pts`}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-indigo-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-indigo-500"
                          initial={{ width: 0 }}
                          animate={{ width: summary.jdAlignmentMaintained ? '100%' : `${Math.min(summary.jdScore * 10, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                    <CheckCircle className={cn(
                      'w-4 h-4 flex-shrink-0',
                      summary.jdAlignmentMaintained ? 'text-emerald-500' : 'text-gray-300'
                    )} />
                  </div>

                  {/* Narrative Match */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-amber-600">Narrative Match</span>
                        <span className="text-xs font-bold text-amber-700">
                          {summary.afterArchetype.percent}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-amber-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${summary.afterArchetype.percent}%` }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                        />
                      </div>
                    </div>
                    <CheckCircle className={cn(
                      'w-4 h-4 flex-shrink-0',
                      summary.afterArchetype.percent >= 70 ? 'text-emerald-500' : 'text-gray-300'
                    )} />
                  </div>

                  {/* Authenticity */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-violet-600">Authenticity</span>
                        <span className="text-xs font-bold text-violet-700">
                          {isAuthentic ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-violet-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: isAuthentic ? '100%' : '50%' }}
                          transition={{ duration: 0.8, delay: 0.6 }}
                        />
                      </div>
                    </div>
                    <CheckCircle className={cn(
                      'w-4 h-4 flex-shrink-0',
                      isAuthentic ? 'text-emerald-500' : 'text-gray-300'
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All-Complete Banner */}
          {isAuthentic && summary.jdAlignmentMaintained && summary.afterArchetype.percent >= 45 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white text-center"
            >
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <p className="text-lg font-bold">
                Your professional identity transformation is complete.
              </p>
              <p className="text-sm opacity-90 mt-1">
                Content match preserved. Narrative aligned. Authenticity confirmed.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs opacity-80">
                <Sparkles className="w-3.5 h-3.5" />
                You are ready to lead.
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
