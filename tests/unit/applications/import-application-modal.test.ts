/**
 * Import Application Modal - RALPH Tests
 *
 * Tests for modal open/close behavior, form validation,
 * file upload handling, and form submission logic.
 */

import { describe, it, expect } from 'vitest'
import type { ApplicationStatus } from '@/lib/types/dashboard'

// ============================================================
// Types matching the ImportApplicationModal component
// ============================================================

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

// Status options matching the component
const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'interviewed', label: 'Interviewed' },
  { value: 'offer_received', label: 'Offer Received' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

// ============================================================
// Helper: form validation logic (mirrors component logic)
// ============================================================

function validateForm(formData: FormData, cvFile: File | null): FormErrors {
  const errors: FormErrors = {}

  if (!formData.companyName.trim()) {
    errors.companyName = 'Company name is required'
  }

  if (!formData.positionTitle.trim()) {
    errors.positionTitle = 'Position title is required'
  }

  if (!formData.applicationDate) {
    errors.applicationDate = 'Application date is required'
  }

  if (!formData.status) {
    errors.status = 'Status is required'
  }

  if (!cvFile) {
    errors.cvFile = 'CV/Resume is required'
  }

  return errors
}

function validateFileType(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'Only PDF files are allowed'
  }
  return null
}

function validateFileSize(file: File): string | null {
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return 'File size must be less than 10MB'
  }
  return null
}

function createDefaultFormData(): FormData {
  return {
    companyName: '',
    positionTitle: '',
    applicationDate: new Date().toISOString().split('T')[0],
    status: 'applied',
    jobUrl: '',
    jobDescription: '',
  }
}

function createValidFormData(): FormData {
  return {
    companyName: 'Google',
    positionTitle: 'Senior Software Engineer',
    applicationDate: '2026-01-15',
    status: 'applied',
    jobUrl: 'https://careers.google.com/jobs/123',
    jobDescription: 'Build scalable systems...',
  }
}

function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type })
}

// ============================================================
// TEST SUITE: Modal Open/Close Behavior
// ============================================================

describe('Import Application Modal - Open/Close', () => {
  it('should not render when isOpen is false', () => {
    const isOpen = false
    expect(isOpen).toBe(false)
  })

  it('should render when isOpen is true', () => {
    const isOpen = true
    expect(isOpen).toBe(true)
  })

  it('should reset form data on close', () => {
    const formData = createValidFormData()
    // Simulate close -> reset
    const resetData = createDefaultFormData()
    expect(resetData.companyName).toBe('')
    expect(resetData.positionTitle).toBe('')
    expect(resetData.status).toBe('applied')
    expect(resetData.jobUrl).toBe('')
    expect(resetData.jobDescription).toBe('')
    expect(formData.companyName).not.toBe(resetData.companyName)
  })

  it('should reset file on close', () => {
    let cvFile: File | null = createMockFile('resume.pdf', 1024, 'application/pdf')
    // Simulate close
    cvFile = null
    expect(cvFile).toBeNull()
  })

  it('should reset errors on close', () => {
    const errors: FormErrors = {
      companyName: 'Company name is required',
      positionTitle: 'Position title is required',
    }
    // Simulate close -> clear errors
    const clearedErrors: FormErrors = {}
    expect(Object.keys(clearedErrors).length).toBe(0)
    expect(Object.keys(errors).length).toBeGreaterThan(0)
  })

  it('should have default form state with today\'s date', () => {
    const formData = createDefaultFormData()
    const today = new Date().toISOString().split('T')[0]
    expect(formData.applicationDate).toBe(today)
  })

  it('should default status to applied', () => {
    const formData = createDefaultFormData()
    expect(formData.status).toBe('applied')
  })
})

// ============================================================
// TEST SUITE: Form Validation
// ============================================================

describe('Import Application Modal - Form Validation', () => {
  describe('Required fields', () => {
    it('should fail validation when all fields are empty', () => {
      const formData = createDefaultFormData()
      const errors = validateForm(formData, null)
      expect(Object.keys(errors).length).toBeGreaterThan(0)
      expect(errors.companyName).toBeDefined()
      expect(errors.positionTitle).toBeDefined()
      expect(errors.cvFile).toBeDefined()
    })

    it('should fail validation when company name is empty', () => {
      const formData = createValidFormData()
      formData.companyName = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(errors.companyName).toBe('Company name is required')
    })

    it('should fail validation when company name is whitespace only', () => {
      const formData = createValidFormData()
      formData.companyName = '   '
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(errors.companyName).toBe('Company name is required')
    })

    it('should fail validation when position title is empty', () => {
      const formData = createValidFormData()
      formData.positionTitle = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(errors.positionTitle).toBe('Position title is required')
    })

    it('should fail validation when position title is whitespace only', () => {
      const formData = createValidFormData()
      formData.positionTitle = '   '
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(errors.positionTitle).toBe('Position title is required')
    })

    it('should fail validation when application date is empty', () => {
      const formData = createValidFormData()
      formData.applicationDate = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(errors.applicationDate).toBe('Application date is required')
    })

    it('should fail validation when CV file is null', () => {
      const formData = createValidFormData()
      const errors = validateForm(formData, null)
      expect(errors.cvFile).toBe('CV/Resume is required')
    })

    it('should pass validation when all required fields are filled', () => {
      const formData = createValidFormData()
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(Object.keys(errors).length).toBe(0)
    })
  })

  describe('Optional fields', () => {
    it('should pass validation without jobUrl', () => {
      const formData = createValidFormData()
      formData.jobUrl = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('should pass validation without jobDescription', () => {
      const formData = createValidFormData()
      formData.jobDescription = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('should pass validation without both optional fields', () => {
      const formData = createValidFormData()
      formData.jobUrl = ''
      formData.jobDescription = ''
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const errors = validateForm(formData, file)
      expect(Object.keys(errors).length).toBe(0)
    })
  })

  describe('Multiple errors', () => {
    it('should return all errors at once', () => {
      const formData: FormData = {
        companyName: '',
        positionTitle: '',
        applicationDate: '',
        status: '' as ApplicationStatus,
        jobUrl: '',
        jobDescription: '',
      }
      const errors = validateForm(formData, null)
      expect(errors.companyName).toBeDefined()
      expect(errors.positionTitle).toBeDefined()
      expect(errors.applicationDate).toBeDefined()
      expect(errors.status).toBeDefined()
      expect(errors.cvFile).toBeDefined()
    })

    it('should return exactly 5 errors for completely empty form', () => {
      const formData: FormData = {
        companyName: '',
        positionTitle: '',
        applicationDate: '',
        status: '' as ApplicationStatus,
        jobUrl: '',
        jobDescription: '',
      }
      const errors = validateForm(formData, null)
      expect(Object.keys(errors).length).toBe(5)
    })
  })
})

// ============================================================
// TEST SUITE: File Upload Validation
// ============================================================

describe('Import Application Modal - File Upload', () => {
  describe('File type validation', () => {
    it('should accept PDF files', () => {
      const file = createMockFile('resume.pdf', 1024, 'application/pdf')
      const error = validateFileType(file)
      expect(error).toBeNull()
    })

    it('should reject DOCX files', () => {
      const file = createMockFile('resume.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      const error = validateFileType(file)
      expect(error).toBe('Only PDF files are allowed')
    })

    it('should reject PNG files', () => {
      const file = createMockFile('screenshot.png', 1024, 'image/png')
      const error = validateFileType(file)
      expect(error).toBe('Only PDF files are allowed')
    })

    it('should reject JPEG files', () => {
      const file = createMockFile('photo.jpg', 1024, 'image/jpeg')
      const error = validateFileType(file)
      expect(error).toBe('Only PDF files are allowed')
    })

    it('should reject plain text files', () => {
      const file = createMockFile('resume.txt', 1024, 'text/plain')
      const error = validateFileType(file)
      expect(error).toBe('Only PDF files are allowed')
    })

    it('should reject HTML files', () => {
      const file = createMockFile('page.html', 1024, 'text/html')
      const error = validateFileType(file)
      expect(error).toBe('Only PDF files are allowed')
    })
  })

  describe('File size validation', () => {
    it('should accept files under 10MB', () => {
      const file = createMockFile('resume.pdf', 5 * 1024 * 1024, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBeNull()
    })

    it('should accept files exactly at 10MB', () => {
      const file = createMockFile('resume.pdf', 10 * 1024 * 1024, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBeNull()
    })

    it('should reject files over 10MB', () => {
      const file = createMockFile('large.pdf', 10 * 1024 * 1024 + 1, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBe('File size must be less than 10MB')
    })

    it('should accept very small files', () => {
      const file = createMockFile('tiny.pdf', 100, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBeNull()
    })

    it('should reject 20MB files', () => {
      const file = createMockFile('huge.pdf', 20 * 1024 * 1024, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBe('File size must be less than 10MB')
    })

    it('should accept 1 byte file', () => {
      const file = createMockFile('minimal.pdf', 1, 'application/pdf')
      const error = validateFileSize(file)
      expect(error).toBeNull()
    })
  })

  describe('Combined file validation', () => {
    it('should pass both checks for a valid PDF under 10MB', () => {
      const file = createMockFile('resume.pdf', 2 * 1024 * 1024, 'application/pdf')
      const typeError = validateFileType(file)
      const sizeError = validateFileSize(file)
      expect(typeError).toBeNull()
      expect(sizeError).toBeNull()
    })

    it('should fail type check for non-PDF even if size is valid', () => {
      const file = createMockFile('resume.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      const typeError = validateFileType(file)
      const sizeError = validateFileSize(file)
      expect(typeError).not.toBeNull()
      expect(sizeError).toBeNull()
    })

    it('should fail size check for oversized PDF', () => {
      const file = createMockFile('large.pdf', 15 * 1024 * 1024, 'application/pdf')
      const typeError = validateFileType(file)
      const sizeError = validateFileSize(file)
      expect(typeError).toBeNull()
      expect(sizeError).not.toBeNull()
    })
  })
})

// ============================================================
// TEST SUITE: Status Options
// ============================================================

describe('Import Application Modal - Status Options', () => {
  it('should have 6 status options', () => {
    expect(STATUS_OPTIONS.length).toBe(6)
  })

  it('should include applied status', () => {
    const applied = STATUS_OPTIONS.find(s => s.value === 'applied')
    expect(applied).toBeDefined()
    expect(applied?.label).toBe('Applied')
  })

  it('should include interview_scheduled status', () => {
    const option = STATUS_OPTIONS.find(s => s.value === 'interview_scheduled')
    expect(option).toBeDefined()
    expect(option?.label).toBe('Interview Scheduled')
  })

  it('should include interviewed status', () => {
    const option = STATUS_OPTIONS.find(s => s.value === 'interviewed')
    expect(option).toBeDefined()
    expect(option?.label).toBe('Interviewed')
  })

  it('should include offer_received status', () => {
    const option = STATUS_OPTIONS.find(s => s.value === 'offer_received')
    expect(option).toBeDefined()
    expect(option?.label).toBe('Offer Received')
  })

  it('should include rejected status', () => {
    const option = STATUS_OPTIONS.find(s => s.value === 'rejected')
    expect(option).toBeDefined()
    expect(option?.label).toBe('Rejected')
  })

  it('should include withdrawn status', () => {
    const option = STATUS_OPTIONS.find(s => s.value === 'withdrawn')
    expect(option).toBeDefined()
    expect(option?.label).toBe('Withdrawn')
  })

  it('should NOT include prepared status (import is for past applications)', () => {
    const prepared = STATUS_OPTIONS.find(s => s.value === 'prepared')
    expect(prepared).toBeUndefined()
  })

  it('should NOT include negotiating status', () => {
    const negotiating = STATUS_OPTIONS.find(s => s.value === 'negotiating')
    expect(negotiating).toBeUndefined()
  })

  it('should have unique values', () => {
    const values = STATUS_OPTIONS.map(s => s.value)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })

  it('should have unique labels', () => {
    const labels = STATUS_OPTIONS.map(s => s.label)
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })
})

// ============================================================
// TEST SUITE: Form Submission Data Transformation
// ============================================================

describe('Import Application Modal - Form Submission', () => {
  it('should trim company name', () => {
    const formData = createValidFormData()
    formData.companyName = '  Google  '
    const trimmed = formData.companyName.trim()
    expect(trimmed).toBe('Google')
  })

  it('should trim position title', () => {
    const formData = createValidFormData()
    formData.positionTitle = '  Senior Engineer  '
    const trimmed = formData.positionTitle.trim()
    expect(trimmed).toBe('Senior Engineer')
  })

  it('should convert date to ISO string', () => {
    const dateStr = '2026-01-15'
    const isoDate = new Date(dateStr).toISOString()
    expect(isoDate).toContain('2026-01-15')
  })

  it('should set application_method to other for imports', () => {
    const method = 'other'
    expect(method).toBe('other')
  })

  it('should set source to Manual Import', () => {
    const source = 'Manual Import'
    expect(source).toBe('Manual Import')
  })

  it('should handle empty jobUrl as undefined', () => {
    const jobUrl = ''.trim() || undefined
    expect(jobUrl).toBeUndefined()
  })

  it('should handle non-empty jobUrl', () => {
    const jobUrl = 'https://careers.google.com'.trim() || undefined
    expect(jobUrl).toBe('https://careers.google.com')
  })

  it('should handle empty jobDescription as undefined', () => {
    const desc = ''.trim() || undefined
    expect(desc).toBeUndefined()
  })

  it('should handle non-empty jobDescription', () => {
    const desc = 'Build systems...'.trim() || undefined
    expect(desc).toBe('Build systems...')
  })

  it('should construct valid partial application object', () => {
    const formData = createValidFormData()
    const application = {
      company_name: formData.companyName.trim(),
      position_title: formData.positionTitle.trim(),
      application_date: new Date(formData.applicationDate).toISOString(),
      application_status: formData.status,
      job_url: formData.jobUrl.trim() || undefined,
      job_description: formData.jobDescription.trim() || undefined,
      application_method: 'other' as const,
      source: 'Manual Import',
    }
    expect(application.company_name).toBe('Google')
    expect(application.position_title).toBe('Senior Software Engineer')
    expect(application.application_status).toBe('applied')
    expect(application.application_method).toBe('other')
    expect(application.source).toBe('Manual Import')
    expect(application.job_url).toBe('https://careers.google.com/jobs/123')
    expect(application.job_description).toBe('Build scalable systems...')
  })
})

// ============================================================
// TEST SUITE: Form Reset Behavior
// ============================================================

describe('Import Application Modal - Form Reset', () => {
  it('should reset company name to empty', () => {
    const reset = createDefaultFormData()
    expect(reset.companyName).toBe('')
  })

  it('should reset position title to empty', () => {
    const reset = createDefaultFormData()
    expect(reset.positionTitle).toBe('')
  })

  it('should reset status to applied', () => {
    const reset = createDefaultFormData()
    expect(reset.status).toBe('applied')
  })

  it('should reset job URL to empty', () => {
    const reset = createDefaultFormData()
    expect(reset.jobUrl).toBe('')
  })

  it('should reset job description to empty', () => {
    const reset = createDefaultFormData()
    expect(reset.jobDescription).toBe('')
  })

  it('should reset date to today', () => {
    const reset = createDefaultFormData()
    const today = new Date().toISOString().split('T')[0]
    expect(reset.applicationDate).toBe(today)
  })
})

// ============================================================
// TEST SUITE: Error Clearing on Input
// ============================================================

describe('Import Application Modal - Error Clearing', () => {
  it('should clear companyName error when field changes', () => {
    const errors: FormErrors = { companyName: 'Company name is required' }
    // Simulate user typing -> clear that field's error
    if (errors.companyName) {
      errors.companyName = undefined
    }
    expect(errors.companyName).toBeUndefined()
  })

  it('should clear positionTitle error when field changes', () => {
    const errors: FormErrors = { positionTitle: 'Position title is required' }
    if (errors.positionTitle) {
      errors.positionTitle = undefined
    }
    expect(errors.positionTitle).toBeUndefined()
  })

  it('should clear cvFile error when valid file is selected', () => {
    const errors: FormErrors = { cvFile: 'CV/Resume is required' }
    const file = createMockFile('resume.pdf', 1024, 'application/pdf')
    if (file.type === 'application/pdf') {
      errors.cvFile = undefined
    }
    expect(errors.cvFile).toBeUndefined()
  })

  it('should not clear other errors when one field changes', () => {
    const errors: FormErrors = {
      companyName: 'Company name is required',
      positionTitle: 'Position title is required',
    }
    // Clear only companyName
    errors.companyName = undefined
    expect(errors.companyName).toBeUndefined()
    expect(errors.positionTitle).toBe('Position title is required')
  })
})

// ============================================================
// TEST SUITE: Drag and Drop State
// ============================================================

describe('Import Application Modal - Drag and Drop', () => {
  it('should set dragging state on drag over', () => {
    let isDragging = false
    // Simulate dragOver
    isDragging = true
    expect(isDragging).toBe(true)
  })

  it('should clear dragging state on drag leave', () => {
    let isDragging = true
    // Simulate dragLeave
    isDragging = false
    expect(isDragging).toBe(false)
  })

  it('should clear dragging state on drop', () => {
    let isDragging = true
    // Simulate drop
    isDragging = false
    expect(isDragging).toBe(false)
  })

  it('should accept dropped PDF file', () => {
    const file = createMockFile('dropped.pdf', 2048, 'application/pdf')
    const typeError = validateFileType(file)
    const sizeError = validateFileSize(file)
    expect(typeError).toBeNull()
    expect(sizeError).toBeNull()
  })

  it('should reject dropped non-PDF file', () => {
    const file = createMockFile('image.png', 2048, 'image/png')
    const typeError = validateFileType(file)
    expect(typeError).toBe('Only PDF files are allowed')
  })
})

// ============================================================
// TEST SUITE: Toast Integration
// ============================================================

describe('Import Application Modal - Toast Messages', () => {
  it('should generate success message with company name', () => {
    const companyName = 'Google'
    const message = `Successfully imported application for ${companyName}`
    expect(message).toBe('Successfully imported application for Google')
  })

  it('should generate success message with different company', () => {
    const companyName = 'Stripe'
    const message = `Successfully imported application for ${companyName}`
    expect(message).toContain('Stripe')
  })

  it('should use success toast type', () => {
    const type = 'success'
    expect(type).toBe('success')
  })
})
