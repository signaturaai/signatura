'use client'

/**
 * Section Comparison Viewer
 *
 * Displays side-by-side comparison of Base vs Tailored CV sections
 * with scoring and highlighting of which version was chosen.
 *
 * Terminology:
 * - "Base" = the original uploaded CV
 * - "Tailored" = the AI-optimized version
 */

import { useState } from 'react'
import { SectionComparison } from '@/lib/cv'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'

interface SectionComparisonViewerProps {
  comparisons: SectionComparison[]
  className?: string
}

export function SectionComparisonViewer({
  comparisons,
  className = '',
}: SectionComparisonViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionName)) {
        next.delete(sectionName)
      } else {
        next.add(sectionName)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSections(new Set(comparisons.map((c) => c.sectionName)))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  if (!comparisons || comparisons.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        No section comparisons available
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {comparisons.filter((c) => c.chosen === 'tailored').length} sections improved
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-600">
            {comparisons.filter((c) => c.chosen === 'base').length} sections kept base version
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Section comparisons */}
      {comparisons.map((comparison) => (
        <SectionComparisonCard
          key={comparison.sectionName}
          comparison={comparison}
          isExpanded={expandedSections.has(comparison.sectionName)}
          onToggle={() => toggleSection(comparison.sectionName)}
        />
      ))}
    </div>
  )
}

interface SectionComparisonCardProps {
  comparison: SectionComparison
  isExpanded: boolean
  onToggle: () => void
}

function SectionComparisonCard({
  comparison,
  isExpanded,
  onToggle,
}: SectionComparisonCardProps) {
  const { sectionName, base, tailored, chosen, improvement, reason } = comparison

  const isImproved = chosen === 'tailored' && improvement > 0
  const isNewSection = base.text === ''
  const isMissingSection = tailored.text === ''

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isImproved
          ? 'border-green-200 bg-green-50/50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Status icon */}
          {isImproved ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : isMissingSection ? (
            <XCircle className="w-5 h-5 text-yellow-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
          )}

          {/* Section name */}
          <span className="font-medium text-gray-900">{sectionName}</span>

          {/* Status badge */}
          {isNewSection && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              New section
            </span>
          )}
          {isMissingSection && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
              Kept base
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Score comparison */}
          <div className="flex items-center gap-2 text-sm">
            <ScoreBadge score={base.score} label="Base" />
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <ScoreBadge
              score={chosen === 'tailored' ? tailored.score : base.score}
              label="Final"
              highlight={isImproved}
            />
            {improvement > 0 && (
              <span className="text-green-600 text-xs font-medium">
                +{improvement.toFixed(1)}
              </span>
            )}
          </div>

          {/* Expand/collapse icon */}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* Reason */}
          <p className="text-sm text-gray-600 mt-3 mb-4 italic">{reason}</p>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base version */}
            <div
              className={`p-3 rounded-lg border ${
                chosen === 'base'
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Base
                  {chosen === 'base' && (
                    <span className="ml-2 text-xs text-blue-600">(chosen)</span>
                  )}
                </span>
                <ScoreBadge score={base.score} size="sm" />
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {base.text || <em className="text-gray-400">Section not present</em>}
              </div>
            </div>

            {/* Tailored version */}
            <div
              className={`p-3 rounded-lg border ${
                chosen === 'tailored'
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Tailored
                  {chosen === 'tailored' && (
                    <span className="ml-2 text-xs text-green-600">(chosen)</span>
                  )}
                </span>
                <ScoreBadge score={tailored.score} size="sm" />
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {tailored.text || (
                  <em className="text-gray-400">Section not present</em>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ScoreBadgeProps {
  score: number
  label?: string
  size?: 'sm' | 'md'
  highlight?: boolean
}

function ScoreBadge({ score, label, size = 'md', highlight = false }: ScoreBadgeProps) {
  const getColorClass = () => {
    if (score >= 7) return highlight ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'
    if (score >= 5) return highlight ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700'
    if (score > 0) return highlight ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-500'
  }

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'

  return (
    <span className={`rounded font-medium ${sizeClasses} ${getColorClass()}`}>
      {label && <span className="mr-1">{label}:</span>}
      {score > 0 ? score.toFixed(1) : '-'}
    </span>
  )
}

export default SectionComparisonViewer
