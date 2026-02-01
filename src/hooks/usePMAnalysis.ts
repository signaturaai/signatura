/**
 * usePMAnalysis Hook
 *
 * Real-time PM principle analysis for CV bullets and interview answers.
 * Debounces input and returns score, suggestions, and missing principles.
 */

import { useState, useEffect } from 'react'
import { analyzePMContent } from '@/lib/ai/siggy-integration-guide'

export interface PMAnalysisResult {
  score: number
  feedback: {
    strengths: string
    suggestions: string[]
    missingPrinciples: Array<{
      id: string
      name: string
      howToApply: string
    }>
  }
}

export function usePMAnalysis(text: string, debounceMs: number = 500) {
  const [analysis, setAnalysis] = useState<PMAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => {
    if (text.length < 20) {
      setAnalysis(null)
      return
    }

    setIsAnalyzing(true)
    const timer = setTimeout(() => {
      const result = analyzePMContent(text)
      setAnalysis(result)
      setIsAnalyzing(false)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [text, debounceMs])

  return { analysis, isAnalyzing }
}
