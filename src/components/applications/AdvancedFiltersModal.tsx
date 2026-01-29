'use client'

/**
 * Advanced Filters Modal
 *
 * Modal dialog for advanced filtering of job applications with
 * status checkboxes, date range inputs, and search functionality.
 */

import { useState, useEffect } from 'react'
import { Button, Input } from '@/components/ui'
import { X, Search, RotateCcw, Save, Filter } from 'lucide-react'
import type { ApplicationStatus } from '@/lib/types/dashboard'

export interface FilterState {
  searchQuery: string
  statuses: ApplicationStatus[]
  dateFrom: string
  dateTo: string
}

interface AdvancedFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onApply: (filters: FilterState) => void
  onSavePreference?: (filters: FilterState) => void
}

const ALL_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: 'prepared', label: 'Prepared' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  filters,
  onApply,
  onSavePreference,
}: AdvancedFiltersModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters)

  // Sync local state when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(filters)
    }
  }, [isOpen, filters])

  const handleReset = () => {
    setLocalFilters({
      searchQuery: '',
      statuses: [],
      dateFrom: '',
      dateTo: '',
    })
  }

  const handleStatusToggle = (status: ApplicationStatus) => {
    setLocalFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleSavePreference = () => {
    if (onSavePreference) {
      onSavePreference(localFilters)
    }
    onApply(localFilters)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-text-primary">
            <Filter className="w-5 h-5 text-lavender-dark" />
            Advanced Filters
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search by company, position, or notes..."
                value={localFilters.searchQuery}
                onChange={(e) =>
                  setLocalFilters((prev) => ({
                    ...prev,
                    searchQuery: e.target.value,
                  }))
                }
                className="pl-9"
              />
            </div>
          </div>

          {/* Status Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-3">
              Application Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    localFilters.statuses.includes(value)
                      ? 'border-lavender bg-lavender-light/30'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={localFilters.statuses.includes(value)}
                    onChange={() => handleStatusToggle(value)}
                    className="w-4 h-4 rounded border-gray-300 text-lavender-dark focus:ring-lavender accent-lavender-dark"
                  />
                  <span className="text-sm text-text-primary">{label}</span>
                </label>
              ))}
            </div>
            {localFilters.statuses.length > 0 && (
              <p className="mt-2 text-xs text-text-tertiary">
                {localFilters.statuses.length} status
                {localFilters.statuses.length !== 1 ? 'es' : ''} selected
              </p>
            )}
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-tertiary mb-1">From</label>
                <Input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      dateFrom: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-text-tertiary mb-1">To</label>
                <Input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      dateTo: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-text-secondary hover:text-text-primary"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            {onSavePreference && (
              <Button
                variant="outline"
                onClick={handleSavePreference}
                className="text-sm"
              >
                <Save className="w-4 h-4 mr-1.5" />
                Save as My Preference
              </Button>
            )}
            <Button
              onClick={handleApply}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
