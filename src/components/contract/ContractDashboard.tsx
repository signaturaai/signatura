'use client'

/**
 * Contract Analysis Dashboard
 *
 * Displays the AI-powered contract analysis results including:
 * - Fairness score and risk level
 * - Red flag alerts
 * - Clause explorer with side-by-side legal/plain English view
 * - Negotiation tips checklist
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Scale,
  Lightbulb,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type {
  ContractAnalysisResult,
  ClauseAnalysis,
  ClauseStatus,
} from '@/types/contract'
import {
  getClauseStatusColor,
  getRiskLevelColor,
  getFairnessScoreColor,
  getFairnessScoreLabel,
} from '@/types/contract'

interface ContractDashboardProps {
  analysis: ContractAnalysisResult
  fileName?: string
  onBack: () => void
  onAnalyzeAnother: () => void
}

export function ContractDashboard({
  analysis,
  fileName,
  onBack,
  onAnalyzeAnother,
}: ContractDashboardProps) {
  const [expandedClause, setExpandedClause] = useState<number | null>(null)
  const [checkedTips, setCheckedTips] = useState<Set<number>>(new Set())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const redFlagClauses = analysis.clauses.filter((c) => c.status === 'Red Flag')
  const yellowClauses = analysis.clauses.filter((c) => c.status === 'Yellow')
  const greenClauses = analysis.clauses.filter((c) => c.status === 'Green')

  const toggleClause = (index: number) => {
    setExpandedClause(expandedClause === index ? null : index)
  }

  const toggleTip = (index: number) => {
    const newChecked = new Set(checkedTips)
    if (newChecked.has(index)) {
      newChecked.delete(index)
    } else {
      newChecked.add(index)
    }
    setCheckedTips(newChecked)
  }

  const copyClauseText = async (clause: ClauseAnalysis, index: number) => {
    const text = `${clause.type}\n\nOriginal: ${clause.original_text}\n\nPlain English: ${clause.plain_english}`
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const getStatusIcon = (status: ClauseStatus) => {
    switch (status) {
      case 'Green':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'Yellow':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'Red Flag':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button variant="outline" onClick={onAnalyzeAnother}>
          Analyze Another Contract
        </Button>
      </div>

      {/* Scorecard Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* File Info */}
            {fileName && (
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{fileName}</p>
                  <p className="text-sm text-gray-500">Contract Analysis</p>
                </div>
              </div>
            )}

            {/* Scores */}
            <div className="flex items-center gap-8">
              {/* Fairness Score */}
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Fairness</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-3xl font-bold ${getFairnessScoreColor(analysis.fairness_score)}`}
                  >
                    {analysis.fairness_score}
                  </span>
                  <span className="text-lg text-gray-400">/10</span>
                </div>
                <p className={`text-sm ${getFairnessScoreColor(analysis.fairness_score)}`}>
                  {getFairnessScoreLabel(analysis.fairness_score)}
                </p>
              </div>

              {/* Risk Level Badge */}
              <div className="text-center">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Risk Level</span>
                </div>
                <div
                  className={`mt-1 px-4 py-2 rounded-full text-lg font-semibold ${getRiskLevelColor(analysis.risk_level)}`}
                >
                  {analysis.risk_level}
                </div>
              </div>

              {/* Clause Summary */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="text-gray-600">{redFlagClauses.length} Red</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-gray-600">{yellowClauses.length} Yellow</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span className="text-gray-600">{greenClauses.length} Green</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-gray-700">{analysis.summary}</p>
          </div>
        </Card>
      </motion.div>

      {/* Red Flags Alert */}
      {redFlagClauses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 text-lg">
                  {redFlagClauses.length} Red Flag{redFlagClauses.length > 1 ? 's' : ''} Detected
                </h3>
                <p className="text-red-700 mt-1">
                  These clauses require careful review and may warrant negotiation before signing.
                </p>
                <ul className="mt-3 space-y-1">
                  {redFlagClauses.map((clause, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-red-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      {clause.type}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Clause Explorer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clause Explorer</h3>
          <div className="space-y-3">
            {analysis.clauses.map((clause, index) => (
              <div
                key={index}
                className={`border rounded-xl overflow-hidden transition-all ${
                  expandedClause === index ? 'ring-2 ring-blue-500' : ''
                } ${getClauseStatusColor(clause.status).replace('text-', 'border-').split(' ')[2]}`}
              >
                {/* Clause Header */}
                <button
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  onClick={() => toggleClause(index)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(clause.status)}
                    <span className="font-medium text-gray-900">{clause.type}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getClauseStatusColor(clause.status)}`}
                    >
                      {clause.status}
                    </span>
                  </div>
                  {expandedClause === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Expanded Clause Content */}
                <AnimatePresence>
                  {expandedClause === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t"
                    >
                      <div className="p-4">
                        {/* Side-by-side comparison */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Original Legal Text */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Legalese
                              </span>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-700 italic">
                              &quot;{clause.original_text}&quot;
                            </div>
                          </div>

                          {/* Plain English */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                                Plain English
                              </span>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-800">
                              {clause.plain_english}
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        {(clause.concerns || clause.industry_standard) && (
                          <div className="mt-4 pt-4 border-t space-y-3">
                            {clause.concerns && clause.concerns.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-1">
                                  Concerns
                                </p>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {clause.concerns.map((concern, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400"></span>
                                      {concern}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {clause.industry_standard && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                  Industry Standard
                                </p>
                                <p className="text-sm text-gray-600">{clause.industry_standard}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Copy Button */}
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-gray-500"
                            onClick={() => copyClauseText(clause, index)}
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-4 h-4" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Negotiation Tips / Action Plan */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Action Plan</h3>
            <span className="text-sm text-gray-500">
              ({checkedTips.size}/{analysis.negotiation_tips.length} completed)
            </span>
          </div>
          <ul className="space-y-3">
            {analysis.negotiation_tips.map((tip, index) => (
              <li
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  checkedTips.has(index)
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }`}
                onClick={() => toggleTip(index)}
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    checkedTips.has(index)
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  }`}
                >
                  {checkedTips.has(index) && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-sm ${
                    checkedTips.has(index) ? 'text-gray-500 line-through' : 'text-gray-700'
                  }`}
                >
                  {tip}
                </span>
              </li>
            ))}
          </ul>

          {checkedTips.size === analysis.negotiation_tips.length && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-100 rounded-lg text-center"
            >
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">All action items reviewed!</p>
              <p className="text-green-700 text-sm mt-1">
                You&apos;re ready to negotiate your contract.
              </p>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
