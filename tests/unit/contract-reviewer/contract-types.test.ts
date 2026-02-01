/**
 * Contract Reviewer Types & Utilities - Automated Tests
 *
 * Tests for contract type system, file validation,
 * status colors, risk level colors, and fairness scoring.
 *
 * RALPH: Reliability, Accuracy, Logic, Performance, Hardening
 */

import { describe, it, expect } from 'vitest'
import {
  validateContractFile,
  getClauseStatusColor,
  getRiskLevelColor,
  getFairnessScoreColor,
  getFairnessScoreLabel,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/types/contract'
import type {
  ContractFileType,
  RiskLevel,
  ClauseStatus,
  ClauseAnalysis,
  ContractAnalysisResult,
} from '@/types/contract'

// ============================================================================
// SECTION 1: SUPPORTED_MIME_TYPES Constants
// ============================================================================

describe('SUPPORTED_MIME_TYPES', () => {
  it('should support 4 MIME types', () => {
    expect(Object.keys(SUPPORTED_MIME_TYPES)).toHaveLength(4)
  })

  it('should map PDF MIME type to pdf', () => {
    expect(SUPPORTED_MIME_TYPES['application/pdf']).toBe('pdf')
  })

  it('should map DOCX MIME type to docx', () => {
    expect(SUPPORTED_MIME_TYPES['application/vnd.openxmlformats-officedocument.wordprocessingml.document']).toBe('docx')
  })

  it('should map PNG MIME type to png', () => {
    expect(SUPPORTED_MIME_TYPES['image/png']).toBe('png')
  })

  it('should map JPEG MIME type to jpg', () => {
    expect(SUPPORTED_MIME_TYPES['image/jpeg']).toBe('jpg')
  })

  it('should not support unsupported MIME types', () => {
    expect(SUPPORTED_MIME_TYPES['text/plain']).toBeUndefined()
    expect(SUPPORTED_MIME_TYPES['application/zip']).toBeUndefined()
    expect(SUPPORTED_MIME_TYPES['video/mp4']).toBeUndefined()
  })
})

// ============================================================================
// SECTION 2: MAX_FILE_SIZE Constant
// ============================================================================

describe('MAX_FILE_SIZE', () => {
  it('should be 10MB', () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
  })

  it('should equal 10485760 bytes', () => {
    expect(MAX_FILE_SIZE).toBe(10485760)
  })
})

// ============================================================================
// SECTION 3: validateContractFile
// ============================================================================

describe('validateContractFile', () => {
  function createMockFile(name: string, type: string, size: number): File {
    const content = new ArrayBuffer(size)
    return new File([content], name, { type })
  }

  it('should validate a PDF file', () => {
    const file = createMockFile('contract.pdf', 'application/pdf', 1024)
    const result = validateContractFile(file)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('pdf')
  })

  it('should validate a DOCX file', () => {
    const file = createMockFile(
      'contract.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      2048
    )
    const result = validateContractFile(file)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('docx')
  })

  it('should validate a PNG file', () => {
    const file = createMockFile('contract.png', 'image/png', 512)
    const result = validateContractFile(file)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('png')
  })

  it('should validate a JPEG file', () => {
    const file = createMockFile('contract.jpg', 'image/jpeg', 512)
    const result = validateContractFile(file)
    expect(result.valid).toBe(true)
    expect(result.fileType).toBe('jpg')
  })

  it('should reject unsupported file types', () => {
    const file = createMockFile('readme.txt', 'text/plain', 100)
    const result = validateContractFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported file type')
  })

  it('should reject ZIP files', () => {
    const file = createMockFile('archive.zip', 'application/zip', 1024)
    const result = validateContractFile(file)
    expect(result.valid).toBe(false)
  })

  it('should reject files exceeding MAX_FILE_SIZE', () => {
    const file = createMockFile('huge.pdf', 'application/pdf', MAX_FILE_SIZE + 1)
    const result = validateContractFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('too large')
  })

  it('should accept files exactly at MAX_FILE_SIZE', () => {
    const file = createMockFile('exact.pdf', 'application/pdf', MAX_FILE_SIZE)
    const result = validateContractFile(file)
    expect(result.valid).toBe(true)
  })

  it('should return fileSize for valid files', () => {
    const file = createMockFile('contract.pdf', 'application/pdf', 5000)
    const result = validateContractFile(file)
    expect(result.fileSize).toBe(5000)
  })

  it('should not return fileType for invalid files', () => {
    const file = createMockFile('readme.txt', 'text/plain', 100)
    const result = validateContractFile(file)
    expect(result.fileType).toBeUndefined()
  })
})

// ============================================================================
// SECTION 4: getClauseStatusColor
// ============================================================================

describe('getClauseStatusColor', () => {
  it('Green should return green-themed classes', () => {
    const color = getClauseStatusColor('Green')
    expect(color).toContain('green')
  })

  it('Yellow should return yellow-themed classes', () => {
    const color = getClauseStatusColor('Yellow')
    expect(color).toContain('yellow')
  })

  it('Red Flag should return red-themed classes', () => {
    const color = getClauseStatusColor('Red Flag')
    expect(color).toContain('red')
  })

  it('unknown status should return gray fallback', () => {
    const color = getClauseStatusColor('Unknown' as ClauseStatus)
    expect(color).toContain('gray')
  })

  it('each status should return bg and border classes', () => {
    const statuses: ClauseStatus[] = ['Green', 'Yellow', 'Red Flag']
    statuses.forEach(status => {
      const color = getClauseStatusColor(status)
      expect(color).toContain('bg-')
      expect(color).toContain('border-')
      expect(color).toContain('text-')
    })
  })
})

// ============================================================================
// SECTION 5: getRiskLevelColor
// ============================================================================

describe('getRiskLevelColor', () => {
  it('Low should return green', () => {
    expect(getRiskLevelColor('Low')).toContain('green')
  })

  it('Medium should return yellow', () => {
    expect(getRiskLevelColor('Medium')).toContain('yellow')
  })

  it('High should return red', () => {
    expect(getRiskLevelColor('High')).toContain('red')
  })

  it('unknown should return gray fallback', () => {
    expect(getRiskLevelColor('Unknown' as RiskLevel)).toContain('gray')
  })
})

// ============================================================================
// SECTION 6: getFairnessScoreColor
// ============================================================================

describe('getFairnessScoreColor', () => {
  it('score 10 should be green', () => {
    expect(getFairnessScoreColor(10)).toContain('green')
  })

  it('score 8 should be green', () => {
    expect(getFairnessScoreColor(8)).toContain('green')
  })

  it('score 7 should be yellow', () => {
    expect(getFairnessScoreColor(7)).toContain('yellow')
  })

  it('score 5 should be yellow', () => {
    expect(getFairnessScoreColor(5)).toContain('yellow')
  })

  it('score 4 should be red', () => {
    expect(getFairnessScoreColor(4)).toContain('red')
  })

  it('score 1 should be red', () => {
    expect(getFairnessScoreColor(1)).toContain('red')
  })

  it('score 0 should be red', () => {
    expect(getFairnessScoreColor(0)).toContain('red')
  })
})

// ============================================================================
// SECTION 7: getFairnessScoreLabel
// ============================================================================

describe('getFairnessScoreLabel', () => {
  it('score 10 should be Excellent', () => {
    expect(getFairnessScoreLabel(10)).toBe('Excellent')
  })

  it('score 9 should be Excellent', () => {
    expect(getFairnessScoreLabel(9)).toBe('Excellent')
  })

  it('score 8 should be Fair', () => {
    expect(getFairnessScoreLabel(8)).toBe('Fair')
  })

  it('score 7 should be Fair', () => {
    expect(getFairnessScoreLabel(7)).toBe('Fair')
  })

  it('score 6 should be Caution', () => {
    expect(getFairnessScoreLabel(6)).toBe('Caution')
  })

  it('score 5 should be Caution', () => {
    expect(getFairnessScoreLabel(5)).toBe('Caution')
  })

  it('score 4 should be Concerning', () => {
    expect(getFairnessScoreLabel(4)).toBe('Concerning')
  })

  it('score 3 should be Concerning', () => {
    expect(getFairnessScoreLabel(3)).toBe('Concerning')
  })

  it('score 2 should be High Risk', () => {
    expect(getFairnessScoreLabel(2)).toBe('High Risk')
  })

  it('score 1 should be High Risk', () => {
    expect(getFairnessScoreLabel(1)).toBe('High Risk')
  })

  it('score 0 should be High Risk', () => {
    expect(getFairnessScoreLabel(0)).toBe('High Risk')
  })
})
