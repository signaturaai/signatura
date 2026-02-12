'use client'

/**
 * Interview Coach - Application-Centric with Intelligence Continuity
 *
 * Requires application selection first, then pulls:
 * - Job description from the application
 * - Tailored CV from cv_tailoring_sessions (if exists)
 * - Company context for personalized interview prep
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Textarea, Label } from '@/components/ui'
import {
  Mic,
  Play,
  Sparkles,
  ArrowLeft,
  FileText,
  Loader2,
  Briefcase,
  ChevronDown,
  Plus,
  Building2,
  CheckCircle,
  AlertTriangle,
  Brain,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { InterviewSetupWizard, InterviewSimulationBoard, STARBuilder } from '@/components/interview'
import type { WizardConfig, InterviewPlan } from '@/types/interview'
import { createClient } from '@/lib/supabase/client'

interface Application {
  id: string
  company_name: string
  position_title: string
  job_description: string | null
  application_status: string
  industry: string | null
  salary_range: string | null
  created_at: string
}

interface TailoringSession {
  id: string
  final_cv_text: string
  final_overall_score: number
  created_at: string
}

interface GlobalInsight {
  id: string
  insight_type: string
  insight_text: string
  source_application_id: string | null
  created_at: string
}

type Mode = 'loading' | 'select-application' | 'landing' | 'wizard' | 'dashboard' | 'generating' | 'star-builder'

export default function InterviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationIdFromUrl = searchParams.get('application_id')
  const returnTo = searchParams.get('returnTo') || '/dashboard'

  // Application state
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [isLoadingApplications, setIsLoadingApplications] = useState(true)
  const [showApplicationDropdown, setShowApplicationDropdown] = useState(false)

  // Intelligence continuity state
  const [tailoredCV, setTailoredCV] = useState<string>('')
  const [tailoringSession, setTailoringSession] = useState<TailoringSession | null>(null)
  const [globalInsights, setGlobalInsights] = useState<GlobalInsight[]>([])

  // Interview state
  const [mode, setMode] = useState<Mode>('loading')
  const [plan, setPlan] = useState<InterviewPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null)
  const [showInputs, setShowInputs] = useState(false)
  const [jobDescription, setJobDescription] = useState('')

  const supabase = createClient()

  // Fetch applications on mount
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch applications
      // IMPORTANT: All column names MUST be lowercase to match PostgreSQL schema
      const { data: apps } = await (supabase.from('job_applications') as any)
        .select('id, company_name, position_title, job_description, application_status, industry, salary_range, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Fetch global insights for cross-pollination
      const { data: insights } = await (supabase.from('global_user_insights') as any)
        .select('id, insight_type, insight_text, source_application_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setApplications(apps || [])
      setGlobalInsights(insights || [])
      setIsLoadingApplications(false)

      // Auto-select application if ID provided in URL
      if (applicationIdFromUrl && apps) {
        const app = apps.find((a: Application) => a.id === applicationIdFromUrl)
        if (app) {
          setSelectedApplication(app)
          if (app.job_description) {
            setJobDescription(app.job_description)
          }
          // Fetch tailored CV for this application
          await fetchTailoredCV(user.id, applicationIdFromUrl)
          setMode('landing')
        } else {
          setMode('select-application')
        }
      } else if (apps && apps.length === 0) {
        setMode('select-application')
      } else {
        setMode('select-application')
      }
    }

    fetchData()
  }, [applicationIdFromUrl, router, supabase])

  // Fetch tailored CV for an application
  const fetchTailoredCV = async (userId: string, applicationId: string) => {
    const { data: sessions } = await (supabase.from('cv_tailoring_sessions') as any)
      .select('id, final_cv_text, final_overall_score, created_at')
      .eq('user_id', userId)
      .eq('application_id', applicationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessions && sessions.length > 0) {
      setTailoringSession(sessions[0])
      setTailoredCV(sessions[0].final_cv_text || '')
    } else {
      setTailoringSession(null)
      setTailoredCV('')
    }
  }

  // Handle application selection
  const handleSelectApplication = async (app: Application) => {
    setSelectedApplication(app)
    setJobDescription(app.job_description || '')
    setShowApplicationDropdown(false)

    // Fetch tailored CV for this application
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await fetchTailoredCV(user.id, app.id)
    }

    setMode('landing')
  }

  const handleWizardComplete = async (config: WizardConfig) => {
    setWizardConfig(config)
    setShowInputs(true)
  }

  const handleGeneratePlan = async () => {
    if (!wizardConfig || !selectedApplication) {
      setError('Please select an application first')
      return
    }

    // Use tailored CV if available, otherwise prompt for manual input
    const cvText = tailoredCV || ''
    const jdText = jobDescription || selectedApplication.job_description || ''

    if (!jdText.trim()) {
      setError('Job description is required')
      return
    }

    setMode('generating')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/interview/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobDescription: jdText,
          tailoredCV: cvText,
          config: wizardConfig,
          applicationId: selectedApplication.id,
          companyName: selectedApplication.company_name,
          positionTitle: selectedApplication.position_title,
          industry: selectedApplication.industry,
          // Include global insights for cross-pollination
          globalInsights: globalInsights.map(i => ({
            type: i.insight_type,
            text: i.insight_text,
          })),
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
    if (!plan || !selectedApplication) return

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
          applicationId: selectedApplication.id,
          companyName: selectedApplication.company_name,
          positionTitle: selectedApplication.position_title,
          industry: selectedApplication.industry,
          globalInsights: globalInsights.map(i => ({
            type: i.insight_type,
            text: i.insight_text,
          })),
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

  const getBackUrl = () => {
    if (selectedApplication) {
      return `/applications/${selectedApplication.id}`
    }
    return returnTo
  }

  // Loading state
  if (mode === 'loading' || isLoadingApplications) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose" />
          <p className="text-gray-500 mt-2">Loading your applications...</p>
        </div>
      </div>
    )
  }

  // Generating state
  if (mode === 'generating') {
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
            {selectedApplication
              ? `Preparing for ${selectedApplication.company_name}...`
              : 'Analyzing interviewer profile and tailoring questions...'}
          </p>
          {tailoringSession && (
            <p className="text-xs text-green-600 mt-2">
              Using your tailored CV (Score: {tailoringSession.final_overall_score?.toFixed(1)})
            </p>
          )}
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

  // Select Application mode - No applications exist
  if (mode === 'select-application' && applications.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={returnTo}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Interview Coach</h1>
        </div>

        <Card className="border-rose/30 bg-gradient-to-br from-rose-light/20 to-white">
          <CardContent className="pt-8 pb-8 text-center">
            <Building2 className="w-12 h-12 mx-auto text-rose mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No Applications Yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To practice interviews, you first need to create a job application.
              This helps us tailor the interview preparation to the specific role.
            </p>
            <Button asChild className="bg-rose hover:bg-rose-dark">
              <Link href="/applications?new=true&returnTo=/interview">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Application
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Select Application mode - Applications exist but none selected
  if (mode === 'select-application') {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={returnTo}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Interview Coach</h1>
          <p className="text-muted-foreground">
            Select an application to practice for that specific interview.
          </p>
        </div>

        {/* Application Selection Card */}
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-5 w-5 text-amber-600" />
              Step 1: Select an Application
            </CardTitle>
            <CardDescription>
              Choose which job you want to prepare for, so we can tailor the interview practice.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowApplicationDropdown(!showApplicationDropdown)}
                >
                  <span className="text-gray-500">Select an application...</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              {showApplicationDropdown && (
                <div className="border rounded-lg bg-white shadow-lg max-h-64 overflow-y-auto">
                  {applications.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleSelectApplication(app)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-rose-light/20 transition-colors text-left border-b last:border-b-0"
                    >
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-light/50 to-lavender-light/50 flex items-center justify-center font-semibold text-rose text-sm">
                        {app.company_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate text-sm">{app.position_title}</p>
                        <p className="text-xs text-gray-500 truncate">{app.company_name}</p>
                      </div>
                      {app.job_description && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          Has JD
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="text-center text-sm text-gray-500">or</div>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/applications?new=true&returnTo=/interview">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Application
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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

        {/* Intelligence Continuity Banner */}
        {tailoringSession && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Tailored CV Detected</p>
                  <p className="text-sm text-green-700 mt-1">
                    We found your tailored CV for {selectedApplication?.company_name}.
                    Your interview questions will be personalized based on this CV.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!tailoringSession && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">No Tailored CV Found</p>
                  <p className="text-sm text-amber-700 mt-1">
                    For better interview prep, consider{' '}
                    <Link href={`/cv/tailor?application_id=${selectedApplication?.id}`} className="underline">
                      tailoring your CV first
                    </Link>
                    . You can still proceed with manual input below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-rose" />
              Final Step: Review Context
            </CardTitle>
            <CardDescription>
              {tailoringSession
                ? 'Your tailored CV will be used. Review the job description below.'
                : 'Paste your CV if you haven\'t tailored it yet.'}
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

            {!tailoringSession && (
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
            )}

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
              disabled={!jobDescription.trim() || (!tailoringSession && !tailoredCV.trim())}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Interview Plan for {selectedApplication?.company_name}
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
              Configure your personalized interview simulation for {selectedApplication?.company_name}
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

  // Landing mode (default) - Application selected
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link
            href={getBackUrl()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {selectedApplication ? `Back to ${selectedApplication.company_name}` : 'Back to Dashboard'}
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Interview Coach</h1>
        <p className="text-muted-foreground">
          I'll be your practice partner. Let's build your confidence together.
        </p>
      </div>

      {/* Selected Application Card */}
      <Card className="border-rose/30 bg-gradient-to-br from-rose-light/10 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-rose" />
              Preparing for Interview
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode('select-application')}
            >
              Change
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-rose-light to-lavender-light flex items-center justify-center font-semibold text-rose text-lg">
              {selectedApplication?.company_name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-800">{selectedApplication?.position_title}</p>
              <p className="text-sm text-gray-500">{selectedApplication?.company_name}</p>
            </div>
          </div>

          {/* Intelligence Status */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg ${tailoringSession ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 text-sm">
                <FileText className={`w-4 h-4 ${tailoringSession ? 'text-green-600' : 'text-gray-400'}`} />
                <span className={tailoringSession ? 'text-green-700 font-medium' : 'text-gray-500'}>
                  {tailoringSession ? 'Tailored CV Ready' : 'No Tailored CV'}
                </span>
              </div>
              {tailoringSession && (
                <p className="text-xs text-green-600 mt-1">Score: {tailoringSession.final_overall_score?.toFixed(1)}</p>
              )}
            </div>
            <div className={`p-3 rounded-lg ${selectedApplication?.job_description ? 'bg-green-50' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-2 text-sm">
                <Target className={`w-4 h-4 ${selectedApplication?.job_description ? 'text-green-600' : 'text-amber-500'}`} />
                <span className={selectedApplication?.job_description ? 'text-green-700 font-medium' : 'text-amber-600'}>
                  {selectedApplication?.job_description ? 'Job Description' : 'Add JD'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Insights Card */}
      {globalInsights.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" />
              Your Interview Strengths (from past sessions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {globalInsights.slice(0, 4).map((insight) => (
                <span
                  key={insight.id}
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                >
                  {insight.insight_text}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Interview Plan Card */}
      <Card className="border-rose/30 bg-gradient-to-br from-rose-light/30 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-rose" />
            Smart Interview Prep
          </CardTitle>
          <CardDescription>
            Create a personalized interview plan for {selectedApplication?.company_name}
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
              I'll ask you questions, listen to your answers, and give you constructive feedback.
              Struggling is part of learning—that's why we practice here, where it's safe.
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
              I'll simulate technical interviews tailored to your target role.
              We'll work through problems together and I'll help you articulate your thinking.
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
                Interviews are conversations, not interrogations. You're interviewing them too.
                Let's practice not just answering questions, but feeling confident in who you are.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
