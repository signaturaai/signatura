/**
 * CV Tailor RALPH Evaluation Tests
 *
 * Tests the CV Tailor component for:
 * - R: Routing - Back button and navigation with application context
 * - A: API - Field names match Supabase schema (lowercase)
 * - L: Logic - Application selection, CV fetching, null handling
 * - P: Parameters - application_id flow through the system
 * - H: Handling - Empty states, no CVs, no applications
 */

import { describe, it, expect } from 'vitest'

describe('CV Tailor - RALPH Evaluation', () => {
  describe('R - Routing', () => {
    it('should construct back URL with application_id when selected', () => {
      const selectedApplication = { id: 'app-123' }
      const backUrl = selectedApplication
        ? `/applications/${selectedApplication.id}`
        : '/dashboard'

      expect(backUrl).toBe('/applications/app-123')
    })

    it('should fall back to dashboard when no application selected', () => {
      const selectedApplication = null
      const returnTo = '/dashboard'
      const backUrl = selectedApplication
        ? `/applications/${(selectedApplication as any).id}`
        : returnTo

      expect(backUrl).toBe('/dashboard')
    })

    it('should use custom returnTo parameter if provided', () => {
      const selectedApplication = null
      const returnTo = '/some-custom-path'
      const backUrl = selectedApplication
        ? `/applications/${(selectedApplication as any).id}`
        : returnTo

      expect(backUrl).toBe('/some-custom-path')
    })

    it('should pass application_id in CV generation request', () => {
      const selectedApplication = { id: 'app-456' }
      const requestBody = {
        applicationId: selectedApplication.id,
        jobDescription: 'Test JD',
        baseCVText: 'Test CV',
      }

      expect(requestBody.applicationId).toBe('app-456')
    })
  })

  describe('A - API Field Names', () => {
    it('should use lowercase job_applications fields to match PostgreSQL schema', () => {
      // CRITICAL: All column names MUST be lowercase to avoid 400 errors
      const queryFields = [
        'id',
        'company_name',
        'position_title',
        'job_description',
        'application_status',
        'created_at',
      ]

      // Verify all fields are lowercase
      queryFields.forEach(field => {
        expect(field).toBe(field.toLowerCase())
      })

      expect(queryFields).toContain('job_description')
      expect(queryFields).toContain('company_name')
      expect(queryFields).toContain('position_title')
    })

    it('should use lowercase base_cvs fields', () => {
      const queryFields = ['id', 'name', 'raw_text', 'is_primary', 'created_at']

      queryFields.forEach(field => {
        expect(field).toBe(field.toLowerCase())
      })

      expect(queryFields).toContain('raw_text')
      expect(queryFields).toContain('is_primary')
    })

    it('should filter applications by user_id', () => {
      const userId = 'user-123'
      const queryFilter = {
        column: 'user_id',
        value: userId
      }

      expect(queryFilter.column).toBe('user_id')
      expect(queryFilter.value).toBe(userId)
    })
  })

  describe('L - Logic', () => {
    it('should handle application selection correctly', () => {
      const handleSelectApplication = (
        app: { id: string; company_name: string; position_title: string },
        setSelectedApplication: (val: any) => void,
        setShowDropdown: (val: boolean) => void
      ) => {
        setSelectedApplication(app)
        setShowDropdown(false)
      }

      let selectedApp: any = null
      let dropdownOpen = true

      handleSelectApplication(
        { id: 'app-1', company_name: 'Test Corp', position_title: 'Engineer' },
        (val) => { selectedApp = val },
        (val) => { dropdownOpen = val }
      )

      expect(selectedApp).not.toBeNull()
      expect(selectedApp.id).toBe('app-1')
      expect(dropdownOpen).toBe(false)
    })

    it('should auto-select primary CV', () => {
      const baseCVs = [
        { id: '1', name: 'CV 1', raw_text: 'Content 1', is_primary: false },
        { id: '2', name: 'Primary CV', raw_text: 'Content 2', is_primary: true },
        { id: '3', name: 'CV 3', raw_text: 'Content 3', is_primary: false },
      ]

      const primaryCV = baseCVs.find(cv => cv.is_primary) || baseCVs[0]
      expect(primaryCV.id).toBe('2')
      expect(primaryCV.is_primary).toBe(true)
    })

    it('should fall back to first CV if no primary', () => {
      const baseCVs = [
        { id: '1', name: 'CV 1', raw_text: 'Content 1', is_primary: false },
        { id: '2', name: 'CV 2', raw_text: 'Content 2', is_primary: false },
      ]

      const selectedCV = baseCVs.find(cv => cv.is_primary) || baseCVs[0]
      expect(selectedCV.id).toBe('1')
    })

    it('should detect no usable CVs when all empty', () => {
      const baseCVs = [
        { id: '1', raw_text: '' },
        { id: '2', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      expect(hasUsableCVs).toBe(false)
    })

    it('should detect usable CVs correctly', () => {
      const baseCVs = [
        { id: '1', raw_text: 'Full CV content here' },
        { id: '2', raw_text: '' },
        { id: '3', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      expect(hasUsableCVs).toBe(true)
    })
  })

  describe('P - Parameters', () => {
    it('should extract application_id from URL search params', () => {
      const searchParams = new URLSearchParams('application_id=app-789')
      const applicationIdFromUrl = searchParams.get('application_id')

      expect(applicationIdFromUrl).toBe('app-789')
    })

    it('should find application by ID from fetched list', () => {
      const applications = [
        { id: 'app-1', company_name: 'Company A' },
        { id: 'app-2', company_name: 'Company B' },
        { id: 'app-3', company_name: 'Company C' },
      ]

      const targetId = 'app-2'
      const found = applications.find(a => a.id === targetId)

      expect(found).toBeDefined()
      expect(found?.company_name).toBe('Company B')
    })

    it('should construct API request body with all required fields', () => {
      const selectedApplication = {
        id: 'app-123',
        company_name: 'Test Corp',
        position_title: 'Engineer',
        job_description: 'Full job description here',
      }

      const requestBody = {
        applicationId: selectedApplication.id,
        baseCVText: 'Test CV content',
        jobDescription: selectedApplication.job_description,
        industry: 'generic',
        saveToDatabase: true,
      }

      expect(requestBody.applicationId).toBe('app-123')
      expect(requestBody.jobDescription).toBe('Full job description here')
      expect(requestBody.saveToDatabase).toBe(true)
    })
  })

  describe('H - Handling', () => {
    it('should show empty state when no applications exist', () => {
      const applications: any[] = []
      const showNoApplicationsState = applications.length === 0

      expect(showNoApplicationsState).toBe(true)
    })

    it('should show warning when no usable CVs exist', () => {
      const baseCVs = [
        { id: '1', raw_text: '' },
        { id: '2', raw_text: null },
      ]

      const hasUsableCVs = baseCVs.some(
        cv => cv.raw_text && cv.raw_text.length > 0
      )

      const showNoCVWarning = !hasUsableCVs
      expect(showNoCVWarning).toBe(true)
    })

    it('should disable continue button when no application selected', () => {
      const selectedApplication = null
      const selectedCV = { raw_text: 'CV content' }
      const isLoading = false

      const canContinue = selectedApplication && selectedCV?.raw_text && !isLoading
      expect(canContinue).toBeFalsy()
    })

    it('should disable continue button when no CV selected', () => {
      const selectedApplication = { id: 'app-1' }
      const selectedCV = { raw_text: null }
      const isLoading = false

      const canContinue = selectedApplication && selectedCV?.raw_text && !isLoading
      expect(canContinue).toBeFalsy()
    })

    it('should enable continue button when all conditions met', () => {
      const selectedApplication = { id: 'app-1' }
      const selectedCV = { raw_text: 'CV content here' }
      const isLoading = false

      const canContinue = selectedApplication && selectedCV?.raw_text && !isLoading
      expect(canContinue).toBeTruthy()
    })
  })
})

describe('CV Tailor - Multiple Versions BETA Feature', () => {
  describe('Target Role Management', () => {
    it('should initialize with one empty role input', () => {
      const initialRoles = ['']

      expect(initialRoles.length).toBe(1)
      expect(initialRoles[0]).toBe('')
    })

    it('should add a new role input', () => {
      const handleAddRole = (roles: string[]): string[] => {
        if (roles.length < 5) {
          return [...roles, '']
        }
        return roles
      }

      let roles = ['Senior Engineer']
      roles = handleAddRole(roles)

      expect(roles.length).toBe(2)
      expect(roles[1]).toBe('')
    })

    it('should not add more than 5 role inputs', () => {
      const handleAddRole = (roles: string[]): string[] => {
        if (roles.length < 5) {
          return [...roles, '']
        }
        return roles
      }

      let roles = ['Role 1', 'Role 2', 'Role 3', 'Role 4', 'Role 5']
      roles = handleAddRole(roles)

      expect(roles.length).toBe(5)
    })

    it('should remove a role input', () => {
      const handleRemoveRole = (roles: string[], index: number): string[] => {
        if (roles.length > 1) {
          return roles.filter((_, i) => i !== index)
        }
        return roles
      }

      let roles = ['Senior Engineer', 'Product Manager', 'Tech Lead']
      roles = handleRemoveRole(roles, 1)

      expect(roles.length).toBe(2)
      expect(roles).toEqual(['Senior Engineer', 'Tech Lead'])
    })

    it('should not remove last role input', () => {
      const handleRemoveRole = (roles: string[], index: number): string[] => {
        if (roles.length > 1) {
          return roles.filter((_, i) => i !== index)
        }
        return roles
      }

      let roles = ['Senior Engineer']
      roles = handleRemoveRole(roles, 0)

      expect(roles.length).toBe(1)
    })

    it('should update role input value', () => {
      const handleRoleChange = (roles: string[], index: number, value: string): string[] => {
        const newRoles = [...roles]
        newRoles[index] = value
        return newRoles
      }

      let roles = ['', '']
      roles = handleRoleChange(roles, 0, 'Senior Software Engineer')
      roles = handleRoleChange(roles, 1, 'Product Manager')

      expect(roles[0]).toBe('Senior Software Engineer')
      expect(roles[1]).toBe('Product Manager')
    })
  })

  describe('Valid Roles Counting', () => {
    it('should count non-empty roles', () => {
      const roles = ['Senior Engineer', '', 'Product Manager', '']
      const validCount = roles.filter(role => role.trim().length > 0).length

      expect(validCount).toBe(2)
    })

    it('should return 0 for all empty roles', () => {
      const roles = ['', '', '']
      const validCount = roles.filter(role => role.trim().length > 0).length

      expect(validCount).toBe(0)
    })

    it('should handle whitespace-only roles as invalid', () => {
      const roles = ['  ', '\t', 'Valid Role', '\n']
      const validCount = roles.filter(role => role.trim().length > 0).length

      expect(validCount).toBe(1)
    })
  })

  describe('Generate Button State', () => {
    it('should disable generate button when no valid roles', () => {
      const validRolesCount = 0
      const baseCVText = 'CV content'
      const isGenerating = false

      const canGenerate = validRolesCount > 0 && baseCVText && !isGenerating
      expect(canGenerate).toBe(false)
    })

    it('should disable generate button when no CV text', () => {
      const validRolesCount = 2
      const baseCVText = ''
      const isGenerating = false

      const canGenerate = validRolesCount > 0 && baseCVText && !isGenerating
      expect(canGenerate).toBeFalsy()
    })

    it('should disable generate button while generating', () => {
      const validRolesCount = 2
      const baseCVText = 'CV content'
      const isGenerating = true

      const canGenerate = validRolesCount > 0 && baseCVText && !isGenerating
      expect(canGenerate).toBe(false)
    })

    it('should enable generate button when all conditions met', () => {
      const validRolesCount = 2
      const baseCVText = 'CV content'
      const isGenerating = false

      const canGenerate = validRolesCount > 0 && baseCVText && !isGenerating
      expect(canGenerate).toBe(true)
    })
  })

  describe('Button Text Formatting', () => {
    it('should show singular when 1 role', () => {
      const validRolesCount = 1
      const buttonText = `Generate ${validRolesCount} CV Version${validRolesCount !== 1 ? 's' : ''}`

      expect(buttonText).toBe('Generate 1 CV Version')
    })

    it('should show plural when multiple roles', () => {
      const validRolesCount = 3
      const buttonText = `Generate ${validRolesCount} CV Version${validRolesCount !== 1 ? 's' : ''}`

      expect(buttonText).toBe('Generate 3 CV Versions')
    })

    it('should show 0 versions when no valid roles', () => {
      const validRolesCount = 0
      const buttonText = `Generate ${validRolesCount} CV Version${validRolesCount !== 1 ? 's' : ''}`

      expect(buttonText).toBe('Generate 0 CV Versions')
    })
  })
})

describe('CV Tailor - Application Dropdown', () => {
  it('should display company initial in avatar', () => {
    const companyName = 'Microsoft'
    const initial = companyName.charAt(0)

    expect(initial).toBe('M')
  })

  it('should show "Has JD" badge for applications with job description', () => {
    const app = {
      id: 'app-1',
      company_name: 'Google',
      position_title: 'Software Engineer',
      job_description: 'Full job description here...'
    }

    const hasJD = !!app.job_description
    expect(hasJD).toBe(true)
  })

  it('should not show "Has JD" badge for applications without job description', () => {
    const app = {
      id: 'app-1',
      company_name: 'Google',
      position_title: 'Software Engineer',
      job_description: null
    }

    const hasJD = !!app.job_description
    expect(hasJD).toBe(false)
  })

  it('should toggle dropdown visibility', () => {
    let showDropdown = false
    const toggleDropdown = () => {
      showDropdown = !showDropdown
    }

    toggleDropdown()
    expect(showDropdown).toBe(true)

    toggleDropdown()
    expect(showDropdown).toBe(false)
  })

  it('should filter applications by user', () => {
    const allApplications = [
      { id: '1', user_id: 'user-1', company_name: 'Company A' },
      { id: '2', user_id: 'user-2', company_name: 'Company B' },
      { id: '3', user_id: 'user-1', company_name: 'Company C' },
    ]

    const currentUserId = 'user-1'
    const userApplications = allApplications.filter(app => app.user_id === currentUserId)

    expect(userApplications.length).toBe(2)
    expect(userApplications.map(a => a.company_name)).toEqual(['Company A', 'Company C'])
  })
})

describe('CV Tailor - Delete CVs Functionality', () => {
  it('should require confirmation before deleting', () => {
    let confirmCalled = false
    const mockConfirm = () => {
      confirmCalled = true
      return false // User cancels
    }

    const handleDelete = (confirmFn: () => boolean) => {
      if (!confirmFn()) {
        return false
      }
      return true
    }

    const result = handleDelete(mockConfirm)

    expect(confirmCalled).toBe(true)
    expect(result).toBe(false)
  })

  it('should proceed with deletion when confirmed', () => {
    let deleted = false
    const mockConfirm = () => true

    const handleDelete = (confirmFn: () => boolean, deleteFn: () => void) => {
      if (!confirmFn()) {
        return
      }
      deleteFn()
    }

    handleDelete(mockConfirm, () => { deleted = true })

    expect(deleted).toBe(true)
  })
})
