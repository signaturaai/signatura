'use client'

/**
 * PreferencesModal Component
 *
 * Full-screen drawer/modal with three tabs:
 * 1. Profile - Job titles, experience, salary
 * 2. Search Settings - Locations, company preferences, skills
 * 3. Notifications - Email notification settings
 */

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Input } from '@/components/ui'
import {
  X,
  User,
  Search,
  Bell,
  Plus,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationSettings } from './NotificationSettings'
import type {
  JobSearchPreferencesRow,
  EmailNotificationFrequency,
  ExperienceYears,
  SkillRequirement,
  SkillProficiency,
  CompanySize,
  WorkType,
} from '@/types/job-search'

// ============================================================================
// Types
// ============================================================================

export interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  preferences: JobSearchPreferencesRow | null
  onSave: (updates: PreferencesUpdate) => Promise<void>
  onUpdateNotifications: (frequency: EmailNotificationFrequency) => Promise<void>
}

export interface PreferencesUpdate {
  preferred_job_titles?: string[]
  preferred_locations?: string[]
  experience_years?: ExperienceYears | null
  required_skills?: SkillRequirement[]
  company_size_preferences?: CompanySize[]
  remote_policy_preferences?: WorkType[]
  required_benefits?: string[]
  salary_min_override?: number | null
  salary_currency_override?: string | null
  avoid_companies?: string[]
  avoid_keywords?: string[]
}

type TabId = 'profile' | 'search' | 'notifications'

// ============================================================================
// Constants
// ============================================================================

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'search', label: 'Search Settings', icon: Search },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

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
]

// ============================================================================
// Animation Variants
// ============================================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const modalVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
}

const tabContentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.15, ease: 'easeIn' as const },
  },
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TagInputProps {
  tags: string[]
  placeholder: string
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
}

function TagInput({ tags, placeholder, onAdd, onRemove }: TagInputProps) {
  const [value, setValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      e.preventDefault()
      onAdd(value.trim())
      setValue('')
    }
  }

  return (
    <div>
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (value.trim()) {
              onAdd(value.trim())
              setValue('')
            }
          }}
          disabled={!value.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PreferencesModal({
  isOpen,
  onClose,
  preferences,
  onSave,
  onUpdateNotifications,
}: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('profile')
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [jobTitles, setJobTitles] = useState<string[]>([])
  const [experience, setExperience] = useState<ExperienceYears | null>(null)
  const [salaryMin, setSalaryMin] = useState<string>('')
  const [salaryCurrency, setSalaryCurrency] = useState<string>('USD')

  const [locations, setLocations] = useState<string[]>([])
  const [skills, setSkills] = useState<SkillRequirement[]>([])
  const [companySizes, setCompanySizes] = useState<CompanySize[]>([])
  const [remotePolicies, setRemotePolicies] = useState<WorkType[]>([])
  const [benefits, setBenefits] = useState<string[]>([])
  const [avoidCompanies, setAvoidCompanies] = useState<string[]>([])
  const [avoidKeywords, setAvoidKeywords] = useState<string[]>([])

  // Skill input state
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillProficiency, setNewSkillProficiency] = useState<SkillProficiency>('intermediate')

  // Initialize from preferences
  useEffect(() => {
    if (preferences) {
      setJobTitles(preferences.preferred_job_titles || [])
      setExperience(preferences.experience_years || null)
      setSalaryMin(preferences.salary_min_override?.toString() || '')
      setSalaryCurrency(preferences.salary_currency_override || 'USD')
      setLocations(preferences.preferred_locations || [])
      setSkills(preferences.required_skills || [])
      setCompanySizes(preferences.company_size_preferences || [])
      setRemotePolicies(preferences.remote_policy_preferences || [])
      setBenefits(preferences.required_benefits || [])
      setAvoidCompanies(preferences.avoid_companies || [])
      setAvoidKeywords(preferences.avoid_keywords || [])
    }
  }, [preferences, isOpen])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave({
        preferred_job_titles: jobTitles,
        experience_years: experience,
        salary_min_override: salaryMin ? parseInt(salaryMin) : null,
        salary_currency_override: salaryCurrency || null,
        preferred_locations: locations,
        required_skills: skills,
        company_size_preferences: companySizes,
        remote_policy_preferences: remotePolicies,
        required_benefits: benefits,
        avoid_companies: avoidCompanies,
        avoid_keywords: avoidKeywords,
      })
      onClose()
    } finally {
      setIsSaving(false)
    }
  }, [
    jobTitles,
    experience,
    salaryMin,
    salaryCurrency,
    locations,
    skills,
    companySizes,
    remotePolicies,
    benefits,
    avoidCompanies,
    avoidKeywords,
    onSave,
    onClose,
  ])

  const addSkill = useCallback(() => {
    if (newSkillName.trim() && !skills.some((s) => s.skill.toLowerCase() === newSkillName.trim().toLowerCase())) {
      setSkills([...skills, { skill: newSkillName.trim(), proficiency: newSkillProficiency }])
      setNewSkillName('')
    }
  }, [newSkillName, newSkillProficiency, skills])

  const removeSkill = useCallback((skillName: string) => {
    setSkills(skills.filter((s) => s.skill !== skillName))
  }, [skills])

  const toggleCompanySize = useCallback((size: CompanySize) => {
    setCompanySizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }, [])

  const toggleRemotePolicy = useCallback((policy: WorkType) => {
    setRemotePolicies((prev) =>
      prev.includes(policy) ? prev.filter((p) => p !== policy) : [...prev, policy]
    )
  }, [])

  const toggleBenefit = useCallback((benefit: string) => {
    setBenefits((prev) =>
      prev.includes(benefit) ? prev.filter((b) => b !== benefit) : [...prev, benefit]
    )
  }, [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-text-primary">Preferences</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-lavender-dark text-lavender-dark'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-muted/50'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                  <motion.div
                    key="profile"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Job Titles
                      </label>
                      <TagInput
                        tags={jobTitles}
                        placeholder="e.g., Software Engineer"
                        onAdd={(tag) => !jobTitles.includes(tag) && setJobTitles([...jobTitles, tag])}
                        onRemove={(tag) => setJobTitles(jobTitles.filter((t) => t !== tag))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Years of Experience
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {EXPERIENCE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setExperience(experience === opt.value ? null : opt.value)}
                            className={cn(
                              'px-4 py-2 rounded-lg text-sm border transition-colors',
                              experience === opt.value
                                ? 'bg-lavender-dark text-white border-lavender-dark'
                                : 'bg-white border-rose-light hover:border-lavender'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Minimum Salary
                        </label>
                        <Input
                          type="number"
                          value={salaryMin}
                          onChange={(e) => setSalaryMin(e.target.value)}
                          placeholder="e.g., 150000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                          Currency
                        </label>
                        <select
                          value={salaryCurrency}
                          onChange={(e) => setSalaryCurrency(e.target.value)}
                          className="w-full h-10 px-3 border border-rose-light rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lavender/50"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="CAD">CAD</option>
                          <option value="AUD">AUD</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'search' && (
                  <motion.div
                    key="search"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Preferred Locations
                      </label>
                      <TagInput
                        tags={locations}
                        placeholder="e.g., San Francisco, Remote"
                        onAdd={(tag) => !locations.includes(tag) && setLocations([...locations, tag])}
                        onRemove={(tag) => setLocations(locations.filter((l) => l !== tag))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Required Skills
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
                              onClick={() => removeSkill(skill.skill)}
                              className="hover:bg-lavender/30 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newSkillName}
                          onChange={(e) => setNewSkillName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                          placeholder="e.g., React"
                          className="flex-1"
                        />
                        <select
                          value={newSkillProficiency}
                          onChange={(e) => setNewSkillProficiency(e.target.value as SkillProficiency)}
                          className="px-3 h-10 border border-rose-light rounded-lg text-sm bg-white"
                        >
                          {PROFICIENCY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <Button size="sm" variant="ghost" onClick={addSkill} disabled={!newSkillName.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Company Size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COMPANY_SIZE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => toggleCompanySize(opt.value)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
                              companySizes.includes(opt.value)
                                ? 'bg-lavender-dark text-white border-lavender-dark'
                                : 'bg-white border-rose-light hover:border-lavender'
                            )}
                          >
                            {companySizes.includes(opt.value) && <Check className="h-3 w-3" />}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Remote Work Policy
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {REMOTE_POLICY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => toggleRemotePolicy(opt.value)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
                              remotePolicies.includes(opt.value)
                                ? 'bg-lavender-dark text-white border-lavender-dark'
                                : 'bg-white border-rose-light hover:border-lavender'
                            )}
                          >
                            {remotePolicies.includes(opt.value) && <Check className="h-3 w-3" />}
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Required Benefits
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {BENEFITS_OPTIONS.map((benefit) => (
                          <button
                            key={benefit}
                            onClick={() => toggleBenefit(benefit)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-sm border transition-colors flex items-center gap-1.5',
                              benefits.includes(benefit)
                                ? 'bg-success-light text-success-dark border-success'
                                : 'bg-white border-rose-light hover:border-success'
                            )}
                          >
                            {benefits.includes(benefit) && <Check className="h-3 w-3" />}
                            {benefit}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Avoid Companies
                      </label>
                      <TagInput
                        tags={avoidCompanies}
                        placeholder="e.g., Company XYZ"
                        onAdd={(tag) => !avoidCompanies.includes(tag) && setAvoidCompanies([...avoidCompanies, tag])}
                        onRemove={(tag) => setAvoidCompanies(avoidCompanies.filter((c) => c !== tag))}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Avoid Keywords
                      </label>
                      <TagInput
                        tags={avoidKeywords}
                        placeholder="e.g., unpaid, intern"
                        onAdd={(tag) => !avoidKeywords.includes(tag) && setAvoidKeywords([...avoidKeywords, tag])}
                        onRemove={(tag) => setAvoidKeywords(avoidKeywords.filter((k) => k !== tag))}
                      />
                    </div>
                  </motion.div>
                )}

                {activeTab === 'notifications' && (
                  <motion.div
                    key="notifications"
                    variants={tabContentVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-6"
                  >
                    <Card>
                      <CardContent className="p-6">
                        <NotificationSettings
                          currentFrequency={preferences?.email_notification_frequency || 'disabled'}
                          onUpdate={onUpdateNotifications}
                        />
                      </CardContent>
                    </Card>

                    <div className="text-sm text-text-tertiary">
                      <p className="mb-2">
                        When enabled, you&apos;ll receive email digests containing:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>New AI-matched job opportunities</li>
                        <li>Market insights and trends</li>
                        <li>Personalized job search tips</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {activeTab !== 'notifications' && (
              <div className="p-6 border-t flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PreferencesModal
