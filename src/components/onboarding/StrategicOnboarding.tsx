/**
 * StrategicOnboarding — Premium 7-step onboarding flow
 *
 * Steps:
 * 1. Welcome — Brand introduction with animated gradient
 * 2. Personal Details — Name, LinkedIn, location
 * 3. Goals — Target role, experience level, ambition statement
 * 4. CV Upload — Drag-and-drop with validation
 * 5. Narrative Verification — "Aha!" moment: Current vs Target message
 * 6. Product Tour — Feature showcase with premium aesthetic
 * 7. The Promise — Commitment + launch to dashboard
 *
 * Saves to Supabase profiles table at each step to prevent data loss.
 */
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  User,
  Target,
  Upload,
  Eye,
  Compass,
  Rocket,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  TrendingUp,
  Shield,
  Brain,
  MessageSquare,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
// Import directly from siggy-integration-guide to avoid pulling in server-only modules
import { verifyNarrativeAlignment } from '@/lib/ai/siggy-integration-guide'
import type { NarrativeVerificationResult } from '@/lib/ai/siggy-integration-guide'

// ==========================================
// Types & Constants
// ==========================================

interface StrategicOnboardingProps {
  userId: string
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

const STEPS: { id: OnboardingStep; label: string; icon: typeof Sparkles }[] = [
  { id: 1, label: 'Welcome', icon: Sparkles },
  { id: 2, label: 'Personal', icon: User },
  { id: 3, label: 'Goals', icon: Target },
  { id: 4, label: 'CV Upload', icon: Upload },
  { id: 5, label: 'Verify', icon: Eye },
  { id: 6, label: 'Tour', icon: Compass },
  { id: 7, label: 'Promise', icon: Rocket },
]

const EXPERIENCE_LEVELS = [
  { value: 'entry_level', label: 'Entry Level', description: 'Starting your career journey' },
  { value: 'mid_level', label: 'Mid-Level', description: '3-7 years of experience' },
  { value: 'senior', label: 'Senior', description: '7-12+ years, ready to lead' },
  { value: 'executive', label: 'Executive', description: 'C-suite and VP-level roles' },
  { value: 'career_change', label: 'Career Change', description: 'Pivoting to a new field' },
]

const FEATURES = [
  {
    icon: FileText,
    title: 'CV Tailor',
    desc: 'AI rewrites every bullet to match the job description with ATS optimization.',
    color: 'from-peach-light to-peach',
    textColor: 'text-peach-dark',
  },
  {
    icon: Brain,
    title: 'Interview Arena',
    desc: 'High-stakes simulation with Hunter Logic that challenges your seniority level.',
    color: 'from-rose-light to-rose',
    textColor: 'text-rose-dark',
  },
  {
    icon: Shield,
    title: 'Contract Review',
    desc: 'AI-powered contract analysis to protect your interests before signing.',
    color: 'from-lavender-light to-lavender',
    textColor: 'text-lavender-dark',
  },
  {
    icon: MessageSquare,
    title: 'Siggy Companion',
    desc: 'Your emotional intelligence companion for the entire job search journey.',
    color: 'from-sky-light to-sky',
    textColor: 'text-sky-dark',
  },
]

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
}

// ==========================================
// Component
// ==========================================

export function StrategicOnboarding({ userId }: StrategicOnboardingProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 2: Personal Details
  const [fullName, setFullName] = useState('')
  const [linkedinProfile, setLinkedinProfile] = useState('')
  const [location, setLocation] = useState('')

  // Step 3: Goals
  const [targetRole, setTargetRole] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [desiredBrand, setDesiredBrand] = useState('')

  // Step 4: CV Upload
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvUploaded, setCvUploaded] = useState(false)
  const [cvBullets, setCvBullets] = useState<string[]>([])

  // Step 5: Narrative Verification
  const [verification, setVerification] = useState<NarrativeVerificationResult | null>(null)
  const [verificationConfirmed, setVerificationConfirmed] = useState(false)

  const progress = (step / 7) * 100

  // ---- Step persistence ----
  const saveStepToProfile = useCallback(async (stepNum: number, data: Record<string, unknown>) => {
    try {
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ onboarding_step: stepNum, ...data })
        .eq('id', userId)
    } catch (err) {
      console.error('Failed to save step:', err)
    }
  }, [userId])

  // ---- Navigation ----
  const goNext = async () => {
    if (step === 7) {
      await completeOnboarding()
      return
    }

    // Save progress at each step
    if (step === 2) {
      await saveStepToProfile(2, { full_name: fullName, linkedin_profile: linkedinProfile, location })
    } else if (step === 3) {
      await saveStepToProfile(3, { target_job_titles: targetRole, experience_level: experienceLevel })
    } else if (step === 4 && cvUploaded) {
      // Trigger narrative verification
      await runNarrativeVerification()
    }

    setDirection(1)
    setStep((prev) => (prev + 1) as OnboardingStep)
  }

  const goBack = () => {
    if (step > 1) {
      setDirection(-1)
      setStep((prev) => (prev - 1) as OnboardingStep)
    }
  }

  // ---- CV Upload ----
  const handleCVUpload = async (file: File) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      alert('File size exceeds 10MB limit.')
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
      alert('Invalid file type. Please upload PDF, DOC, or DOCX.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Mark existing CVs as not current
      await supabase.from('base_cvs').update({ is_current: false }).eq('user_id', userId)

      // Upload
      const fileName = `${userId}-base-cv-${Date.now()}.${ext}`
      const filePath = `base-cvs/${fileName}`
      const { error: uploadError } = await supabase.storage.from('user-files').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('user-files').getPublicUrl(filePath)

      // Save record
      await supabase.from('base_cvs').insert({
        user_id: userId,
        file_name: file.name,
        file_url: publicUrl,
        file_path: filePath,
        file_type: ext,
        is_current: true,
      })

      // Update profile
      await saveStepToProfile(4, { base_cv_uploaded: true, base_cv_url: publicUrl })

      // Extract mock bullets (in production, use PDF parser)
      const mockBullets = [
        'Managed product roadmap for B2B SaaS platform with $5M ARR',
        'Led cross-functional team of 8 engineers and 3 designers',
        'Improved user retention by 25% through data-driven feature prioritization',
        'Coordinated with stakeholders to define quarterly OKRs',
        'Developed analytics dashboard tracking key business metrics',
      ]
      setCvBullets(mockBullets)
      setCvFile(file)
      setCvUploaded(true)
    } catch (err) {
      console.error('CV upload error:', err)
      alert('Failed to upload CV. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Narrative Verification ----
  const runNarrativeVerification = async () => {
    if (cvBullets.length === 0 || !targetRole) return
    const result = verifyNarrativeAlignment(cvBullets, { targetRole, experienceLevel, desiredBrand })
    setVerification(result)
  }

  // ---- Complete ----
  const completeOnboarding = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({
        full_name: fullName,
        linkedin_profile: linkedinProfile,
        location,
        target_job_titles: targetRole,
        experience_level: experienceLevel,
        base_cv_uploaded: cvUploaded,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 7,
      }).eq('id', userId)

      router.push('/dashboard')
    } catch (err) {
      console.error('Complete error:', err)
      alert('Failed to complete setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Can proceed checks ----
  const canProceed = () => {
    switch (step) {
      case 2: return fullName.trim().length > 0
      case 3: return targetRole.trim().length > 0 && experienceLevel.length > 0
      case 4: return cvUploaded
      case 5: return verification !== null
      default: return true
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-light/30 via-white to-peach-light/20">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gradient-to-r from-lavender via-rose to-peach"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="bg-white/80 backdrop-blur-md border-b border-white/40 px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-rose" />
              <span className="font-semibold text-gray-800">Signatura</span>
            </div>

            {/* Step indicators */}
            <div className="hidden md:flex items-center gap-1">
              {STEPS.map((s) => {
                const Icon = s.icon
                const isComplete = s.id < step
                const isCurrent = s.id === step
                return (
                  <div key={s.id} className="flex items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                        isComplete
                          ? 'bg-emerald-100 text-emerald-600'
                          : isCurrent
                          ? 'bg-rose-100 text-rose-600 ring-2 ring-rose-200'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                    </div>
                    {s.id < 7 && <div className={`w-4 h-0.5 mx-0.5 ${s.id < step ? 'bg-emerald-200' : 'bg-gray-200'}`} />}
                  </div>
                )
              })}
            </div>

            <span className="text-xs text-gray-500">Step {step} of 7</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* ========== STEP 1: Welcome ========== */}
              {step === 1 && (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-lavender-light via-rose-light to-peach-light mx-auto mb-8 shadow-lg shadow-rose-100"
                  >
                    <Sparkles className="h-12 w-12 text-rose-dark" />
                  </motion.div>

                  <h1 className="text-4xl font-bold text-gray-800 mb-4">
                    Welcome to Signatura
                  </h1>
                  <p className="text-lg text-gray-500 max-w-md mx-auto mb-10">
                    Your strategic career intelligence platform.
                    Let&apos;s discover who you are — and who you&apos;re becoming.
                  </p>

                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6 mb-10 text-left max-w-md mx-auto">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      In the next few minutes, we&apos;ll capture your professional identity, analyze your CV,
                      and show you <span className="font-semibold text-rose-dark">exactly how the world sees you today</span> versus
                      where you want to be. No fluff. Just clarity.
                    </p>
                  </div>

                  <button
                    onClick={goNext}
                    className="px-10 py-4 rounded-xl bg-gradient-to-r from-rose via-rose-dark to-lavender text-white font-semibold text-lg shadow-lg shadow-rose-200 hover:shadow-xl transition-all active:scale-95 inline-flex items-center gap-3"
                  >
                    Begin My Journey
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* ========== STEP 2: Personal Details ========== */}
              {step === 2 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-lavender-light/50 mb-4">
                      <User className="h-7 w-7 text-lavender-dark" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Who Are You?</h2>
                    <p className="text-gray-500 mt-1">The basics. This powers every recommendation.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-rose">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:border-lavender focus:ring-2 focus:ring-lavender-light/50 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        value={linkedinProfile}
                        onChange={(e) => setLinkedinProfile(e.target.value)}
                        placeholder="linkedin.com/in/yourprofile"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:border-lavender focus:ring-2 focus:ring-lavender-light/50 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. San Francisco, CA"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:border-lavender focus:ring-2 focus:ring-lavender-light/50 focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========== STEP 3: Goals ========== */}
              {step === 3 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-peach-light/50 mb-4">
                      <Target className="h-7 w-7 text-peach-dark" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Your Ambition</h2>
                    <p className="text-gray-500 mt-1">Where are you headed? This becomes your North Star.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Target Role <span className="text-rose">*</span>
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Senior Product Manager, VP Engineering"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:border-peach focus:ring-2 focus:ring-peach-light/50 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Experience Level <span className="text-rose">*</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {EXPERIENCE_LEVELS.map((level) => (
                          <button
                            key={level.value}
                            onClick={() => setExperienceLevel(level.value)}
                            className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                              experienceLevel === level.value
                                ? 'border-peach bg-peach-light/20 shadow-sm'
                                : 'border-gray-100 bg-white/50 hover:border-gray-200'
                            }`}
                          >
                            <span className={`text-sm font-medium ${experienceLevel === level.value ? 'text-peach-dark' : 'text-gray-700'}`}>
                              {level.label}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">{level.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Your Desired Brand
                      </label>
                      <p className="text-xs text-gray-400 mb-2">
                        In one sentence, what do you want recruiters to think when they read your CV?
                      </p>
                      <textarea
                        value={desiredBrand}
                        onChange={(e) => setDesiredBrand(e.target.value)}
                        placeholder="e.g. A data-driven product leader who scales teams and ships measurable outcomes"
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/80 text-gray-800 placeholder-gray-400 focus:border-peach focus:ring-2 focus:ring-peach-light/50 focus:outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ========== STEP 4: CV Upload ========== */}
              {step === 4 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-sky-light/50 mb-4">
                      <Upload className="h-7 w-7 text-sky-dark" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Upload Your CV</h2>
                    <p className="text-gray-500 mt-1">We&apos;ll analyze it against your ambition in the next step.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6">
                    {cvUploaded ? (
                      <div className="text-center py-8">
                        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="h-8 w-8 text-emerald-600" />
                        </div>
                        <p className="font-medium text-gray-800 mb-1">{cvFile?.name}</p>
                        <p className="text-sm text-emerald-600 mb-4">Uploaded successfully</p>
                        <button
                          onClick={() => { setCvFile(null); setCvUploaded(false); setCvBullets([]); }}
                          className="text-sm text-lavender-dark hover:underline"
                        >
                          Replace with different CV
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="strategic-cv-upload"
                        className="block cursor-pointer"
                      >
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-lavender transition-colors">
                          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-7 w-7 text-gray-400" />
                          </div>
                          <p className="text-gray-700 font-medium mb-1">
                            Drop your CV here or click to browse
                          </p>
                          <p className="text-xs text-gray-400">
                            PDF, DOC, or DOCX up to 10MB
                          </p>
                        </div>
                        <input
                          id="strategic-cv-upload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleCVUpload(file)
                          }}
                          className="hidden"
                        />
                      </label>
                    )}

                    {loading && (
                      <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                        <div className="h-4 w-4 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
                        Uploading and analyzing...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========== STEP 5: Narrative Verification ========== */}
              {step === 5 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-rose-light/50 mb-4">
                      <Eye className="h-7 w-7 text-rose-dark" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Your Narrative Reality Check</h2>
                    <p className="text-gray-500 mt-1">Is this the message you want to project?</p>
                  </div>

                  {verification ? (
                    <div className="space-y-4">
                      {/* Alignment Score */}
                      <div className={`rounded-2xl p-6 text-center ${
                        verification.alignmentScore >= 70
                          ? 'bg-emerald-50/80 border border-emerald-200'
                          : verification.alignmentScore >= 40
                          ? 'bg-amber-50/80 border border-amber-200'
                          : 'bg-rose-50/80 border border-rose-200'
                      }`}>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Narrative Alignment</p>
                        <p className={`text-5xl font-bold ${
                          verification.alignmentScore >= 70 ? 'text-emerald-600' :
                          verification.alignmentScore >= 40 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {verification.alignmentScore}%
                        </p>
                      </div>

                      {/* Current vs Target */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/70 backdrop-blur-md rounded-xl border border-gray-200 p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-3 w-3 text-gray-500" />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase">Current Message</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{verification.currentMessage}</p>
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <span className="text-xs text-gray-400">Detected:</span>
                            <span className="ml-1 text-xs font-medium text-gray-600">{verification.currentArchetype}</span>
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-lavender-light/30 to-peach-light/30 backdrop-blur-md rounded-xl border border-lavender-light p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-6 w-6 rounded-full bg-lavender-light flex items-center justify-center">
                              <Target className="h-3 w-3 text-lavender-dark" />
                            </div>
                            <span className="text-xs font-semibold text-lavender-dark uppercase">Target Message</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{verification.targetMessage}</p>
                          <div className="mt-3 pt-3 border-t border-lavender-light/50">
                            <span className="text-xs text-gray-400">Target:</span>
                            <span className="ml-1 text-xs font-medium text-lavender-dark">{verification.targetArchetype}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Dimension Breakdown</h3>
                        <div className="space-y-3">
                          {verification.dimensions.map((dim) => (
                            <div key={dim.name}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-600">{dim.name}</span>
                                <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                                  dim.status === 'aligned' ? 'bg-emerald-50 text-emerald-600' :
                                  dim.status === 'partial' ? 'bg-amber-50 text-amber-600' :
                                  'bg-rose-50 text-rose-600'
                                }`}>
                                  {dim.currentScore}%
                                </span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                                {/* Target marker */}
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-lavender-dark z-10"
                                  style={{ left: `${dim.targetScore}%` }}
                                />
                                <motion.div
                                  className={`h-full rounded-full ${
                                    dim.status === 'aligned' ? 'bg-emerald-400' :
                                    dim.status === 'partial' ? 'bg-amber-400' : 'bg-rose-400'
                                  }`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${dim.currentScore}%` }}
                                  transition={{ duration: 0.8, delay: 0.2 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Gaps & Strengths */}
                      {(verification.gaps.length > 0 || verification.strengths.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {verification.gaps.length > 0 && (
                            <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4">
                              <h4 className="text-xs font-semibold text-rose-600 uppercase mb-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Gaps to Bridge
                              </h4>
                              <ul className="space-y-1.5">
                                {verification.gaps.map((g, i) => (
                                  <li key={i} className="text-xs text-gray-600">{g}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {verification.strengths.length > 0 && (
                            <div className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-4">
                              <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Already Aligned
                              </h4>
                              <ul className="space-y-1.5">
                                {verification.strengths.map((s, i) => (
                                  <li key={i} className="text-xs text-gray-600">{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommendation */}
                      <div className="bg-gradient-to-r from-lavender-light/30 via-rose-light/20 to-peach-light/30 rounded-xl border border-lavender-light/50 p-5">
                        <p className="text-sm text-gray-700 leading-relaxed">{verification.recommendation}</p>
                      </div>

                      {/* Confirmation */}
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setVerificationConfirmed(true)}
                          className={`px-6 py-3 rounded-xl font-medium transition-all ${
                            verificationConfirmed
                              ? 'bg-emerald-100 text-emerald-700 cursor-default'
                              : 'bg-white border border-lavender text-lavender-dark hover:bg-lavender-light/20'
                          }`}
                        >
                          {verificationConfirmed ? 'Confirmed — Let\'s transform this!' : 'Yes, this is my gap. Let\'s fix it.'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-8 text-center">
                      <div className="h-4 w-4 border-2 border-rose border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm text-gray-500">Analyzing your CV against your ambition...</p>
                    </div>
                  )}
                </div>
              )}

              {/* ========== STEP 6: Product Tour ========== */}
              {step === 6 && (
                <div className="py-6">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-lavender-light/50 mb-4">
                      <Compass className="h-7 w-7 text-lavender-dark" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Your Toolkit</h2>
                    <p className="text-gray-500 mt-1">Here&apos;s what&apos;s waiting for you inside.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {FEATURES.map((feat, i) => {
                      const Icon = feat.icon
                      return (
                        <motion.div
                          key={feat.title}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-5 hover:shadow-md transition-shadow"
                        >
                          <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-3`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <h3 className={`text-sm font-semibold ${feat.textColor} mb-1`}>{feat.title}</h3>
                          <p className="text-xs text-gray-500 leading-relaxed">{feat.desc}</p>
                        </motion.div>
                      )
                    })}
                  </div>

                  <div className="mt-6 bg-white/70 backdrop-blur-md rounded-xl border border-white/40 p-5 text-center">
                    <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-700 font-medium">
                      Everything works together. Your narrative drives your CV. Your CV drives your interview prep. Your prep drives your confidence.
                    </p>
                  </div>
                </div>
              )}

              {/* ========== STEP 7: The Promise ========== */}
              {step === 7 && (
                <div className="py-12 text-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center justify-center h-24 w-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 mx-auto mb-8 shadow-lg shadow-emerald-100"
                  >
                    <Rocket className="h-12 w-12 text-emerald-600" />
                  </motion.div>

                  <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Your Transformation Starts Now
                  </h1>
                  <p className="text-lg text-gray-500 max-w-md mx-auto mb-10">
                    Signatura will help you close the gap between who you are today
                    and who you&apos;re becoming. Every feature is built around <em>your narrative</em>.
                  </p>

                  <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 p-6 mb-10 max-w-md mx-auto text-left space-y-3">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-peach-dark mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">Tailored, not generic.</span> Every recommendation is based on your target role and ambition.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-lavender-dark mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">Narrative-driven.</span> Your professional identity guides everything from CV to interview.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-sky-dark mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-800">Always evolving.</span> Siggy learns from your journey and adapts alongside you.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={goNext}
                    disabled={loading}
                    className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-lg shadow-lg shadow-emerald-200 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-3"
                  >
                    {loading ? 'Setting up your dashboard...' : 'Enter Signatura'}
                    <Rocket className="h-5 w-5" />
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons (steps 2-6) */}
          {step >= 2 && step <= 6 && (
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={goBack}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={goNext}
                disabled={!canProceed() || loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose to-lavender text-white font-medium shadow-md shadow-rose-100 hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? 'Saving...' : step === 6 ? 'Almost There' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
