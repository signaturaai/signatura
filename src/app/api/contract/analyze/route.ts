/**
 * Contract Analysis API
 *
 * POST /api/contract/analyze
 * Analyzes an uploaded employment contract and returns risk assessment with clause breakdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { analyzeContract } from '@/lib/contract'
import { checkUsageLimit, incrementUsage } from '@/lib/subscription/access-control'
import type {
  AnalyzeContractRequest,
  AnalyzeContractResponse,
  ContractFileType,
  SUPPORTED_MIME_TYPES,
} from '@/types/contract'

/**
 * Determine file type from URL or filename
 */
function getFileTypeFromUrl(url: string, fileName?: string): ContractFileType | null {
  const filename = fileName || url.split('/').pop() || ''
  const extension = filename.split('.').pop()?.toLowerCase()

  const extensionMap: Record<string, ContractFileType> = {
    pdf: 'pdf',
    docx: 'docx',
    png: 'png',
    jpg: 'jpg',
    jpeg: 'jpeg',
  }

  return extensionMap[extension || ''] || null
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeContractResponse>> {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // SPLIT PATTERN: Check usage limit first
    const serviceSupabase = createServiceClient()
    const limitCheck = await checkUsageLimit(serviceSupabase, user.id, 'contracts')
    if (!limitCheck.allowed) {
      if (limitCheck.reason === 'NO_SUBSCRIPTION') {
        return NextResponse.json({ success: false, error: 'Subscription required', ...limitCheck }, { status: 402 })
      }
      return NextResponse.json({ success: false, error: 'Usage limit reached', ...limitCheck }, { status: 403 })
    }

    // Parse request body
    const body: AnalyzeContractRequest & { fileName?: string } = await request.json()

    // Validate required fields
    if (!body.fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field',
          details: 'fileUrl is required',
        },
        { status: 400 }
      )
    }

    // Determine file type
    const fileType = getFileTypeFromUrl(body.fileUrl, body.fileName)
    if (!fileType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported file type',
          details: 'Please upload a PDF, DOCX, PNG, or JPG file',
        },
        { status: 400 }
      )
    }

    // Analyze the contract
    const entity = await analyzeContract(
      user.id,
      body.fileUrl,
      body.fileName || 'contract.' + fileType,
      fileType,
      body.userRole,
      body.jobApplicationId
    )

    // Store the analysis in the database
    const { error: insertError } = await supabase
      .from('contract_analyses')
      .insert({
        id: entity.id,
        user_id: entity.user_id,
        job_application_id: entity.job_application_id,
        file_url: entity.file_url,
        file_name: entity.file_name,
        file_type: entity.file_type,
        extracted_text: entity.extracted_text,
        analysis: entity.analysis,
        red_flag_count: entity.red_flag_count,
        yellow_flag_count: entity.yellow_flag_count,
        green_clause_count: entity.green_clause_count,
        user_reviewed: entity.user_reviewed,
        created_at: entity.created_at,
        updated_at: entity.updated_at,
      })

    if (insertError) {
      console.error('Error storing contract analysis:', insertError)
      // Don't fail the request, just log the error - return the analysis anyway
    }

    // If linked to a job application, update the application
    if (body.jobApplicationId) {
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({
          contract_analysis: JSON.stringify(entity.analysis),
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', body.jobApplicationId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating job application:', updateError)
      }
    }

    // SPLIT PATTERN: Increment usage after successful creation
    await incrementUsage(serviceSupabase, user.id, 'contracts')

    return NextResponse.json({
      success: true,
      analysis: entity.analysis,
    })
  } catch (error) {
    console.error('Error analyzing contract:', error)

    // Check for specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON',
          details: 'Request body is not valid JSON',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze contract',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/contract/analyze
 * Retrieve stored contract analyses for the user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('id')
    const jobApplicationId = searchParams.get('jobApplicationId')

    // If specific analysis ID requested
    if (analysisId) {
      const { data: analysis, error } = await supabase
        .from('contract_analyses')
        .select('*')
        .eq('id', analysisId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Analysis not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, analysis })
    }

    // If job application ID requested
    if (jobApplicationId) {
      const { data: analyses, error } = await supabase
        .from('contract_analyses')
        .select('*')
        .eq('job_application_id', jobApplicationId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch analyses' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true, analyses })
    }

    // Return all user's analyses
    const { data: analyses, error } = await supabase
      .from('contract_analyses')
      .select('id, file_name, file_type, red_flag_count, yellow_flag_count, green_clause_count, created_at, analysis')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch analyses' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, analyses })
  } catch (error) {
    console.error('Error fetching contract analyses:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analyses',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
