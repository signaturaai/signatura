'use client'

/**
 * Indicator Breakdown Table
 *
 * Detailed table showing all indicators with scores, evidence, and suggestions.
 * Sortable, expandable, with export functionality.
 */

import { useState } from 'react'
import {
  IndicatorScores,
  getScoreColor,
  getScoreLabel,
  INDICATOR_SHORT_NAMES,
} from '@/lib/indicators'
import { Button } from '@/components/ui'
import { ChevronDown, ChevronUp, Download, ArrowUpDown } from 'lucide-react'

interface IndicatorBreakdownTableProps {
  scores: IndicatorScores
  showEvidence?: boolean
  showSuggestions?: boolean
  sortable?: boolean
  exportable?: boolean
  className?: string
}

type SortField = 'number' | 'score' | 'name'
type SortDirection = 'asc' | 'desc'

export function IndicatorBreakdownTable({
  scores,
  showEvidence = true,
  showSuggestions = true,
  sortable = true,
  exportable = true,
  className = '',
}: IndicatorBreakdownTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [sortField, setSortField] = useState<SortField>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Get sorted scores
  const sortedScores = Object.values(scores.scores).sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'number':
        comparison = a.indicatorNumber - b.indicatorNumber
        break
      case 'score':
        comparison = b.score - a.score // Higher scores first by default
        break
      case 'name':
        comparison = a.indicatorName.localeCompare(b.indicatorName)
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Toggle row expansion
  const toggleRow = (num: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(num)) {
      newExpanded.delete(num)
    } else {
      newExpanded.add(num)
    }
    setExpandedRows(newExpanded)
  }

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'score' ? 'desc' : 'asc')
    }
  }

  // Export as CSV
  const exportCSV = () => {
    const headers = ['Indicator #', 'Name', 'Score', 'Label', 'Evidence', 'Suggestion']
    const rows = sortedScores.map(s => [
      s.indicatorNumber,
      s.indicatorName,
      s.score,
      getScoreLabel(s.score),
      `"${s.evidence.replace(/"/g, '""')}"`,
      `"${s.suggestion.replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `indicator-scores-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Score badge component
  const ScoreBadge = ({ score }: { score: number }) => {
    const colors = getScoreColor(score)
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
        {score.toFixed(1)}
      </span>
    )
  }

  // Sort button
  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
      disabled={!sortable}
    >
      {label}
      {sortable && (
        <ArrowUpDown className={`h-4 w-4 ${sortField === field ? 'text-rose' : 'text-gray-400'}`} />
      )}
    </button>
  )

  return (
    <div className={`${className}`}>
      {/* Header with export */}
      {exportable && (
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <SortButton field="number" label="#" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="name" label="Indicator" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                <SortButton field="score" label="Score" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Level
              </th>
              {(showEvidence || showSuggestions) && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Details
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedScores.map((score) => {
              const isExpanded = expandedRows.has(score.indicatorNumber)
              const colors = getScoreColor(score.score)

              return (
                <tbody key={score.indicatorNumber}>
                  <tr className={`hover:bg-gray-50 ${colors.bg} bg-opacity-30`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {score.indicatorNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {score.indicatorName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {INDICATOR_SHORT_NAMES[score.indicatorNumber]}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={score.score} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getScoreLabel(score.score)}
                    </td>
                    {(showEvidence || showSuggestions) && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(score.indicatorNumber)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>

                  {/* Expanded details row */}
                  {isExpanded && (showEvidence || showSuggestions) && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="space-y-3">
                          {showEvidence && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                                Evidence
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                                {score.evidence}
                              </p>
                            </div>
                          )}
                          {showSuggestions && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                                Improvement Suggestion
                              </h4>
                              <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                                {score.suggestion}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-6">
          <div>
            <span className="text-sm text-gray-500">Overall Score: </span>
            <span className="text-lg font-bold text-gray-900">{scores.overall.toFixed(1)}/10</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Strengths: </span>
            <span className="text-sm text-green-600">{scores.strengths.length}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Gaps: </span>
            <span className="text-sm text-amber-600">{scores.gaps.length}</span>
          </div>
          {scores.industry && (
            <div>
              <span className="text-sm text-gray-500">Industry: </span>
              <span className="text-sm text-gray-900 capitalize">{scores.industry}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
