'use client'

/**
 * My Applications Page
 *
 * Comprehensive job applications management interface with:
 * - Cards and Table view toggle
 * - Advanced filtering and search
 * - Column customization for table view
 * - Dynamic action buttons based on application status
 */

import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Button, Input } from '@/components/ui'
import {
  NewApplicationWizard,
  ApplicationCardsView,
  ApplicationTableView,
  AdvancedFiltersModal,
  ColumnVisibilityDropdown,
} from '@/components/applications'
import type { ColumnConfig, FilterState } from '@/components/applications'
import { mockJobApplications } from '@/lib/data/mockData'
import type { JobApplication, ApplicationStatus } from '@/lib/types/dashboard'
import {
  Plus,
  Upload,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Briefcase,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// View mode type
type ViewMode = 'cards' | 'table'

// Sort options
type SortOption = 'newest' | 'oldest' | 'company_asc' | 'company_desc' | 'status'

// Default column configuration
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'company', label: 'Company', visible: true },
  { id: 'position', label: 'Position', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'next_step', label: 'Next Step', visible: true },
  { id: 'progress', label: 'Progress', visible: true },
  { id: 'applied_date', label: 'Applied Date', visible: true },
  { id: 'salary', label: 'Salary', visible: false },
  { id: 'priority', label: 'Priority', visible: false },
]

// Status options for quick filter
const STATUS_OPTIONS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'prepared', label: 'Prepared' },
  { value: 'applied', label: 'Applied' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export default function ApplicationsPage() {
  const router = useRouter()

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [showWizard, setShowWizard] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [quickStatusFilter, setQuickStatusFilter] = useState<ApplicationStatus | 'all'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')

  // Advanced filter state
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    searchQuery: '',
    statuses: [],
    dateFrom: '',
    dateTo: '',
  })

  // Column visibility state (for table view)
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)

  // Status dropdown state
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  // Filter and sort applications
  const filteredApplications = useMemo(() => {
    let result = [...mockJobApplications]

    // Apply search filter
    const searchTerm = advancedFilters.searchQuery || searchQuery
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(
        (app) =>
          app.company_name.toLowerCase().includes(lowerSearch) ||
          app.position_title.toLowerCase().includes(lowerSearch) ||
          (app.notes && app.notes.toLowerCase().includes(lowerSearch)) ||
          (app.location && app.location.toLowerCase().includes(lowerSearch))
      )
    }

    // Apply status filter (quick filter or advanced)
    if (advancedFilters.statuses.length > 0) {
      result = result.filter((app) =>
        advancedFilters.statuses.includes(app.application_status)
      )
    } else if (quickStatusFilter !== 'all') {
      result = result.filter((app) => app.application_status === quickStatusFilter)
    }

    // Apply date range filter
    const fromDate = advancedFilters.dateFrom || dateFrom
    const toDate = advancedFilters.dateTo || dateTo

    if (fromDate) {
      const from = new Date(fromDate)
      result = result.filter((app) => new Date(app.application_date) >= from)
    }
    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999)
      result = result.filter((app) => new Date(app.application_date) <= to)
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.application_date).getTime() - new Date(a.application_date).getTime()
        case 'oldest':
          return new Date(a.application_date).getTime() - new Date(b.application_date).getTime()
        case 'company_asc':
          return a.company_name.localeCompare(b.company_name)
        case 'company_desc':
          return b.company_name.localeCompare(a.company_name)
        case 'status':
          return a.application_status.localeCompare(b.application_status)
        default:
          return 0
      }
    })

    return result
  }, [searchQuery, quickStatusFilter, dateFrom, dateTo, sortOption, advancedFilters])

  // Handle application action
  const handleApplicationAction = useCallback(
    (application: JobApplication, action: string) => {
      switch (action) {
        case 'tailor_cv':
          router.push(`/cv/tailor?application=${application.id}`)
          break
        case 'follow_up':
          router.push(`/applications/${application.id}?action=follow_up`)
          break
        default:
          router.push(`/applications/${application.id}`)
      }
    },
    [router]
  )

  // Handle advanced filter apply
  const handleAdvancedFiltersApply = useCallback((filters: FilterState) => {
    setAdvancedFilters(filters)
    // Sync with quick filters
    if (filters.searchQuery) setSearchQuery(filters.searchQuery)
    if (filters.dateFrom) setDateFrom(filters.dateFrom)
    if (filters.dateTo) setDateTo(filters.dateTo)
    if (filters.statuses.length === 1) {
      setQuickStatusFilter(filters.statuses[0])
    } else if (filters.statuses.length === 0) {
      setQuickStatusFilter('all')
    }
  }, [])

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery || advancedFilters.searchQuery) count++
    if (quickStatusFilter !== 'all' || advancedFilters.statuses.length > 0) count++
    if (dateFrom || dateTo || advancedFilters.dateFrom || advancedFilters.dateTo) count++
    return count
  }, [searchQuery, quickStatusFilter, dateFrom, dateTo, advancedFilters])

  // Sort labels
  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    company_asc: 'Company A-Z',
    company_desc: 'Company Z-A',
    status: 'By Status',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-lavender-dark" />
            My Applications
          </h1>
          <p className="text-text-secondary mt-1">
            Track and manage your job applications in one place
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              /* TODO: Implement import */
            }}
            className="hidden sm:flex"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Past Application
          </Button>
          <Button
            onClick={() => setShowWizard(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <Card className="border border-gray-100">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                type="text"
                placeholder="Search applications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setStatusDropdownOpen(!statusDropdownOpen)
                    setSortDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-text-primary hover:bg-gray-50 transition-colors min-w-[140px]"
                >
                  <span className="truncate">
                    {STATUS_OPTIONS.find((s) => s.value === quickStatusFilter)?.label}
                  </span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                </button>
                {statusDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setQuickStatusFilter(option.value)
                          setStatusDropdownOpen(false)
                          // Clear advanced status filters
                          setAdvancedFilters((prev) => ({ ...prev, statuses: [] }))
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          quickStatusFilter === option.value
                            ? 'bg-lavender-light/30 text-lavender-dark'
                            : 'text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[130px] text-sm"
                  placeholder="From"
                />
                <span className="text-text-tertiary">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[130px] text-sm"
                  placeholder="To"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setSortDropdownOpen(!sortDropdownOpen)
                    setStatusDropdownOpen(false)
                  }}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-text-primary hover:bg-gray-50 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{sortLabels[sortOption]}</span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                </button>
                {sortDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                    {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setSortOption(option)
                          setSortDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          sortOption === option
                            ? 'bg-lavender-light/30 text-lavender-dark'
                            : 'text-text-primary'
                        }`}
                      >
                        {sortLabels[option]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              {/* Column Visibility (Table view only) */}
              {viewMode === 'table' && (
                <ColumnVisibilityDropdown columns={columns} onChange={setColumns} />
              )}

              {/* Advanced Filters */}
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilters(true)}
                size="sm"
                className="relative"
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Advanced Filters
                {activeFilterCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              {/* Results count */}
              <span className="text-sm text-text-secondary">
                {filteredApplications.length} application
                {filteredApplications.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-label="Cards view"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                aria-label="Table view"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications View */}
      {viewMode === 'cards' ? (
        <ApplicationCardsView
          applications={filteredApplications}
          onAction={handleApplicationAction}
        />
      ) : (
        <ApplicationTableView
          applications={filteredApplications}
          columns={columns}
          onAction={handleApplicationAction}
        />
      )}

      {/* Empty State */}
      {filteredApplications.length === 0 && mockJobApplications.length > 0 && (
        <Card className="border border-gray-100">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No matching applications
            </h3>
            <p className="text-text-secondary mb-4">
              Try adjusting your filters or search terms
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('')
                setQuickStatusFilter('all')
                setDateFrom('')
                setDateTo('')
                setAdvancedFilters({
                  searchQuery: '',
                  statuses: [],
                  dateFrom: '',
                  dateTo: '',
                })
              }}
            >
              Clear All Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Application Wizard Modal */}
      <NewApplicationWizard isOpen={showWizard} onClose={() => setShowWizard(false)} />

      {/* Advanced Filters Modal */}
      <AdvancedFiltersModal
        isOpen={showAdvancedFilters}
        onClose={() => setShowAdvancedFilters(false)}
        filters={advancedFilters}
        onApply={handleAdvancedFiltersApply}
        onSavePreference={(filters) => {
          // TODO: Save to user preferences
          console.log('Save preference:', filters)
          handleAdvancedFiltersApply(filters)
        }}
      />

      {/* Click outside to close dropdowns */}
      {(statusDropdownOpen || sortDropdownOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setStatusDropdownOpen(false)
            setSortDropdownOpen(false)
          }}
        />
      )}
    </div>
  )
}
