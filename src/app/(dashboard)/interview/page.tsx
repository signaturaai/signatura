'use client'

/**
 * Interview Coach Page
 *
 * Smart Setup Wizard + Interview Simulation Board
 * - Shows wizard if no plan exists
 * - Shows dashboard once plan is generated
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Textarea, Label } from '@/components/ui'
import { Mic, Play, Sparkles, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { InterviewSetupWizard, InterviewSimulationBoard, STARBuilder } from '@/components/interview'
import type { WizardConfig, InterviewPlan } from '@/types/interview'

type Mode = 'landing' | 'wizard' | 'dashboard' | 'loading' | 'star-builder'

export default function InterviewPage() {
  const [mode, setMode] = useState<Mode>('landing')
  const [plan, setPlan] = useState<InterviewPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Temporary state for job description and CV (in real app, would come from application)
  const [jobDescription, setJobDescription] = useState('')
  const [tailoredCV, setTailoredCV] = useState('')
  const [showInputs, setShowInputs] = useState(false)
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null)

  const handleWizardComplete = async (config: WizardConfig) => {
    // Store config and show input fields
    setWizardConfig(config)
    setShowInputs(true)
  }

  const handleGeneratePlan = async () => {
    if (!wizardConfig || !jobDescription.trim() || !tailoredCV.trim()) {
      setError('Please provide both job description and your CV')
      return
    }

    setMode('loading')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/interview/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          tailoredCV,
          config: wizardConfig,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate plan')
      }

      setPlan(data.plan)
      setMode('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interview plan')
      setMode('wizard')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!plan) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/interview/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription,
          tailoredCV,
          config: plan.config,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate plan')
      }

      setPlan({
        ...data.plan,
        regenerationCount: (plan.regenerationCount || 0) + 1,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate plan')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewConfig = () => {
    setPlan(null)
    setWizardConfig(null)
    setShowInputs(false)
    setMode('wizard')
  }

  // Loading state
  if (mode === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-rose/20 rounded-full blur-xl animate-pulse" />
          <div className="relative h-16 w-16 rounded-full bg-rose-light flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-rose animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Generating Your Interview Plan
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Analyzing interviewer profile and tailoring questions...
          </p>
        </div>
      </div>
    )
  }

  // Dashboard mode - Show the gamified Simulation Board
  if (mode === 'dashboard' && plan) {
    return (
      <InterviewSimulationBoard
        plan={plan}
        onRegenerate={handleRegenerate}
        onNewConfig={handleNewConfig}
        isRegenerating={isLoading}
      />
    )
  }

  // Wizard mode with input fields
  if (mode === 'wizard' && showInputs && wizardConfig) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowInputs(false)
              setWizardConfig(null)
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Wizard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose" />
              Final Step: Provide Context
            </CardTitle>
            <CardDescription>
              Paste the job description and your CV so we can generate tailored questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description *</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the full job description here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                className="min-h-[150px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tailoredCV">Your CV/Resume *</Label>
              <Textarea
                id="tailoredCV"
                placeholder="Paste your tailored CV text here..."
                value={tailoredCV}
                onChange={e => setTailoredCV(e.target.value)}
                className="min-h-[150px]"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              variant="companion"
              size="lg"
              className="w-full"
              onClick={handleGeneratePlan}
              disabled={!jobDescription.trim() || !tailoredCV.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Interview Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Wizard mode
  if (mode === 'wizard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setMode('landing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Interview Setup</h1>
            <p className="text-muted-foreground">
              Configure your personalized interview simulation
            </p>
          </div>
        </div>

        <InterviewSetupWizard
          onComplete={handleWizardComplete}
          onCancel={() => setMode('landing')}
        />
      </div>
    )
  }

  // STAR Builder mode
  if (mode === 'star-builder') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setMode('landing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">STAR Story Builder</h1>
            <p className="text-muted-foreground">
              Structure your interview answers using the STAR method with PM coaching
            </p>
          </div>
        </div>

        <STARBuilder />
      </div>
    )
  }

  // Landing mode (default)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interview Coach</h1>
        <p className="text-muted-foreground">
          I&apos;ll be your practice partner. Let&apos;s build your confidence together.
        </p>
      </div>

      {/* New Interview Plan Card */}
      <Card className="border-rose/30 bg-gradient-to-br from-rose-light/30 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose" />
            Smart Interview Prep
          </CardTitle>
          <CardDescription>
            Create a personalized interview plan based on the role and interviewer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Our AI will analyze your target interviewer (you can even paste their LinkedIn bio!)
            and generate tailored questions, hidden agendas, and winning strategies.
          </p>
          <Button variant="companion" onClick={() => setMode('wizard')}>
            <Play className="h-4 w-4 mr-2" />
            Start Interview Wizard
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Behavioral Practice
            </CardTitle>
            <CardDescription>
              Practice STAR-format answers for common behavioral questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              I&apos;ll ask you questions, listen to your answers, and give you constructive feedback.
              Struggling is part of learning—that&apos;s why we practice here, where it&apos;s safe.
            </p>
            <Button variant="outline" onClick={() => setMode('star-builder')}>
              <Play className="h-4 w-4 mr-2" />
              STAR Story Builder
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Technical Practice
            </CardTitle>
            <CardDescription>
              Practice technical and system design questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              I&apos;ll simulate technical interviews tailored to your target role.
              We&apos;ll work through problems together and I&apos;ll help you articulate your thinking.
            </p>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Quick Practice
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-companion/10 flex items-center justify-center shrink-0">
              <Mic className="h-5 w-5 text-companion" />
            </div>
            <div>
              <p className="font-medium">Remember</p>
              <p className="text-sm text-muted-foreground">
                Interviews are conversations, not interrogations. You&apos;re interviewing them too.
                Let&apos;s practice not just answering questions, but feeling confident in who you are.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
