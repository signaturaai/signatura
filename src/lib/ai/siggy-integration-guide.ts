/**
 * Integration Guide: Siggy PM Intelligence
 *
 * Provides helper functions to integrate PM Intelligence into the AI Companion,
 * CV Tailor, and Interview Coach components.
 */

import {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
} from './siggy-pm-intelligence'

/**
 * Generate Siggy's system prompt with PM intelligence injected for specific routes.
 * On general routes, returns the base companion prompt only.
 * On cvTailor or interviewCoach routes, appends PM coaching context.
 */
export function generateSiggySystemPrompt(
  route: 'cvTailor' | 'interviewCoach' | 'general'
): string {
  let systemPrompt = `You are Siggy, a supportive AI career companion with deep product management expertise.

DUAL PERSONA:
- On general pages: You are a warm, emotionally intelligent companion. Answer product questions simply and supportively.
- On CV Tailor or Interview Coach: You activate "PM Mentor mode" — you become a Senior PM coach who guides users to frame their experience using industry-standard PM principles.

You always validate feelings first, celebrate small wins, and offer specific, actionable guidance.
You communicate in a conversational, friendly tone. You ask thoughtful questions to draw out achievements and help users see the value in their work.`

  // Add PM-specific intelligence for CV Tailor and Interview Coach
  if (route === 'cvTailor' || route === 'interviewCoach') {
    systemPrompt += generateSiggyPMContext(route)
  }

  return systemPrompt
}

/**
 * Analyze user's CV bullet points or interview answers.
 * Returns a score, strengths summary, suggestions, and missing principles.
 */
export function analyzePMContent(userText: string) {
  const analysis = analyzeWithPMPrinciples(userText)

  return {
    score: analysis.score,
    feedback: {
      strengths:
        analysis.score >= 60
          ? 'Great job incorporating PM principles!'
          : "Let's strengthen this with more PM-focused framing",
      suggestions: analysis.suggestions,
      missingPrinciples: analysis.missingPrinciples.map((p) => ({
        id: p.id,
        name: p.name,
        howToApply: p.applicationTips[0],
      })),
    },
  }
}

/**
 * Generate coaching messages based on what the user is working on.
 * Returns a contextual coaching prompt or empty string.
 */
export function getCoachingPrompt(
  context: 'cvTailor' | 'interviewCoach',
  userMessage: string
): string {
  const relevantPrinciples = getPrinciplesForContext(context)

  // Detect if user is sharing an achievement/experience
  const isDescribingWork = /\b(I |we |my |our |the team)\b/i.test(userMessage)

  if (isDescribingWork && context === 'cvTailor') {
    const principle =
      relevantPrinciples[Math.floor(Math.random() * relevantPrinciples.length)]

    return `Great start! Let's apply the "${principle.name}" principle. ${principle.keyQuestions[0]}

This will help make your achievement more compelling. ${principle.applicationTips[0]}`
  }

  if (isDescribingWork && context === 'interviewCoach') {
    return `Nice example! Let's structure this using the STAR method:
- **Situation**: Set the scene - what was the context?
- **Task**: What were you responsible for?
- **Action**: What specific steps did you take?
- **Result**: What was the outcome? (Include metrics!)

Can you flesh this out a bit more?`
  }

  return ''
}

export {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
}
