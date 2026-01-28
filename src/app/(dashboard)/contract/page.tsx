'use client'

/**
 * Contract Reviewer Page
 *
 * Module 5 (Final MVP): AI-powered employment contract analysis.
 *
 * States:
 * 1. Upload Zone - Drag-and-drop contract upload
 * 2. Legal Dashboard - Analysis results with clause explorer
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContractUploader } from '@/components/contract/ContractUploader'
import { ContractDashboard } from '@/components/contract/ContractDashboard'
import { getMockContractAnalysis } from '@/lib/contract'
import type { ContractAnalysisResult, ContractFileType } from '@/types/contract'

// Toggle this to use real API vs mock data
const USE_MOCK = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_AI === 'true'

export default function ContractReviewerPage() {
  const [stage, setStage] = useState<'upload' | 'dashboard'>('upload')
  const [analysis, setAnalysis] = useState<ContractAnalysisResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUploadComplete = async (
    fileUrl: string,
    uploadedFileName: string,
    fileType: ContractFileType
  ) => {
    setIsAnalyzing(true)
    setError(null)
    setFileName(uploadedFileName)

    try {
      if (USE_MOCK) {
        // Use mock data for UI testing
        await new Promise((resolve) => setTimeout(resolve, 2500)) // Simulate API delay (contracts take longer)
        const mockAnalysis = getMockContractAnalysis()
        setAnalysis(mockAnalysis)
        setStage('dashboard')
      } else {
        // Call real API
        const response = await fetch('/api/contract/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl,
            fileName: uploadedFileName,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to analyze contract')
        }

        const result = await response.json()
        setAnalysis(result.analysis)
        setStage('dashboard')
      }
    } catch (err) {
      console.error('Error analyzing contract:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleBack = () => {
    setStage('upload')
    setAnalysis(null)
    setFileName(null)
    setError(null)
  }

  const handleAnalyzeAnother = () => {
    setStage('upload')
    setAnalysis(null)
    setFileName(null)
    setError(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">Contract Reviewer</h1>
        <p className="text-gray-600 mt-2">
          {stage === 'upload'
            ? 'Upload your employment contract for AI-powered legal analysis'
            : 'Your contract analysis is ready'}
        </p>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <ContractUploader
              onUploadComplete={handleUploadComplete}
              isAnalyzing={isAnalyzing}
            />

            {/* Processing Indicator */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Analyzing your contract...</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Our AI is reviewing clauses and identifying potential concerns. This may take 10-20 seconds.
                      </p>
                    </div>
                  </div>

                  {/* Progress Steps */}
                  <div className="mt-6 space-y-3">
                    <AnalysisStep
                      step={1}
                      label="Extracting text from document"
                      isComplete={true}
                      isCurrent={false}
                    />
                    <AnalysisStep
                      step={2}
                      label="Identifying contract clauses"
                      isComplete={false}
                      isCurrent={true}
                    />
                    <AnalysisStep
                      step={3}
                      label="Analyzing legal implications"
                      isComplete={false}
                      isCurrent={false}
                    />
                    <AnalysisStep
                      step={4}
                      label="Generating recommendations"
                      isComplete={false}
                      isCurrent={false}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Info Section */}
            {!isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 grid md:grid-cols-3 gap-4"
              >
                <InfoCard
                  title="Identify Red Flags"
                  description="AI scans for problematic clauses like restrictive non-competes or broad IP assignments."
                  icon="flag"
                />
                <InfoCard
                  title="Plain English"
                  description="Complex legal jargon translated into easy-to-understand language."
                  icon="translate"
                />
                <InfoCard
                  title="Negotiation Tips"
                  description="Get actionable advice on what to negotiate before signing."
                  icon="lightbulb"
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {stage === 'dashboard' && analysis && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ContractDashboard
              analysis={analysis}
              fileName={fileName || undefined}
              onBack={handleBack}
              onAnalyzeAnother={handleAnalyzeAnother}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Analysis Step Component
function AnalysisStep({
  step,
  label,
  isComplete,
  isCurrent,
}: {
  step: number
  label: string
  isComplete: boolean
  isCurrent: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
          isComplete
            ? 'bg-blue-600 text-white'
            : isCurrent
              ? 'bg-blue-100 text-blue-600 animate-pulse'
              : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isComplete ? '✓' : step}
      </div>
      <span
        className={`text-sm ${
          isComplete
            ? 'text-blue-700 font-medium'
            : isCurrent
              ? 'text-blue-600'
              : 'text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

// Info Card Component
function InfoCard({
  title,
  description,
  icon,
}: {
  title: string
  description: string
  icon: 'flag' | 'translate' | 'lightbulb'
}) {
  const iconMap = {
    flag: (
      <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    translate: (
      <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    lightbulb: (
      <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  }

  return (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        {iconMap[icon]}
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  )
}
