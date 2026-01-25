'use client'

/**
 * Tailoring Results Display
 *
 * Shows the overall results of a CV tailoring operation including
 * score improvements, statistics, and the final CV text.
 */

import { TailoringResult } from '@/lib/cv'
import { SectionComparisonViewer } from './SectionComparisonViewer'
import { TrendingUp, Clock, Zap, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react'
import { useState } from 'react'

interface TailoringResultsDisplayProps {
  result: TailoringResult
  onCopy?: (text: string) => void
  onDownload?: (text: string, filename: string) => void
  className?: string
}

export function TailoringResultsDisplay({
  result,
  onCopy,
  onDownload,
  className = '',
}: TailoringResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState<'final' | 'comparison'>('final')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.finalCVText)
      setCopied(true)
      onCopy?.(result.finalCVText)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([result.finalCVText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tailored-cv.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onDownload?.(result.finalCVText, 'tailored-cv.txt')
  }

  if (!result.success) {
    return (
      <div className={`p-6 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-medium text-red-900">Tailoring Failed</h3>
            <p className="text-sm text-red-700 mt-1">{result.error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    )
  }

  const improvementPercent = result.baseOverallScore > 0
    ? ((result.overallImprovement / result.baseOverallScore) * 100).toFixed(0)
    : '0'

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success header */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h3 className="font-medium text-green-900">
              CV Successfully Tailored
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Your CV has been optimized while preserving all original strengths.
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Score improvement */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Improvement</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              +{result.overallImprovement.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">points</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {improvementPercent}% increase
          </div>
        </div>

        {/* Final score */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Final Score</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                result.finalOverallScore >= 7
                  ? 'text-green-600'
                  : result.finalOverallScore >= 5
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {result.finalOverallScore.toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">/10</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Was {result.baseOverallScore.toFixed(1)}/10
          </div>
        </div>

        {/* Sections improved */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Sections</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {result.sectionsImproved}
            </span>
            <span className="text-sm text-gray-500">
              /{result.totalSections} improved
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {result.sectionsKeptOriginal} kept original
          </div>
        </div>

        {/* Processing time */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Time</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-700">
              {(result.processingTimeMs / 1000).toFixed(1)}
            </span>
            <span className="text-sm text-gray-500">seconds</span>
          </div>
          {result.tokensUsed && (
            <div className="text-xs text-gray-500 mt-1">
              {result.tokensUsed.toLocaleString()} tokens used
            </div>
          )}
        </div>
      </div>

      {/* Score comparison bar */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Score Comparison</h4>
        <div className="space-y-3">
          {/* Base score */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Original</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400 rounded-full transition-all duration-500"
                style={{ width: `${(result.baseOverallScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right">
              {result.baseOverallScore.toFixed(1)}
            </span>
          </div>

          {/* Final score */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Final</span>
            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  result.finalOverallScore >= 7
                    ? 'bg-green-500'
                    : result.finalOverallScore >= 5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${(result.finalOverallScore / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium w-12 text-right">
              {result.finalOverallScore.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('final')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'final'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Final CV
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Section Comparison ({result.sectionComparisons.length})
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'final' ? (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          {/* Actions */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          {/* CV text */}
          <div className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg max-h-[600px] overflow-y-auto">
            {result.finalCVText}
          </div>
        </div>
      ) : (
        <SectionComparisonViewer comparisons={result.sectionComparisons} />
      )}
    </div>
  )
}

export default TailoringResultsDisplay
