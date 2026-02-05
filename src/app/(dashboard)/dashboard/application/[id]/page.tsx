/**
 * Application Workspace Page — The "Project View" for a specific job application
 *
 * Route: /dashboard/application/[id]
 *
 * Features:
 * - Header with job title, company, status, match score
 * - Tabs: Overview, CV Studio, Interview Lab, Strategy
 * - Premium Glassmorphism UI matching the dashboard
 */
import { ApplicationWorkspace } from '@/components/workspace'
import { mockJobApplications } from '@/lib/data/mockData'
import type { InterviewSession } from '@/components/dashboard/InterviewHistory'

export const metadata = {
  title: 'Application Workspace | Signatura',
  description: 'Manage your job application with tailored CV, interview prep, and strategy',
}

// Demo narrative gaps
const demoNarrativeGaps = [
  {
    dimension: 'Action Verbs',
    current: 72,
    target: 85,
    gap: 13,
    status: 'partial' as const,
    suggestion: 'Replace passive verbs with stronger action words like "spearheaded", "orchestrated", "transformed"',
  },
  {
    dimension: 'Achievements',
    current: 65,
    target: 80,
    gap: 15,
    status: 'partial' as const,
    suggestion: 'Add 2-3 more quantified achievements from your recent roles',
  },
  {
    dimension: 'Quantified Results',
    current: 45,
    target: 75,
    gap: 30,
    status: 'gap' as const,
    suggestion: 'Include specific metrics: revenue impact, team size, efficiency gains',
  },
  {
    dimension: 'Brand Language',
    current: 78,
    target: 80,
    gap: 2,
    status: 'aligned' as const,
    suggestion: 'Good alignment with company values. Consider adding their specific terminology.',
  },
]

// Demo Hunter Logic insights
const demoHunterInsights = [
  {
    category: 'strength' as const,
    title: 'Strategic Leadership Experience',
    description: 'Your track record of leading cross-functional teams aligns well with their need for a senior product leader.',
    priority: 'high' as const,
  },
  {
    category: 'strength' as const,
    title: 'Domain Expertise',
    description: 'Your experience in the fintech/SaaS space matches their product focus.',
    priority: 'medium' as const,
  },
  {
    category: 'weakness' as const,
    title: 'Enterprise Sales Cycle',
    description: 'Limited mention of enterprise sales experience. Prepare examples of working with sales teams.',
    priority: 'high' as const,
  },
  {
    category: 'weakness' as const,
    title: 'Technical Depth',
    description: 'JD emphasizes technical product management. Be ready to discuss architecture decisions.',
    priority: 'medium' as const,
  },
  {
    category: 'opportunity' as const,
    title: 'AI/ML Initiative',
    description: 'Company recently announced AI roadmap. Your ML product experience is highly relevant.',
    priority: 'high' as const,
  },
  {
    category: 'opportunity' as const,
    title: 'International Expansion',
    description: 'They are expanding to APAC. Highlight any international experience.',
    priority: 'medium' as const,
  },
  {
    category: 'threat' as const,
    title: 'Competitive Candidates',
    description: 'Role likely attracts FAANG candidates. Differentiate with specific domain wins.',
    priority: 'high' as const,
  },
  {
    category: 'threat' as const,
    title: 'Recent Layoffs',
    description: 'Company had layoffs last quarter. Be prepared to discuss stability concerns.',
    priority: 'low' as const,
  },
]

// Demo interview sessions
const demoInterviewSessions: InterviewSession[] = [
  {
    id: 'is-001',
    company_name: 'Databricks',
    position_title: 'VP of Product, AI/ML',
    session_type: 'mock_interview',
    overall_score: 82,
    session_duration: 45,
    questions_asked: 12,
    confidence_before: 65,
    confidence_after: 78,
    strengths: ['Strong strategic thinking', 'Clear communication'],
    improvements: ['Add more specific metrics'],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    job_application_id: 'app-006', // Databricks application
  },
  {
    id: 'is-002',
    company_name: 'General',
    position_title: 'Product Leadership',
    session_type: 'behavioral_prep',
    overall_score: 75,
    session_duration: 30,
    questions_asked: 8,
    confidence_before: 60,
    confidence_after: 72,
    strengths: ['Good STAR format'],
    improvements: ['Be more concise'],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ApplicationWorkspacePage({ params }: PageProps) {
  const { id } = await params

  // In production, fetch from Supabase based on authenticated user
  // For demo, find in mock data or create a demo application
  const application = mockJobApplications.find(app => app.id === id) || {
    id,
    user_id: 'user-001',
    company_name: 'Demo Company',
    position_title: 'Director of Product',
    job_description: `We are looking for a Director of Product to lead our product strategy and execution.

Key Responsibilities:
- Define and drive the product vision and roadmap
- Lead a team of product managers
- Work closely with engineering, design, and business teams
- Make data-driven decisions to prioritize features
- Communicate product strategy to stakeholders

Requirements:
- 8+ years of product management experience
- 3+ years of leadership experience
- Strong analytical and communication skills
- Experience with B2B SaaS products
- Track record of launching successful products`,
    job_url: 'https://example.com/job',
    application_date: new Date().toISOString().split('T')[0],
    application_status: 'applied' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-001',
    location: 'San Francisco, CA',
    industry: 'Technology',
    notes: 'Referred by John from the engineering team. Company culture seems great based on Glassdoor reviews.',
  }

  // Filter interview sessions for this application
  const relevantSessions = demoInterviewSessions.filter(
    s => s.job_application_id === id || !s.job_application_id
  )

  // Demo match score
  const matchScore = {
    before: 62,
    after: 85,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-light/20 via-white to-peach-light/20 p-6 lg:p-8">
      <ApplicationWorkspace
        application={application}
        cvVersion={null}
        interviewSessions={relevantSessions}
        narrativeGaps={demoNarrativeGaps}
        hunterInsights={demoHunterInsights}
        matchScore={matchScore}
      />
    </div>
  )
}
