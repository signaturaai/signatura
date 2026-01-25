/**
 * Indicators API - GET all indicators
 *
 * Returns the complete 10-Indicator Framework with sub-indicators.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INDICATOR_NAMES, INDICATOR_SHORT_NAMES } from '@/lib/indicators'

export async function GET() {
  try {
    const supabase = await createClient()

    // Try to fetch from database
    const { data: indicators, error } = await supabase
      .from('indicators')
      .select(`
        *,
        sub_indicators (*)
      `)
      .order('number', { ascending: true }) as { data: any; error: any }

    if (error) {
      console.error('Database error:', error)
      // Fall back to static data
      return NextResponse.json({
        indicators: getStaticIndicators(),
        source: 'static',
      })
    }

    if (!indicators || indicators.length === 0) {
      // No data in database, return static
      return NextResponse.json({
        indicators: getStaticIndicators(),
        source: 'static',
      })
    }

    return NextResponse.json({
      indicators,
      source: 'database',
    })
  } catch (error) {
    console.error('Indicators GET error:', error)
    // Fall back to static data on any error
    return NextResponse.json({
      indicators: getStaticIndicators(),
      source: 'static',
    })
  }
}

/**
 * Static indicator data for fallback
 */
function getStaticIndicators() {
  return [
    {
      number: 1,
      name: INDICATOR_NAMES[1],
      shortName: INDICATOR_SHORT_NAMES[1],
      category: 'Cognitive',
      description: 'Depth of expertise in relevant domain, professional competencies, and tool proficiency.',
      subIndicators: ['Domain Expertise', 'Professional Proficiency', 'Tool/System Mastery', 'Industry Knowledge'],
    },
    {
      number: 2,
      name: INDICATOR_NAMES[2],
      shortName: INDICATOR_SHORT_NAMES[2],
      category: 'Cognitive',
      description: 'Ability to analyze complex situations, identify root causes, and develop effective solutions.',
      subIndicators: ['Analytical Reasoning', 'Creative Solutions', 'Decision Quality', 'Root Cause Analysis'],
    },
    {
      number: 3,
      name: INDICATOR_NAMES[3],
      shortName: INDICATOR_SHORT_NAMES[3],
      category: 'Interpersonal',
      description: 'Clarity and effectiveness in verbal and written communication across audiences.',
      subIndicators: ['Verbal Clarity', 'Written Communication', 'Active Listening', 'Presentation Skills'],
    },
    {
      number: 4,
      name: INDICATOR_NAMES[4],
      shortName: INDICATOR_SHORT_NAMES[4],
      category: 'Interpersonal',
      description: 'Effectiveness in building relationships, collaborating, and navigating social dynamics.',
      subIndicators: ['Team Collaboration', 'Conflict Resolution', 'Empathy', 'Relationship Building'],
    },
    {
      number: 5,
      name: INDICATOR_NAMES[5],
      shortName: INDICATOR_SHORT_NAMES[5],
      category: 'Character',
      description: 'Adherence to ethical principles, honesty, and accountability in professional conduct.',
      subIndicators: ['Honesty', 'Accountability', 'Ethical Decision-Making', 'Transparency'],
    },
    {
      number: 6,
      name: INDICATOR_NAMES[6],
      shortName: INDICATOR_SHORT_NAMES[6],
      category: 'Character',
      description: 'Ability to adjust to change, handle uncertainty, and remain effective under pressure.',
      subIndicators: ['Change Management', 'Resilience', 'Open-Mindedness', 'Stress Tolerance'],
    },
    {
      number: 7,
      name: INDICATOR_NAMES[7],
      shortName: INDICATOR_SHORT_NAMES[7],
      category: 'Cognitive',
      description: 'Speed of learning new skills and openness to feedback and continuous development.',
      subIndicators: ['Knowledge Acquisition', 'Skill Development', 'Self-Awareness', 'Feedback Receptiveness'],
    },
    {
      number: 8,
      name: INDICATOR_NAMES[8],
      shortName: INDICATOR_SHORT_NAMES[8],
      category: 'Interpersonal',
      description: 'Ability to inspire, guide, take ownership, and drive outcomes.',
      subIndicators: ['Vision Setting', 'Team Motivation', 'Ownership', 'Strategic Thinking'],
    },
    {
      number: 9,
      name: INDICATOR_NAMES[9],
      shortName: INDICATOR_SHORT_NAMES[9],
      category: 'Cognitive',
      description: 'Capacity for original thinking, generating novel ideas, and challenging assumptions.',
      subIndicators: ['Original Thinking', 'Idea Generation', 'Risk-Taking', 'Experimentation'],
    },
    {
      number: 10,
      name: INDICATOR_NAMES[10],
      shortName: INDICATOR_SHORT_NAMES[10],
      category: 'Character',
      description: 'Internal motivation, persistence, and commitment to achieving goals.',
      subIndicators: ['Goal Orientation', 'Persistence', 'Ambition', 'Work Ethic'],
    },
  ]
}
