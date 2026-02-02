'use client'

/**
 * Indicator Breakdown List with Expandable Accordion
 *
 * Shows each of the 10 PM-mapped indicators with:
 *  - Collapsed: Name, Score badge, Progress bar (clean and scannable)
 *  - Expanded: Sub-indicators, Evidence highlights, Siggy's Action Item
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { SubIndicator, EvidenceHighlight } from '@/lib/ai/siggy-integration-guide'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndicatorItem {
  id: string
  name: string
  score: number
  baseScore: number
  maxScore: number
  insight: string
  /** Sub-indicator breakdown (populated when detail data is available) */
  subIndicators?: SubIndicator[]
  /** Evidence highlights from the user's CV bullets */
  evidence?: EvidenceHighlight[]
  /** Siggy's specific action item to reach 10/10 */
  actionItem?: string
}

interface IndicatorBreakdownProps {
  indicators: IndicatorItem[]
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (score >= 6) return 'text-sky-600 bg-sky-50 border-sky-200'
  if (score >= 4) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-500 bg-red-50 border-red-200'
}

function getBarColor(score: number): string {
  if (score >= 8) return 'bg-emerald-500'
  if (score >= 6) return 'bg-sky-500'
  if (score >= 4) return 'bg-amber-500'
  return 'bg-red-400'
}

function getSubBarColor(score: number): string {
  if (score >= 8) return 'bg-emerald-400'
  if (score >= 6) return 'bg-sky-400'
  if (score >= 4) return 'bg-amber-400'
  return 'bg-red-300'
}

function getDeltaDisplay(score: number, base: number): { text: string; color: string } | null {
  const delta = score - base
  if (Math.abs(delta) < 0.1) return null
  return {
    text: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`,
    color: delta > 0 ? 'text-emerald-600' : 'text-red-500',
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SubIndicatorRow({ sub }: { sub: SubIndicator }) {
  const pct = Math.min((sub.score / sub.maxScore) * 100, 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-36 flex-shrink-0 truncate" title={sub.name}>
        {sub.name}
      </span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getSubBarColor(sub.score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-gray-500 w-8 text-right tabular-nums">
        {sub.score}/{sub.maxScore}
      </span>
    </div>
  )
}

function EvidenceCard({ ev }: { ev: EvidenceHighlight }) {
  const isPositive = ev.sentiment === 'positive'
  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg border text-xs leading-relaxed',
        isPositive
          ? 'bg-emerald-50/60 border-emerald-200/60 text-gray-700'
          : 'bg-amber-50/60 border-amber-200/60 text-gray-600'
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'inline-block w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
            isPositive ? 'bg-emerald-500' : 'bg-amber-400'
          )}
        />
        <p className="line-clamp-2">{ev.text}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function IndicatorBreakdown({
  indicators,
  className = '',
}: IndicatorBreakdownProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className={cn('space-y-3', className)}>
      {indicators.map((item) => {
        const delta = getDeltaDisplay(item.score, item.baseScore)
        const isExpanded = expandedId === item.id
        const hasDetail = item.subIndicators && item.subIndicators.length > 0

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border transition-all duration-200',
              isExpanded
                ? 'border-indigo-200 bg-indigo-50/20 shadow-sm'
                : 'border-gray-100 bg-white/80 hover:shadow-sm'
            )}
          >
            {/* ============================================= */}
            {/* Collapsed Row — always visible */}
            {/* ============================================= */}
            <button
              onClick={() => toggle(item.id)}
              className="w-full text-left p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className={cn(
                      'w-3.5 h-3.5 text-gray-400 transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                  <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {delta && (
                    <span className={cn('text-[11px] font-bold', delta.color)}>
                      {delta.text}
                    </span>
                  )}
                  <span
                    className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', getScoreColor(item.score))}
                  >
                    {item.score.toFixed(1)}/{item.maxScore}
                  </span>
                </div>
              </div>

              {/* Progress bar with base marker */}
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-visible">
                <div
                  className={cn('absolute top-0 left-0 h-full rounded-full transition-all duration-500', getBarColor(item.score))}
                  style={{ width: `${Math.min((item.score / item.maxScore) * 100, 100)}%` }}
                />
                {item.baseScore > 0 && (
                  <div
                    className="absolute top-[-2px] w-[3px] h-[12px] bg-gray-400 rounded-full transition-all duration-500"
                    style={{ left: `${Math.min((item.baseScore / item.maxScore) * 100, 100)}%` }}
                    title={`Original: ${item.baseScore.toFixed(1)}`}
                  />
                )}
              </div>

              {/* Score labels */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span className="inline-block w-2 h-[3px] bg-gray-400 rounded" />
                  Original: {item.baseScore.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <span className={cn('inline-block w-2 h-[3px] rounded', getBarColor(item.score))} />
                  Tailored: {item.score.toFixed(1)}
                </span>
              </div>
            </button>

            {/* ============================================= */}
            {/* Expanded Accordion — detail view */}
            {/* ============================================= */}
            <div
              className={cn(
                'overflow-hidden transition-all duration-300 ease-out',
                isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100/80">
                {/* Siggy Insight */}
                <div className="bg-gray-50/80 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-indigo-600">Siggy:</span>{' '}
                    {item.insight}
                  </p>
                </div>

                {/* Sub-Indicators */}
                {hasDetail && (
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Sub-Criteria
                    </h5>
                    <div className="space-y-2">
                      {item.subIndicators!.map((sub, i) => (
                        <SubIndicatorRow key={i} sub={sub} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence Highlights */}
                {item.evidence && item.evidence.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      Evidence from Your CV
                    </h5>
                    <div className="space-y-1.5">
                      {item.evidence.map((ev, i) => (
                        <EvidenceCard key={i} ev={ev} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Item */}
                {item.actionItem && (
                  <div className="bg-indigo-50/80 rounded-lg px-3 py-2.5 border border-indigo-100/60">
                    <p className="text-xs leading-relaxed">
                      <span className="font-semibold text-indigo-700">Action Item:</span>{' '}
                      <span className="text-indigo-600">{item.actionItem}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
