'use client'

/**
 * Compensation Negotiator Page
 *
 * Module 4: Offer analysis, market benchmarking, and negotiation strategy.
 *
 * States:
 * 1. Input Wizard - Collect offer details and priorities
 * 2. Strategy Dashboard - Display analysis and playbook
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CompensationWizard, type WizardOutput } from '@/components/compensation/CompensationWizard'
import { NegotiationDashboard } from '@/components/compensation/NegotiationDashboard'
import { getMockCompensationStrategy } from '@/lib/compensation/mockData'
import type { CompensationStrategy } from '@/types/compensation'

// Toggle this to use real API vs mock data
const USE_MOCK = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_AI === 'true'

export default function CompensationNegotiatorPage() {
  const [stage, setStage] = useState<'wizard' | 'dashboard'>('wizard')
  const [strategy, setStrategy] = useState<CompensationStrategy | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleWizardComplete = async (data: WizardOutput) => {
    setIsLoading(true)
    setError(null)

    try {
      if (USE_MOCK) {
        // Use mock data for UI testing
        await new Promise(resolve => setTimeout(resolve, 1500)) // Simulate API delay
        const mockStrategy = getMockCompensationStrategy({
          offerDetails: data.offerDetails,
          userPriorities: data.userPriorities,
        })
        setStrategy(mockStrategy)
        setStage('dashboard')
      } else {
        // Call real API
        const response = await fetch('/api/compensation/generate-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerDetails: data.offerDetails,
            userPriorities: data.userPriorities,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to generate strategy')
        }

        const result = await response.json()
        setStrategy(result.strategy)
        setStage('dashboard')
      }
    } catch (err) {
      console.error('Error generating strategy:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!strategy) return

    setIsLoading(true)
    setError(null)

    try {
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        const mockStrategy = getMockCompensationStrategy({
          offerDetails: strategy.offerDetails,
          userPriorities: strategy.userPriorities,
          regenerationCount: (strategy.regenerationCount || 0) + 1,
        })
        setStrategy(mockStrategy)
      } else {
        const response = await fetch('/api/compensation/generate-strategy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offerDetails: strategy.offerDetails,
            userPriorities: strategy.userPriorities,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to regenerate strategy')
        }

        const result = await response.json()
        setStrategy(result.strategy)
      }
    } catch (err) {
      console.error('Error regenerating strategy:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStage('wizard')
    setStrategy(null)
    setError(null)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900">Compensation Negotiator</h1>
        <p className="text-gray-600 mt-2">
          {stage === 'wizard'
            ? 'Enter your offer details to get personalized negotiation strategies'
            : 'Your personalized negotiation strategy and playbook'}
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
        {stage === 'wizard' && (
          <motion.div
            key="wizard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CompensationWizard
              onComplete={handleWizardComplete}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {stage === 'dashboard' && strategy && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <NegotiationDashboard
              strategy={strategy}
              onRegenerate={handleRegenerate}
              onBack={handleBack}
              isRegenerating={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
