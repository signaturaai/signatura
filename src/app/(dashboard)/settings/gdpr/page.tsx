'use client'

/**
 * GDPR Privacy Settings Page
 *
 * Allows users to:
 * - Download their data (Right to Access)
 * - Delete their account (Right to Erasure)
 * - View consent history
 * - Manage marketing preferences
 */

import { useState, useEffect } from 'react'
import { PrivacyPolicyLink } from '@/components/legal'
import {
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Mail,
  Clock,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface DeletionRequest {
  id: string
  scheduled_date: string
  requested_at: string
  days_remaining: number
}

export default function GDPRSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [pendingDeletion, setPendingDeletion] = useState<DeletionRequest | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  // Fetch current status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/gdpr/delete-account')
        const data = await response.json()
        if (data.pending_request) {
          setPendingDeletion(data.pending_request)
        }
      } catch (error) {
        console.error('Error fetching deletion status:', error)
      } finally {
        setLoadingStatus(false)
      }
    }

    fetchStatus()
  }, [])

  const handleExportData = async () => {
    setExportLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/gdpr/export-data')

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `signatura-data-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Data exported successfully! Check your downloads.' })
    } catch (error) {
      console.error('Export error:', error)
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' })
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE_MY_ACCOUNT') {
      setMessage({ type: 'error', text: 'Please type DELETE_MY_ACCOUNT exactly to confirm' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: confirmText,
          reason: deleteReason || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deletion request failed')
      }

      setPendingDeletion(data.deletion_request)
      setConfirmText('')
      setDeleteReason('')
      setMessage({
        type: 'info',
        text: `Account deletion scheduled for ${new Date(data.deletion_request.scheduled_date).toLocaleDateString()}. You have 30 days to cancel.`,
      })
    } catch (error) {
      console.error('Delete error:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to schedule deletion.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelDeletion = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/gdpr/delete-account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel deletion')
      }

      setPendingDeletion(null)
      setMessage({ type: 'success', text: 'Account deletion cancelled. Your account is safe.' })
    } catch (error) {
      console.error('Cancel error:', error)
      setMessage({ type: 'error', text: 'Failed to cancel deletion. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleMarketingConsentChange = async (newValue: boolean) => {
    try {
      await fetch('/api/consent/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent_type: 'marketing_emails',
          action: newValue ? 'granted' : 'revoked',
        }),
      })
      setMarketingConsent(newValue)
      setMessage({
        type: 'success',
        text: newValue
          ? 'Marketing emails enabled'
          : 'Marketing emails disabled',
      })
    } catch (error) {
      console.error('Consent update error:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-600" />
          Privacy & Data Rights
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your personal data and privacy preferences. Your rights under GDPR.
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : message.type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {message.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {message.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
          {message.type === 'info' && <Clock className="w-5 h-5 flex-shrink-0" />}
          <p>{message.text}</p>
        </div>
      )}

      {/* Pending Deletion Warning */}
      {pendingDeletion && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800">Account Deletion Scheduled</h3>
              <p className="text-amber-700 text-sm mt-1">
                Your account is scheduled for deletion on{' '}
                <strong>{new Date(pendingDeletion.scheduled_date).toLocaleDateString()}</strong> (
                {pendingDeletion.days_remaining} days remaining).
              </p>
              <button
                onClick={handleCancelDeletion}
                disabled={loading}
                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Cancelling...' : 'Cancel Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Data Section */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Download Your Data</h2>
            <p className="text-gray-600 text-sm mt-1 mb-4">
              Export all your personal data in JSON format. This includes your profile, applications,
              CVs, interview sessions, and more. (GDPR Article 15 - Right of Access)
            </p>
            <button
              onClick={handleExportData}
              disabled={exportLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing Export...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download My Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Marketing Preferences */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Mail className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Communication Preferences</h2>
            <p className="text-gray-600 text-sm mt-1 mb-4">
              Control what communications you receive from us.
            </p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => handleMarketingConsentChange(e.target.checked)}
                className="w-5 h-5 accent-purple-600"
              />
              <div>
                <span className="font-medium">Marketing Emails</span>
                <p className="text-sm text-gray-500">
                  Receive updates about new features, tips, and occasional promotions
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Delete Account Section */}
      {!pendingDeletion && (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-red-700">Delete Account</h2>
              <p className="text-gray-600 text-sm mt-1 mb-4">
                Permanently delete your account and all associated data. This action will be
                scheduled with a 30-day grace period during which you can cancel. (GDPR Article 17 -
                Right to Erasure)
              </p>

              <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> After the grace period, this action cannot be undone.
                  All your data including applications, CVs, interview sessions, and profile
                  information will be permanently deleted.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for leaving (optional)
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Help us improve by sharing why you're leaving..."
                    className="w-full p-3 border rounded-lg text-sm resize-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type <strong className="text-red-600">DELETE_MY_ACCOUNT</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE_MY_ACCOUNT"
                    className="w-full p-3 border rounded-lg font-mono"
                  />
                </div>

                <button
                  onClick={handleDeleteAccount}
                  disabled={loading || confirmText !== 'DELETE_MY_ACCOUNT'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Link */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          Learn more about how we handle your data in our{' '}
          <PrivacyPolicyLink className="text-blue-600 hover:underline" showIcon />
        </p>
      </div>
    </div>
  )
}
