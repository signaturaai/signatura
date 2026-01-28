/**
 * Contract Reviewer - Analysis Logic
 *
 * Module 5 (Final MVP): Backend logic for contract analysis.
 * Extracts text from contracts and performs AI-powered legal analysis.
 */

import { randomUUID } from 'crypto'
import OpenAI from 'openai'
import { PDFParse } from 'pdf-parse'
import type {
  ContractAnalysisResult,
  ContractAnalysisEntity,
  ContractFileType,
  ClauseStatus,
} from '@/types/contract'

// ==========================================
// Text Extraction
// ==========================================

/**
 * Fetch file from Supabase Storage URL
 */
async function fetchFileFromUrl(fileUrl: string): Promise<Buffer> {
  const response = await fetch(fileUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  return result.text
}

/**
 * Extract text from image using OpenAI Vision API (OCR)
 */
async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const openai = new OpenAI()
  const base64Image = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64Image}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all text from this employment contract image. Preserve the structure and formatting as much as possible. Return only the extracted text, no commentary.',
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  })

  return response.choices[0].message.content || ''
}

/**
 * Extract text from DOCX by sending to OpenAI for processing
 * Note: For MVP, we convert DOCX to base64 and let OpenAI parse it
 */
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const openai = new OpenAI()
  const base64Doc = buffer.toString('base64')

  // OpenAI can process DOCX files when provided as file content
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a document text extractor. Extract all text content from the provided document data, preserving structure.',
      },
      {
        role: 'user',
        content: `Extract all text from this DOCX document (base64 encoded). The document is an employment contract. Return only the extracted text content:\n\n${base64Doc.substring(0, 50000)}`,
      },
    ],
    max_tokens: 4096,
  })

  return response.choices[0].message.content || ''
}

/**
 * Determine MIME type from file type
 */
function getMimeType(fileType: ContractFileType): string {
  const mimeTypes: Record<ContractFileType, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  }
  return mimeTypes[fileType]
}

/**
 * Extract text from contract file based on type
 */
export async function extractContractText(
  fileUrl: string,
  fileType: ContractFileType
): Promise<string> {
  const buffer = await fetchFileFromUrl(fileUrl)

  switch (fileType) {
    case 'pdf':
      return extractTextFromPdf(buffer)
    case 'docx':
      return extractTextFromDocx(buffer)
    case 'png':
    case 'jpg':
    case 'jpeg':
      return extractTextFromImage(buffer, getMimeType(fileType))
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

// ==========================================
// AI Contract Analysis
// ==========================================

const CONTRACT_ANALYSIS_SYSTEM_PROMPT = `You are an expert Legal AI for Employment Contracts.
Analyze the attached contract text.

Your role is to:
1. Identify and analyze each significant clause in the contract
2. Translate complex legal language into plain English
3. Assess risk levels and flag concerning terms
4. Provide actionable negotiation tips

Guidelines:
- Be thorough but concise in your plain English translations
- Flag truly concerning clauses as "Red Flag", moderately concerning as "Yellow", and standard/favorable as "Green"
- Consider industry standards when assessing fairness
- Provide specific, actionable negotiation tips
- Focus on clauses that materially affect the employee's rights, compensation, and obligations

OUTPUT JSON format:
{
  "fairness_score": 8,
  "risk_level": "Medium",
  "summary": "A standard contract, but watch out for the non-compete clause.",
  "clauses": [
    {
      "type": "Non-Compete",
      "original_text": "Employee shall not work for competitors for 24 months...",
      "plain_english": "You cannot work for any competitor for 2 years. This is very restrictive.",
      "status": "Red Flag"
    },
    {
      "type": "IP Assignment",
      "original_text": "Company owns all inventions created...",
      "plain_english": "Everything you create belongs to them.",
      "status": "Yellow"
    }
  ],
  "negotiation_tips": ["Ask to reduce non-compete to 6 months", "Exclude personal projects from IP"]
}

IMPORTANT:
- fairness_score must be a number from 1-10 (1 = very unfair, 10 = very fair)
- risk_level must be exactly "Low", "Medium", or "High"
- status must be exactly "Green", "Yellow", or "Red Flag"
- Return ONLY the JSON object, no additional text`

/**
 * Analyze contract text using OpenAI
 */
export async function analyzeContractWithAI(
  contractText: string,
  userRole?: string
): Promise<ContractAnalysisResult> {
  const openai = new OpenAI()

  const userPrompt = `Analyze this employment contract:

${userRole ? `Context: The user is applying for a ${userRole} position.\n\n` : ''}
CONTRACT TEXT:
${contractText}

Provide a comprehensive analysis following the specified JSON format.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.1,
    messages: [
      { role: 'system', content: CONTRACT_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No response from AI')
  }

  const result = JSON.parse(content) as ContractAnalysisResult

  // Validate and sanitize the response
  return validateAnalysisResult(result)
}

/**
 * Validate and sanitize AI analysis result
 */
function validateAnalysisResult(result: ContractAnalysisResult): ContractAnalysisResult {
  // Ensure fairness_score is in valid range
  const fairness_score = Math.max(1, Math.min(10, Math.round(result.fairness_score || 5)))

  // Ensure risk_level is valid
  const validRiskLevels = ['Low', 'Medium', 'High']
  const risk_level = validRiskLevels.includes(result.risk_level)
    ? result.risk_level
    : 'Medium'

  // Ensure clauses have valid status
  const validStatuses: ClauseStatus[] = ['Green', 'Yellow', 'Red Flag']
  const clauses = (result.clauses || []).map((clause) => ({
    ...clause,
    status: validStatuses.includes(clause.status as ClauseStatus)
      ? clause.status
      : 'Yellow' as ClauseStatus,
  }))

  return {
    fairness_score,
    risk_level: risk_level as ContractAnalysisResult['risk_level'],
    summary: result.summary || 'Analysis complete.',
    clauses,
    negotiation_tips: result.negotiation_tips || [],
  }
}

// ==========================================
// Main Analysis Function
// ==========================================

/**
 * Analyze a contract and create entity for persistence
 */
export async function analyzeContract(
  userId: string,
  fileUrl: string,
  fileName: string,
  fileType: ContractFileType,
  userRole?: string,
  jobApplicationId?: string
): Promise<ContractAnalysisEntity> {
  // 1. Extract text from the contract
  const extractedText = await extractContractText(fileUrl, fileType)

  if (!extractedText || extractedText.trim().length < 100) {
    throw new Error('Could not extract sufficient text from the document. Please ensure the file is readable.')
  }

  // 2. Analyze the contract with AI
  const analysis = await analyzeContractWithAI(extractedText, userRole)

  // 3. Count flags
  const red_flag_count = analysis.clauses.filter((c) => c.status === 'Red Flag').length
  const yellow_flag_count = analysis.clauses.filter((c) => c.status === 'Yellow').length
  const green_clause_count = analysis.clauses.filter((c) => c.status === 'Green').length

  // 4. Create entity
  const now = new Date().toISOString()
  const entity: ContractAnalysisEntity = {
    id: randomUUID(),
    user_id: userId,
    job_application_id: jobApplicationId,
    file_url: fileUrl,
    file_name: fileName,
    file_type: fileType,
    extracted_text: extractedText.substring(0, 50000), // Limit stored text
    analysis,
    red_flag_count,
    yellow_flag_count,
    green_clause_count,
    user_reviewed: false,
    created_at: now,
    updated_at: now,
  }

  return entity
}

// ==========================================
// Mock Data for UI Testing
// ==========================================

/**
 * Generate mock contract analysis for UI development
 */
export function getMockContractAnalysis(options?: {
  fairnessScore?: number
  riskLevel?: 'Low' | 'Medium' | 'High'
}): ContractAnalysisResult {
  const fairness_score = options?.fairnessScore ?? 6
  const risk_level = options?.riskLevel ?? 'Medium'

  return {
    fairness_score,
    risk_level,
    summary: 'This is a standard employment contract with some areas that warrant attention. The compensation and benefits sections are fair, but the non-compete and IP assignment clauses are more restrictive than industry standard.',
    clauses: [
      {
        type: 'Compensation',
        original_text: 'Employee shall receive a base salary of $150,000 per annum, payable in bi-weekly installments in accordance with the Company\'s standard payroll practices.',
        plain_english: 'You\'ll be paid $150,000 per year, with paychecks every two weeks. This is standard.',
        status: 'Green',
      },
      {
        type: 'Non-Compete',
        original_text: 'For a period of twenty-four (24) months following the termination of employment, Employee agrees not to engage in any business or activity that competes with the Company within any geographic region where the Company conducts business.',
        plain_english: 'You cannot work for any competitor for 2 years after leaving, anywhere the company does business. This is very restrictive and could significantly limit your career options.',
        status: 'Red Flag',
        concerns: ['Duration is longer than industry standard', 'Geographic scope is overly broad'],
        industry_standard: 'Typical non-competes are 6-12 months with specific geographic limits',
      },
      {
        type: 'IP Assignment',
        original_text: 'Employee hereby assigns to the Company all right, title, and interest in and to any and all inventions, discoveries, developments, and improvements conceived or made by Employee, alone or jointly with others, during the term of employment.',
        plain_english: 'Everything you create or invent while employed belongs to the company, even if you worked on it in your own time.',
        status: 'Yellow',
        concerns: ['Does not carve out personal projects', 'May affect side projects'],
        industry_standard: 'Many contracts exclude inventions unrelated to company business',
      },
      {
        type: 'Confidentiality',
        original_text: 'Employee agrees to hold in strict confidence and not to disclose any Confidential Information to any third party without the prior written consent of the Company.',
        plain_english: 'You must keep company secrets confidential. This is completely standard and reasonable.',
        status: 'Green',
      },
      {
        type: 'Termination',
        original_text: 'Either party may terminate this Agreement at any time, with or without cause, upon thirty (30) days written notice to the other party.',
        plain_english: 'Either you or the company can end the employment with 30 days notice. This is at-will employment.',
        status: 'Green',
      },
      {
        type: 'Arbitration',
        original_text: 'Any dispute arising out of or relating to this Agreement shall be resolved exclusively by binding arbitration in accordance with the rules of the American Arbitration Association.',
        plain_english: 'If there\'s a dispute, you can\'t sue in court - you must go to private arbitration instead. This limits your legal options.',
        status: 'Yellow',
        concerns: ['Waives right to jury trial', 'May limit recovery of damages'],
      },
      {
        type: 'Equity',
        original_text: 'Subject to approval by the Board of Directors, Employee shall be granted stock options to purchase 10,000 shares of Common Stock at an exercise price equal to the fair market value on the date of grant, vesting over four years with a one-year cliff.',
        plain_english: 'You\'ll get stock options for 10,000 shares that vest over 4 years. After 1 year, you\'ll own 25% of them, then they continue vesting monthly.',
        status: 'Green',
      },
    ],
    negotiation_tips: [
      'Request reducing the non-compete period from 24 months to 12 months',
      'Ask to limit the non-compete geographic scope to specific regions',
      'Negotiate an IP assignment carve-out for personal projects unrelated to company business',
      'Consider requesting a mutual arbitration clause or opt-out period',
      'Ask about severance terms in case of termination without cause',
    ],
  }
}

/**
 * Generate mock entity for testing
 */
export function getMockContractAnalysisEntity(
  userId: string,
  options?: {
    fairnessScore?: number
    riskLevel?: 'Low' | 'Medium' | 'High'
  }
): ContractAnalysisEntity {
  const analysis = getMockContractAnalysis(options)
  const now = new Date().toISOString()

  return {
    id: randomUUID(),
    user_id: userId,
    file_url: 'https://example.com/contracts/sample.pdf',
    file_name: 'employment_contract.pdf',
    file_type: 'pdf',
    extracted_text: 'Sample extracted text...',
    analysis,
    red_flag_count: analysis.clauses.filter((c) => c.status === 'Red Flag').length,
    yellow_flag_count: analysis.clauses.filter((c) => c.status === 'Yellow').length,
    green_clause_count: analysis.clauses.filter((c) => c.status === 'Green').length,
    user_reviewed: false,
    created_at: now,
    updated_at: now,
  }
}
