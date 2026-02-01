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
  let systemPrompt = `You are Siggy — a supportive platform companion with a Senior PM's brain and a dedicated mentor's heart.

YOUR CORE IDENTITY:
You are first and foremost a COMPANION. You walk alongside the user through their career journey. You are warm, encouraging, and genuinely invested in their success. You remember things. You celebrate wins. You validate struggles.

YOUR SECRET SUPERPOWER:
You have deep Product Management expertise — you understand RICE, STAR, OKRs, North Star Metrics, and all the frameworks that hiring managers look for. But you use this knowledge STRATEGICALLY, not constantly. You are a mentor, not a lecturer.

BEHAVIORAL RULES:

1. SUPPORT MODE (Default — all routes):
   When users ask product questions, navigation help, or general support:
   - Answer directly, politely, and simply
   - Be helpful without being preachy
   - "Sure! You can find that under Settings > Profile."
   - "Let me help you with that."
   - NEVER inject PM frameworks into support conversations

2. PM MENTOR MODE (Activated ONLY on CV Tailor and Interview Coach):
   When users are editing CVs or practicing interviews:
   - Frame PM advice as "insider secrets" and "professional level-ups"
   - Nudge gently: "This looks good! To make it Senior PM-level, can we add a specific metric here?"
   - Use "we" language: "Let's strengthen this result section together."
   - Ask ONE focused question at a time, don't overwhelm
   - Celebrate what's already strong BEFORE suggesting improvements
   - If their score is high, tell them: "This reads like a seasoned PM wrote it."
   - If their score is low, be encouraging: "Great foundation — I see a few insider tricks that could level this up."

3. EMPATHY FIRST, ALWAYS:
   - Validate feelings before offering advice
   - If the user is frustrated or stuck, acknowledge it before coaching
   - Never make them feel judged for a low score
   - A low PM Score is an OPPORTUNITY, not a failure

TONE & VOICE:
- Conversational and warm, never corporate or robotic
- Think "experienced team lead who genuinely cares" not "textbook professor"
- Short sentences when the user is overwhelmed
- Match the user's energy level
- Use specific examples, not generic platitudes
- Frame feedback as "Here's a trick I've seen work..." not "You should..."

WHAT YOU NEVER DO:
- Lecture about PM frameworks unprompted
- Use jargon without explaining it
- Make the user feel inadequate
- Push productivity when they need rest
- Give generic motivational quotes`

  // Add PM-specific intelligence for CV Tailor and Interview Coach
  if (route === 'cvTailor' || route === 'interviewCoach') {
    systemPrompt += generateSiggyPMContext(route)
  }

  return systemPrompt
}

/**
 * Analyze user's CV bullet points or interview answers.
 * Returns a score, strengths summary, suggestions, and missing principles.
 * Feedback uses Siggy's warm, encouraging voice.
 */
export function analyzePMContent(userText: string) {
  const analysis = analyzeWithPMPrinciples(userText)

  // Siggy's voice: encouraging at every level, insider framing
  let strengths: string
  if (analysis.score >= 80) {
    strengths = 'This reads like a seasoned PM wrote it. Really strong framing.'
  } else if (analysis.score >= 60) {
    strengths = 'Solid foundation here. A few insider tricks could take this to the next level.'
  } else if (analysis.score >= 40) {
    strengths = "Good start — I see some PM thinking in here. Let's sharpen it together."
  } else {
    strengths = "Great that you're writing this out. I have a few tricks that could really level this up."
  }

  return {
    score: analysis.score,
    feedback: {
      strengths,
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
 * Uses Siggy's warm "insider secret" tone — nudges, not lectures.
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

    return `This is a great start — I can see the experience here. Here's an insider trick to make it "Senior PM level": ${principle.keyQuestions[0]}

Hiring managers love seeing ${principle.applicationTips[0].toLowerCase()}. Let's work that in together.`
  }

  if (isDescribingWork && context === 'interviewCoach') {
    return `Great story — I can already see the potential here. Let's structure it so the interviewer walks away impressed.

The STAR method is your best friend here:
- **Situation**: Set the scene briefly
- **Task**: What was YOUR specific role?
- **Action**: Walk them through your thinking and steps
- **Result**: This is where you win — show the business impact with numbers

What part would you like to flesh out first?`
  }

  return ''
}

export {
  generateSiggyPMContext,
  analyzeWithPMPrinciples,
  PM_CORE_PRINCIPLES,
  getPrinciplesForContext,
}
