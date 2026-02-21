'use client'

/**
 * AdvancedFilters Component
 *
 * Collapsible panel for advanced job search filtering with:
 * - Job titles and locations (tag inputs)
 * - Experience years selection
 * - Skills with proficiency levels
 * - Company size and remote work policy (multi-select)
 * - Required benefits (multi-select)
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Input } from '@/components/ui'
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Plus,
  Save,
  RotateCcw,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  JobSearchPreferencesRow,
  ExperienceYears,
  SkillRequirement,
  SkillProficiency,
  CompanySize,
  WorkType,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

export interface FilterState {
  preferred_job_titles: string[]
  preferred_locations: string[]
  experience_years: ExperienceYears | null
  required_skills: SkillRequirement[]
  company_size_preferences: CompanySize[]
  remote_policy_preferences: WorkType[]
  required_benefits: string[]
}

export interface AdvancedFiltersProps {
  preferences: JobSearchPreferencesRow | null
  onApplyFilters: (filters: FilterState) => void
  onSavePreferences: (filters: FilterState) => Promise<void>
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

// ============================================================================
// Constants
// ============================================================================

const EXPERIENCE_OPTIONS: { value: ExperienceYears; label: string }[] = [
  { value: '0-2', label: '0-2 years' },
  { value: '2-5', label: '2-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10+', label: '10+ years' },
]

const PROFICIENCY_OPTIONS: { value: SkillProficiency; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
]

const COMPANY_SIZE_OPTIONS: { value: CompanySize; label: string }[] = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '501-1000', label: '501-1000' },
  { value: '1000+', label: '1000+' },
]

const REMOTE_POLICY_OPTIONS: { value: WorkType; label: string }[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'In Office' },
  { value: 'flexible', label: 'Flexible' },
]

const BENEFITS_OPTIONS: string[] = [
  'Health Insurance',
  '401k',
  'Unlimited PTO',
  'Equity',
  'Life Insurance',
  'Dental',
  'Vision',
  'Parental Leave',
  'Professional Development',
  'Remote Stipend',
  'Gym',
  'Mental Health',
]

// ============================================================================
// Sub-Components
// ============================================================================

interface TagInputProps {
  label: string
  tags: string[]
  placeholder: string
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

function TagInput({ label, tags, placeholder, onAdd, onRemove }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-lavender-light text-lavender-dark rounded-lg text-sm"
          >
            {tag}
            <button
              onClick={() => onRemove(tag)}
              className="hover:bg-lavender/30 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button size="sm" variant="ghost" onClick={handleAdd} disabled={!inputValue.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface PillSelectorProps {
  label: string
  options: { value: string; label: string }[]
  selected: string | null
  onChange: (value: string | null) => void
}

function PillSelector({ label, options, selected, onChange }: PillSelectorProps) {
  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(selected === option.value ? null : option.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
              selected === option.value
                ? 'bg-lavender-dark text-white border-lavender-dark'
                : 'bg-white border-rose-light hover:border-lavender hover:bg-lavender-light/30'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface MultiPillSelectorProps {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}

function MultiPillSelector({ label, options, selected, onChange }: MultiPillSelectorProps) {
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => toggleValue(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
              selected.includes(option.value)
                ? 'bg-lavender-dark text-white border-lavender-dark'
                : 'bg-white border-rose-light hover:border-lavender hover:bg-lavender-light/30'
            )}
          >
            {selected.includes(option.value) && <Check className="h-3 w-3" />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface BenefitsPillSelectorProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (values: string[]) => void
}

function BenefitsPillSelector({ label, options, selected, onChange }: BenefitsPillSelectorProps) {
  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-2 block">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => toggleValue(option)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
              selected.includes(option)
                ? 'bg-success-light text-success-dark border-success'
                : 'bg-white border-rose-light hover:border-success hover:bg-success-light/30'
            )}
          >
            {selected.includes(option) && <Check className="h-3 w-3" />}
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SkillInputProps {
  skills: SkillRequirement[]
  onAdd: (skill: SkillRequirement) => void
  onRemove: (skill: string) => void
}

function SkillInput({ skills, onAdd, onRemove }: SkillInputProps) {
  const [skillName, setSkillName] = useState('')
  const [proficiency, setProficiency] = useState<SkillProficiency>('intermediate')

  const handleAdd = () => {
    if (skillName.trim() && !skills.some((s) => s.skill.toLowerCase() === skillName.trim().toLowerCase())) {
      onAdd({ skill: skillName.trim(), proficiency })
      setSkillName('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <label className="text-sm font-medium text-text-primary mb-2 block">
        Required Skills & Proficiency
      </label>
      <div className="flex flex-wrap gap-2 mb-3">
        {skills.map((skill) => (
          <span
            key={skill.skill}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-lavender-light text-lavender-dark rounded-lg text-sm"
          >
            <span className="font-medium">{skill.skill}</span>
            <span className="text-lavender/70 text-xs">({skill.proficiency})</span>
            <button
              onClick={() => onRemove(skill.skill)}
              className="hover:bg-lavender/30 rounded-full p-0.5 ml-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={skillName}
          onChange={(e) => setSkillName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., React, Python..."
          className="flex-1"
        />
        <select
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value as SkillProficiency)}
          className="px-3 py-2 border border-rose-light rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose/50"
        >
          {PROFICIENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button size="sm" variant="ghost" onClick={handleAdd} disabled={!skillName.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Animation Variants
// ============================================================================

const panelVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function AdvancedFilters({
  preferences,
  onApplyFilters,
  onSavePreferences,
  isCollapsed = true,
  onToggleCollapse,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!isCollapsed)
  const [isSaving, setIsSaving] = useState(false)

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    preferred_job_titles: [],
    preferred_locations: [],
    experience_years: null,
    required_skills: [],
    company_size_preferences: [],
    remote_policy_preferences: [],
    required_benefits: [],
  })

  // Initialize from preferences
  useEffect(() => {
    if (preferences) {
      setFilters({
        preferred_job_titles: preferences.preferred_job_titles || [],
        preferred_locations: preferences.preferred_locations || [],
        experience_years: preferences.experience_years || null,
        required_skills: preferences.required_skills || [],
        company_size_preferences: preferences.company_size_preferences || [],
        remote_policy_preferences: preferences.remote_policy_preferences || [],
        required_benefits: preferences.required_benefits || [],
      })
    }
  }, [preferences])

  // Sync with external collapse state
  useEffect(() => {
    setIsExpanded(!isCollapsed)
  }, [isCollapsed])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    onToggleCollapse?.()
  }

  const handleReset = () => {
    if (preferences) {
      setFilters({
        preferred_job_titles: preferences.preferred_job_titles || [],
        preferred_locations: preferences.preferred_locations || [],
        experience_years: preferences.experience_years || null,
        required_skills: preferences.required_skills || [],
        company_size_preferences: preferences.company_size_preferences || [],
        remote_policy_preferences: preferences.remote_policy_preferences || [],
        required_benefits: preferences.required_benefits || [],
      })
    } else {
      setFilters({
        preferred_job_titles: [],
        preferred_locations: [],
        experience_years: null,
        required_skills: [],
        company_size_preferences: [],
        remote_policy_preferences: [],
        required_benefits: [],
      })
    }
  }

  const handleApply = () => {
    onApplyFilters(filters)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSavePreferences(filters)
    } finally {
      setIsSaving(false)
    }
  }

  // Update handlers
  const addJobTitle = useCallback((title: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_job_titles: prev.preferred_job_titles.includes(title)
        ? prev.preferred_job_titles
        : [...prev.preferred_job_titles, title],
    }))
  }, [])

  const removeJobTitle = useCallback((title: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_job_titles: prev.preferred_job_titles.filter((t) => t !== title),
    }))
  }, [])

  const addLocation = useCallback((location: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_locations: prev.preferred_locations.includes(location)
        ? prev.preferred_locations
        : [...prev.preferred_locations, location],
    }))
  }, [])

  const removeLocation = useCallback((location: string) => {
    setFilters((prev) => ({
      ...prev,
      preferred_locations: prev.preferred_locations.filter((l) => l !== location),
    }))
  }, [])

  const addSkill = useCallback((skill: SkillRequirement) => {
    setFilters((prev) => ({
      ...prev,
      required_skills: [...prev.required_skills, skill],
    }))
  }, [])

  const removeSkill = useCallback((skillName: string) => {
    setFilters((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s.skill !== skillName),
    }))
  }, [])

  return (
    <Card>
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-text-secondary" />
          <span className="font-medium text-text-primary">Advanced Filters</span>
          {/* Show active filter count */}
          {(filters.preferred_job_titles.length > 0 ||
            filters.preferred_locations.length > 0 ||
            filters.experience_years ||
            filters.required_skills.length > 0 ||
            filters.company_size_preferences.length > 0 ||
            filters.remote_policy_preferences.length > 0 ||
            filters.required_benefits.length > 0) && (
            <span className="px-2 py-0.5 bg-lavender-light text-lavender-dark text-xs font-medium rounded-full">
              {filters.preferred_job_titles.length +
                filters.preferred_locations.length +
                (filters.experience_years ? 1 : 0) +
                filters.required_skills.length +
                filters.company_size_preferences.length +
                filters.remote_policy_preferences.length +
                filters.required_benefits.length}{' '}
              active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-text-secondary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-secondary" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <CardContent className="border-t pt-6 space-y-6">
              {/* Job Titles */}
              <TagInput
                label="Job Titles"
                tags={filters.preferred_job_titles}
                placeholder="e.g., Senior Software Engineer"
                onAdd={addJobTitle}
                onRemove={removeJobTitle}
              />

              {/* Preferred Locations */}
              <TagInput
                label="Preferred Locations"
                tags={filters.preferred_locations}
                placeholder="e.g., San Francisco, Remote"
                onAdd={addLocation}
                onRemove={removeLocation}
              />

              {/* Years of Experience */}
              <PillSelector
                label="Years of Experience"
                options={EXPERIENCE_OPTIONS}
                selected={filters.experience_years}
                onChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    experience_years: value as ExperienceYears | null,
                  }))
                }
              />

              {/* Required Skills */}
              <SkillInput
                skills={filters.required_skills}
                onAdd={addSkill}
                onRemove={removeSkill}
              />

              {/* Company Size */}
              <MultiPillSelector
                label="Company Size"
                options={COMPANY_SIZE_OPTIONS}
                selected={filters.company_size_preferences}
                onChange={(values) =>
                  setFilters((prev) => ({
                    ...prev,
                    company_size_preferences: values as CompanySize[],
                  }))
                }
              />

              {/* Remote Work Policy */}
              <MultiPillSelector
                label="Remote Work Policy"
                options={REMOTE_POLICY_OPTIONS}
                selected={filters.remote_policy_preferences}
                onChange={(values) =>
                  setFilters((prev) => ({
                    ...prev,
                    remote_policy_preferences: values as WorkType[],
                  }))
                }
              />

              {/* Required Benefits */}
              <BenefitsPillSelector
                label="Required Benefits"
                options={BENEFITS_OPTIONS}
                selected={filters.required_benefits}
                onChange={(values) =>
                  setFilters((prev) => ({
                    ...prev,
                    required_benefits: values,
                  }))
                }
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {isSaving ? 'Saving...' : 'Save as My Preference'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="bg-sky-dark hover:bg-sky-dark/90"
                >
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default AdvancedFilters
