/**
 * Mock data for Compensation Negotiator UI testing
 *
 * This provides a realistic mock response to test the UI before
 * the backend API is fully integrated.
 */

import type { CompensationStrategy } from '@/types/compensation'

export const MOCK_COMPENSATION_STRATEGY: CompensationStrategy = {
  id: 'mock-strategy-001',
  userId: 'user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  offerDetails: {
    baseSalary: 165000,
    currency: 'USD',
    signOnBonus: 25000,
    annualBonus: 16500,
    bonusTarget: 10,
    location: 'San Francisco, CA',
    roleTitle: 'Senior Software Engineer',
    roleLevel: 'senior',
    companyName: 'TechCorp Inc.',
    companySize: 'large',
    industry: 'Technology',
    remotePolicy: 'hybrid',
    equity: {
      type: 'rsu',
      totalValue: 120000,
      numberOfShares: 1200,
      vestingPeriodYears: 4,
      vestingSchedule: '25% after 1 year, then monthly',
    },
  },

  userPriorities: {
    primaryFocus: 'cash',
    secondaryFocus: 'equity',
    mustHaves: ['Remote work flexibility', 'Learning budget'],
    niceToHaves: ['Sign-on bonus', 'Extra PTO'],
    dealBreakers: ['No equity', 'Full-time on-site only'],
    willingToWalkAway: true,
    currentSalary: 140000,
    targetSalary: 180000,
    timeline: '2 weeks',
  },

  marketBenchmark: {
    role: 'Senior Software Engineer',
    level: 'senior',
    location: 'San Francisco, CA',
    currency: 'USD',
    percentile25: 150000,
    percentile50: 180000,
    percentile75: 220000,
    percentile90: 260000,
    sampleSize: 342,
    dataSource: 'Signatura Market Intelligence (Simulated)',
    lastUpdated: '2026-01-28',
    marketTemperature: 'stable',
    temperatureReason: 'Fair negotiations expected. Focus on your unique value.',
    yoyChange: 2.1,
  },

  analysis: {
    marketPosition: 'below_market',
    marketPositionDescription:
      'This offer is below the median market rate. There is room for negotiation.',
    percentileEstimate: 38,
    totalCompensation: 211500, // 165000 + 16500 + (120000/4)
    annualizedEquity: 30000,
    marketTemperature: 'stable',
    temperatureAdvice: 'Fair negotiations expected. Focus on your unique value.',
    strengths: [
      'Base salary at market median',
      'Sign-on bonus of $25,000 included',
      'Equity package worth $120,000 over vesting period',
      'Remote work policy supports work-life balance',
    ],
    weaknesses: [
      'Total compensation below 50th percentile',
      'Bonus target (10%) is below industry standard (15-20%)',
    ],
    risks: [
      'Decision timeline: 2 weeks',
      'Market conditions are balanced - neither party has strong leverage',
    ],
    opportunities: [
      'Negotiate base salary increase to $180K (median)',
      'Push for higher bonus target (15%)',
      'Request additional equity or RSU refresh',
      'Negotiate remote work 3 days/week',
    ],
  },

  strategy: {
    recommendedApproach: 'collaborative',
    approachRationale:
      'Given the stable market conditions and your willingness to walk away, a collaborative approach will help maintain positive relationships while still pushing for meaningful improvements. Focus on demonstrating your value and how the adjustments align with market rates.',
    counterOfferTarget: 195000,
    counterOfferRange: {
      minimum: 175000,
      target: 195000,
      stretch: 210000,
    },
    walkAwayPoint: 165000,
    negotiationLevers: [
      {
        category: 'base',
        description: 'Increase base salary from $165K to $180K',
        priority: 'primary',
        suggestedAsk: '$180,000 base salary to match market median',
        likelihood: 'high',
      },
      {
        category: 'equity',
        description: 'Request additional RSU grant',
        priority: 'primary',
        suggestedAsk: 'Additional $40K in RSUs ($160K total over 4 years)',
        likelihood: 'medium',
      },
      {
        category: 'bonus',
        description: 'Increase bonus target to 15%',
        priority: 'secondary',
        suggestedAsk: '15% target bonus instead of 10%',
        likelihood: 'medium',
      },
      {
        category: 'signing',
        description: 'Increase sign-on bonus',
        priority: 'fallback',
        suggestedAsk: '$35K sign-on bonus (one-time $10K increase)',
        likelihood: 'high',
      },
      {
        category: 'benefits',
        description: 'Remote work flexibility',
        priority: 'secondary',
        suggestedAsk: '3 days remote, 2 days in office',
        likelihood: 'high',
      },
    ],
    timeline:
      'Day 1: Send counter-offer email. Day 3-5: Follow-up call if no response. Day 7-10: Final negotiation and decision.',
    confidenceLevel: 'high',
  },

  scripts: {
    emailDraft: `Subject: Excited About the Opportunity - Compensation Discussion

Hi [Recruiter Name],

Thank you so much for extending the offer for the Senior Software Engineer position at TechCorp Inc. I'm genuinely excited about the opportunity to contribute to the team and the impactful work you're doing.

After carefully reviewing the offer and considering my experience and market data for similar roles in San Francisco, I'd like to discuss a few adjustments:

**Base Salary:** I was hoping for a base salary of $180,000, which aligns with the median market rate for senior engineers in the Bay Area with my experience level.

**Equity:** Given my excitement about TechCorp's growth potential, I'd appreciate discussing an increase to the RSU grant to $160,000 over 4 years.

**Bonus:** Would it be possible to discuss a 15% target bonus, which is more aligned with industry standards?

I want to emphasize that I'm very enthusiastic about joining TechCorp, and I believe these adjustments would allow me to make a long-term commitment with full dedication. I'm confident we can find a package that works for both of us.

Would you have time for a call this week to discuss?

Best regards,
[Your Name]`,

    phoneScript: [
      "Thank the recruiter for their time and reiterate your excitement about the role",
      "Reference your specific value: 'Based on my experience with [specific technology/project], I believe I can make an immediate impact on...'",
      "Present your counter: 'After researching market rates, I was hoping we could discuss a base salary of $180K'",
      "Use collaborative language: 'I want to make sure we find something that works for both of us'",
      "If pushback, pivot to secondary asks: 'If base salary is firm, could we explore increasing the equity package?'",
      "Have a clear stopping point: 'I appreciate you working with me on this. What flexibility do you have?'",
      "End positively: 'I'm confident we can make this work. I'm really looking forward to joining the team.'",
    ],

    inPersonTips: [
      'Maintain confident but friendly body language - lean in, make eye contact',
      'Bring a printed summary of your asks for reference',
      'Practice the "pause" - silence after making an ask shows confidence',
      'Have specific examples ready of your achievements and value',
      'Be prepared to summarize at the end: "So to confirm, we agreed on..."',
    ],

    objectionHandling: [
      {
        objection: "We don't have budget for a higher base salary",
        response:
          "I understand budget constraints. Would it be possible to bridge the gap with a sign-on bonus, or perhaps we could revisit the salary at a 6-month review with specific performance targets?",
        followUp: "What performance metrics would justify a salary adjustment at the 6-month mark?",
      },
      {
        objection: 'This is our standard offer for this level',
        response:
          "I appreciate the standardization, but my background in [specific skill] and track record of [specific achievement] position me to contribute at a higher level from day one. Would you be open to discussing how we can reflect that in the offer?",
        followUp: "Are there any special approvals or exceptions that have been made in similar cases?",
      },
      {
        objection: 'We need to move quickly on this decision',
        response:
          "I'm very motivated to move forward as well. I want to make sure we set up our partnership for success from the start. A few days to align on compensation will help me start with full commitment and focus.",
        followUp: "If I can get back to you by [specific date], would that work with your timeline?",
      },
      {
        objection: 'The equity is already very generous',
        response:
          "I agree the equity component is meaningful. I'm excited about TechCorp's potential. Given the current offer is below market on total compensation, could we explore either increasing the grant or accelerating the vesting schedule?",
        followUp: "What has the typical equity appreciation looked like for employees who joined 2-3 years ago?",
      },
    ],

    closingStatements: [
      "I'm genuinely excited to join TechCorp and contribute to the team's success. Finding the right compensation package will allow me to fully focus on delivering results from day one.",
      "Thank you for working with me on this. I believe we're close to an agreement that works for everyone, and I'm looking forward to finalizing things.",
      "I appreciate your flexibility. With these adjustments, I'm ready to accept and start as soon as possible.",
    ],
  },

  regenerationCount: 0,
  isActive: true,
}

/**
 * Get mock compensation strategy with optional customization
 */
export function getMockCompensationStrategy(
  overrides?: Partial<CompensationStrategy>
): CompensationStrategy {
  return {
    ...MOCK_COMPENSATION_STRATEGY,
    ...overrides,
    id: `mock-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
