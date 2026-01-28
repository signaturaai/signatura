/**
 * Contract Reviewer Types
 *
 * Module 5 (Final MVP): Types for contract analysis and review.
 * Defines interfaces for file input, clause analysis, and risk assessment.
 */

// ==========================================
// Enums and Literal Types
// ==========================================

/**
 * Supported file types for contract upload
 */
export type ContractFileType = 'pdf' | 'docx' | 'png' | 'jpg' | 'jpeg'

/**
 * Risk level assessment for the overall contract
 */
export type RiskLevel = 'Low' | 'Medium' | 'High'

/**
 * Clause status indicating severity (traffic light system)
 */
export type ClauseStatus = 'Green' | 'Yellow' | 'Red Flag'

/**
 * Common clause types found in employment contracts
 */
export type ClauseType =
  | 'Compensation'
  | 'Benefits'
  | 'Non-Compete'
  | 'Non-Solicitation'
  | 'IP Assignment'
  | 'Intellectual Property'
  | 'Confidentiality'
  | 'Termination'
  | 'Notice Period'
  | 'Severance'
  | 'Equity'
  | 'Stock Options'
  | 'Bonus'
  | 'PTO'
  | 'Remote Work'
  | 'Relocation'
  | 'Arbitration'
  | 'Governing Law'
  | 'Non-Disclosure'
  | 'Garden Leave'
  | 'Clawback'
  | 'Other'

// ==========================================
// Core Interfaces
// ==========================================

/**
 * Individual clause analysis result
 */
export interface ClauseAnalysis {
  /** Type of clause identified */
  type: ClauseType | string
  /** Original legal text from the contract */
  original_text: string
  /** Plain English translation */
  plain_english: string
  /** Risk/status indicator */
  status: ClauseStatus
  /** Optional: specific concerns about this clause */
  concerns?: string[]
  /** Optional: industry standard comparison */
  industry_standard?: string
}

/**
 * Complete contract analysis result
 */
export interface ContractAnalysisResult {
  /** Fairness score from 1-10 */
  fairness_score: number
  /** Overall risk level */
  risk_level: RiskLevel
  /** Executive summary of the contract */
  summary: string
  /** Analyzed clauses */
  clauses: ClauseAnalysis[]
  /** Negotiation tips and recommendations */
  negotiation_tips: string[]
}

/**
 * Request payload for contract analysis
 */
export interface AnalyzeContractRequest {
  /** URL to the uploaded file in Supabase Storage */
  fileUrl: string
  /** User's target role for context */
  userRole?: string
  /** Optional: Job application ID to link analysis */
  jobApplicationId?: string
}

/**
 * Response from contract analysis API
 */
export interface AnalyzeContractResponse {
  success: boolean
  analysis?: ContractAnalysisResult
  error?: string
  details?: string
}

// ==========================================
// Entity for Persistence
// ==========================================

/**
 * ContractAnalysis entity stored in database
 */
export interface ContractAnalysisEntity {
  /** Unique identifier */
  id: string
  /** User who owns this analysis */
  user_id: string
  /** Optional linked job application */
  job_application_id?: string
  /** Original file URL */
  file_url: string
  /** Original filename */
  file_name: string
  /** File type */
  file_type: ContractFileType
  /** Extracted text from the document */
  extracted_text?: string
  /** The analysis result */
  analysis: ContractAnalysisResult
  /** Number of red flags found */
  red_flag_count: number
  /** Number of yellow flags found */
  yellow_flag_count: number
  /** Number of green clauses found */
  green_clause_count: number
  /** Whether user has reviewed the analysis */
  user_reviewed: boolean
  /** User notes/annotations */
  user_notes?: string
  /** Creation timestamp */
  created_at: string
  /** Last updated timestamp */
  updated_at: string
}

// ==========================================
// UI State Types
// ==========================================

/**
 * Upload state for the contract uploader component
 */
export type UploadState = 'idle' | 'uploading' | 'processing' | 'complete' | 'error'

/**
 * Selected clause for detailed view
 */
export interface SelectedClause extends ClauseAnalysis {
  index: number
}

// ==========================================
// Utility Types
// ==========================================

/**
 * File validation result
 */
export interface FileValidation {
  valid: boolean
  error?: string
  fileType?: ContractFileType
  fileSize?: number
}

/**
 * Supported MIME types mapping
 */
export const SUPPORTED_MIME_TYPES: Record<string, ContractFileType> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
}

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate uploaded file
 */
export function validateContractFile(file: File): FileValidation {
  const mimeType = file.type
  const fileType = SUPPORTED_MIME_TYPES[mimeType]

  if (!fileType) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF, DOCX, PNG, or JPG file.',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    }
  }

  return {
    valid: true,
    fileType,
    fileSize: file.size,
  }
}

/**
 * Get status color for clause
 */
export function getClauseStatusColor(status: ClauseStatus): string {
  switch (status) {
    case 'Green':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'Yellow':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'Red Flag':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'Low':
      return 'text-green-600 bg-green-100'
    case 'Medium':
      return 'text-yellow-600 bg-yellow-100'
    case 'High':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

/**
 * Get fairness score color based on value
 */
export function getFairnessScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600'
  if (score >= 5) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Get fairness score label
 */
export function getFairnessScoreLabel(score: number): string {
  if (score >= 9) return 'Excellent'
  if (score >= 7) return 'Fair'
  if (score >= 5) return 'Caution'
  if (score >= 3) return 'Concerning'
  return 'High Risk'
}
