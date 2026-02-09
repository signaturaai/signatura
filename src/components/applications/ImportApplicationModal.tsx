'use client'

/**
 * Import Application Modal
 *
 * Modal dialog for importing past job applications manually.
 * Allows users to add applications they've already submitted
 * to track them in the system.
 */

import { useState, useRef, useCallback } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { X, Upload, Calendar, FileText, Building2, Briefcase, Link2, AlertCircle } from 'lucide-react'
import type { ApplicationStatus, JobApplication } from '@/lib/types/dashboard'

interface ImportApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (application: Partial<JobApplication>, file: File | null) => void
}

// Status options for the dropdown
const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

interface FormData {
  companyName: string
  positionTitle: string
  applicationDate: string
  status: ApplicationStatus
  jobUrl: string
  jobDescription: string
}

interface FormErrors {
  companyName?: string
  positionTitle?: string
  applicationDate?: string
  status?: string
  cvFile?: string
}

export default function ImportApplicationModal({
  isOpen,
  onClose,
  onImport,
}: ImportApplicationModalProps) {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    positionTitle: '',
    applicationDate: new Date().toISOString().split('T')[0],
    status: 'applied',
    jobUrl: '',
    jobDescription: '',
  })

  // File state
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle form field changes
  const handleChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  // Handle file selection
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, cvFile: 'Only PDF files are allowed' }))
      return
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      setErrors((prev) => ({ ...prev, cvFile: 'File size must be less than 10MB' }))
      return
    }

    setCvFile(file)
    setErrors((prev) => ({ ...prev, cvFile: undefined }))
  }, [])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    handleFileSelect(file)
  }, [handleFileSelect])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0] || null
    handleFileSelect(file)
  }, [handleFileSelect])

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required'
    }

    if (!formData.positionTitle.trim()) {
      newErrors.positionTitle = 'Position title is required'
    }

    if (!formData.applicationDate) {
      newErrors.applicationDate = 'Application date is required'
    }

    if (!formData.status) {
      newErrors.status = 'Status is required'
    }

    if (!cvFile) {
      newErrors.cvFile = 'CV/Resume is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, cvFile])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Create application object
      const application: Partial<JobApplication> = {
        company_name: formData.companyName.trim(),
        position_title: formData.positionTitle.trim(),
        application_date: new Date(formData.applicationDate).toISOString(),
        application_status: formData.status,
        job_url: formData.jobUrl.trim() || undefined,
        job_description: formData.jobDescription.trim() || undefined,
        application_method: 'other',
        source: 'Manual Import',
      }

      onImport(application, cvFile)

      // Reset form
      setFormData({
        companyName: '',
        positionTitle: '',
        applicationDate: new Date().toISOString().split('T')[0],
        status: 'applied',
        jobUrl: '',
        jobDescription: '',
      })
      setCvFile(null)
      setErrors({})
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, cvFile, validateForm, onImport])

  // Handle close
  const handleClose = useCallback(() => {
    setFormData({
      companyName: '',
      positionTitle: '',
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'applied',
      jobUrl: '',
      jobDescription: '',
    })
    setCvFile(null)
    setErrors({})
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Import Past Application
            </h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              Add an application you have already submitted
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-tertiary hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Company Name */}
            <div>
              <Label htmlFor="companyName" className="flex items-center gap-1 mb-1.5">
                <Building2 className="w-4 h-4 text-text-tertiary" />
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                type="text"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="e.g., Google, Stripe, Airbnb"
                className={`focus:border-teal-600 focus:ring-teal-600 ${
                  errors.companyName ? 'border-red-500' : ''
                }`}
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.companyName}
                </p>
              )}
            </div>

            {/* Position Title */}
            <div>
              <Label htmlFor="positionTitle" className="flex items-center gap-1 mb-1.5">
                <Briefcase className="w-4 h-4 text-text-tertiary" />
                Position Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="positionTitle"
                type="text"
                value={formData.positionTitle}
                onChange={(e) => handleChange('positionTitle', e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                className={`focus:border-teal-600 focus:ring-teal-600 ${
                  errors.positionTitle ? 'border-red-500' : ''
                }`}
              />
              {errors.positionTitle && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.positionTitle}
                </p>
              )}
            </div>

            {/* Application Date and Status - Two Column */}
            <div className="grid grid-cols-2 gap-4">
              {/* Application Date */}
              <div>
                <Label htmlFor="applicationDate" className="flex items-center gap-1 mb-1.5">
                  <Calendar className="w-4 h-4 text-text-tertiary" />
                  Application Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="applicationDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) => handleChange('applicationDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`focus:border-teal-600 focus:ring-teal-600 ${
                    errors.applicationDate ? 'border-red-500' : ''
                  }`}
                />
                {errors.applicationDate && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.applicationDate}
                  </p>
                )}
              </div>

              {/* Current Status */}
              <div>
                <Label htmlFor="status" className="flex items-center gap-1 mb-1.5">
                  Current Status <span className="text-red-500">*</span>
                </Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value as ApplicationStatus)}
                  className={`w-full h-10 px-3 rounded-md border border-gray-200 bg-white text-sm text-text-primary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 ${
                    errors.status ? 'border-red-500' : ''
                  }`}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.status}
                  </p>
                )}
              </div>
            </div>

            {/* Job Posting URL */}
            <div>
              <Label htmlFor="jobUrl" className="flex items-center gap-1 mb-1.5">
                <Link2 className="w-4 h-4 text-text-tertiary" />
                Job Posting URL
                <span className="text-text-tertiary text-xs ml-1">(Optional)</span>
              </Label>
              <Input
                id="jobUrl"
                type="url"
                value={formData.jobUrl}
                onChange={(e) => handleChange('jobUrl', e.target.value)}
                placeholder="https://..."
                className="focus:border-teal-600 focus:ring-teal-600"
              />
            </div>

            {/* Job Description */}
            <div>
              <Label htmlFor="jobDescription" className="flex items-center gap-1 mb-1.5">
                <FileText className="w-4 h-4 text-text-tertiary" />
                Job Description
                <span className="text-text-tertiary text-xs ml-1">(Optional)</span>
              </Label>
              <textarea
                id="jobDescription"
                value={formData.jobDescription}
                onChange={(e) => handleChange('jobDescription', e.target.value)}
                placeholder="Paste the full job description here for better AI analysis..."
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none"
              />
            </div>

            {/* CV/Resume Upload */}
            <div>
              <Label className="flex items-center gap-1 mb-1.5">
                CV/Resume <span className="text-red-500">*</span>
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-teal-600 bg-teal-50'
                    : errors.cvFile
                      ? 'border-red-300 bg-red-50'
                      : cvFile
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-300 hover:border-teal-600 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {cvFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-3">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <p className="text-sm font-medium text-text-primary">{cvFile.name}</p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCvFile(null)
                      }}
                      className="mt-2 text-xs text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-text-secondary">
                      <span className="text-teal-600 font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      PDF only, max 10MB
                    </p>
                  </div>
                )}
              </div>
              {errors.cvFile && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.cvFile}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isSubmitting ? 'Importing...' : 'Import Application'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
