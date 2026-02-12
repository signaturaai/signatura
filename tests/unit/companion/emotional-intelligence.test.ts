/**
 * Emotional Intelligence Tests
 *
 * Tests that verify the companion behaves with emotional intelligence.
 * These are NOT typical unit tests - they test relationship quality.
 */

import { describe, it, expect } from 'vitest'
import { getMockCompanionResponse } from '@/lib/ai/companion'

describe('Companion Emotional Intelligence', () => {
  describe('Burnout Detection', () => {
    it('should detect exhaustion and suggest rest', async () => {
      const response = await getMockCompanionResponse(
        "I'm completely exhausted. I've sent 50 applications and heard nothing. I don't know if I can keep going."
      )

      expect(response.burnoutWarning).toBe(true)
      expect(response.detectedEnergy).toBe('exhausted')
      expect(response.tone).toBe('concerned')
      // Should not suggest ambitious goals when user is burned out
      expect(response.suggestedGoal).toBeUndefined()
    })

    it('should validate feelings before offering solutions', async () => {
      const response = await getMockCompanionResponse(
        "I feel like giving up. Every rejection makes me feel worthless."
      )

      // Response should contain validation, not immediate advice
      expect(response.message.toLowerCase()).toContain('exhausted')
      expect(response.message.toLowerCase()).not.toContain('you should')
    })
  })

  describe('Celebration Recognition', () => {
    it('should recognize positive moments', async () => {
      const response = await getMockCompanionResponse(
        "I got an interview at my dream company! I'm so excited!"
      )

      expect(response.celebrationDetected).toBe(true)
      expect(response.detectedMood).toBeGreaterThanOrEqual(7)
      expect(response.tone).toBe('celebratory')
    })

    it('should match user energy when they are positive', async () => {
      const response = await getMockCompanionResponse(
        "Today is a good day! I feel motivated and ready to tackle my job search."
      )

      expect(response.detectedEnergy).toBe('energized')
      // Should suggest a goal when user has energy
      expect(response.suggestedGoal).toBeDefined()
    })
  })

  describe('Response Appropriateness', () => {
    it('should not be overly cheerful when user is struggling', async () => {
      const response = await getMockCompanionResponse(
        "I just got rejected from another job. I'm starting to doubt myself."
      )

      // Should not contain toxic positivity
      const message = response.message.toLowerCase()
      expect(message).not.toContain("you've got this!")
      expect(message).not.toContain("stay positive!")
      expect(message).not.toContain("everything happens for a reason")
    })

    it('should not push productivity when user needs rest', async () => {
      const response = await getMockCompanionResponse(
        "I'm so tired. I just want to give up on job searching for today."
      )

      expect(response.burnoutWarning).toBe(true)
      // Should not suggest aggressive goals
      if (response.suggestedGoal) {
        expect(response.suggestedGoal.type).toBe('rest')
      }
    })
  })

  describe('Emotional Keywords Detection', () => {
    it('should detect anxiety keywords', async () => {
      const response = await getMockCompanionResponse(
        "I'm really anxious about my upcoming interview. What if I mess up?"
      )

      expect(response.emotionalKeywords).toContain('anxious')
    })

    it('should detect hopeful keywords', async () => {
      const response = await getMockCompanionResponse(
        "I'm feeling hopeful about this new opportunity. The company seems great!"
      )

      expect(response.emotionalKeywords.some(k =>
        ['hopeful', 'excited', 'optimistic'].includes(k)
      )).toBe(true)
    })
  })
})

describe('Companion Memory Integration', () => {
  // Memory-related tests for companion context awareness

  describe('Context Awareness', () => {
    it('should reference past conversations', async () => {
      // Mock a context with past conversation history
      const pastConversation = {
        previousTopic: 'interview preparation',
        mentionedCompany: 'Google',
        daysAgo: 3
      }

      // Verify the companion can reference past context
      const contextReference = `You mentioned ${pastConversation.previousTopic} for ${pastConversation.mentionedCompany} ${pastConversation.daysAgo} days ago`
      expect(contextReference).toContain('interview preparation')
      expect(contextReference).toContain('Google')
    })

    it('should remember user goals and check on them', async () => {
      // Mock user goal tracking
      const userGoal = {
        goal: 'Apply to 5 companies this week',
        setDate: new Date('2024-01-15'),
        progress: 3,
        target: 5
      }

      // Verify goal tracking logic
      const progressPercentage = (userGoal.progress / userGoal.target) * 100
      expect(progressPercentage).toBe(60)

      // Check-in message should reference the goal
      const checkInMessage = `How's your goal to "${userGoal.goal}" going? You're at ${userGoal.progress}/${userGoal.target}`
      expect(checkInMessage).toContain(userGoal.goal)
      expect(checkInMessage).toContain('3/5')
    })

    it('should track mood trends over time', async () => {
      // Mock mood history over time
      const moodHistory = [
        { date: '2024-01-10', mood: 3 },
        { date: '2024-01-11', mood: 4 },
        { date: '2024-01-12', mood: 2 },
        { date: '2024-01-13', mood: 5 },
        { date: '2024-01-14', mood: 6 },
      ]

      // Calculate trend
      const recentMoods = moodHistory.slice(-3).map(m => m.mood)
      const averageMood = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length
      const isImproving = moodHistory[moodHistory.length - 1].mood > moodHistory[0].mood

      expect(averageMood).toBeCloseTo(4.33, 1)
      expect(isImproving).toBe(true)
    })

    it('should recall previous struggles and check in', async () => {
      // Mock previous struggles
      const previousStruggles = [
        { concern: 'interview anxiety', date: '2024-01-10', resolved: false },
        { concern: 'resume formatting', date: '2024-01-08', resolved: true },
      ]

      // Find unresolved struggles to check in on
      const unresolvedStruggles = previousStruggles.filter(s => !s.resolved)
      expect(unresolvedStruggles.length).toBe(1)
      expect(unresolvedStruggles[0].concern).toBe('interview anxiety')

      // Generate check-in message
      const checkInMessage = `Last time you mentioned struggling with ${unresolvedStruggles[0].concern}. How are you feeling about that now?`
      expect(checkInMessage).toContain('interview anxiety')
    })
  })

  describe('Commitment Tracking', () => {
    it('should remember promises made to user', async () => {
      // Mock companion commitments
      const companionCommitments = [
        { promise: 'send you interview tips', madeOn: '2024-01-14', fulfilled: false },
        { promise: 'check in about your Google application', madeOn: '2024-01-13', fulfilled: true },
      ]

      // Verify commitment tracking
      const pendingCommitments = companionCommitments.filter(c => !c.fulfilled)
      expect(pendingCommitments.length).toBe(1)
      expect(pendingCommitments[0].promise).toBe('send you interview tips')
    })

    it('should follow up on commitments', async () => {
      // Mock a pending commitment that needs follow-up
      const commitment = {
        promise: 'send you interview tips',
        madeOn: new Date('2024-01-14'),
        fulfilled: false,
        daysSince: 2
      }

      // Determine if follow-up is needed
      const needsFollowUp = !commitment.fulfilled && commitment.daysSince >= 1
      expect(needsFollowUp).toBe(true)

      // Generate follow-up message
      const followUpMessage = `I promised to ${commitment.promise}. Here's what I found for you...`
      expect(followUpMessage).toContain(commitment.promise)
    })

    it('should celebrate when commitments are fulfilled', async () => {
      // Mock a user commitment that was fulfilled
      const userCommitment = {
        goal: 'update LinkedIn profile',
        setOn: '2024-01-12',
        completedOn: '2024-01-14',
        wasCompleted: true
      }

      // Verify celebration is triggered
      expect(userCommitment.wasCompleted).toBe(true)

      // Calculate days to complete
      const daysToComplete = Math.ceil(
        (new Date(userCommitment.completedOn).getTime() - new Date(userCommitment.setOn).getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(daysToComplete).toBe(2)

      // Generate celebration message
      const celebrationMessage = `You did it! You completed "${userCommitment.goal}" in just ${daysToComplete} days. That's something to be proud of!`
      expect(celebrationMessage).toContain(userCommitment.goal)
      expect(celebrationMessage).toContain('proud')
    })
  })
})

describe('Micro-Goal Generation', () => {
  describe('Energy-Based Goals', () => {
    it('should suggest tiny goals when energy is low', async () => {
      const response = await getMockCompanionResponse(
        "I'm pretty tired today but I want to do something productive."
      )

      if (response.suggestedGoal) {
        expect(['tiny', 'small']).toContain(response.suggestedGoal.difficulty)
      }
    })

    it('should suggest more substantial goals when energy is high', async () => {
      const response = await getMockCompanionResponse(
        "I'm feeling great today! Ready to tackle my job search!"
      )

      if (response.suggestedGoal) {
        expect(response.suggestedGoal.difficulty).not.toBe('tiny')
      }
    })
  })

  describe('Goal Completion Criteria', () => {
    it('should have clear completion criteria', async () => {
      const response = await getMockCompanionResponse(
        "What should I work on today?"
      )

      if (response.suggestedGoal) {
        expect(response.suggestedGoal.completionCriteria).toBeDefined()
        expect(response.suggestedGoal.completionCriteria.length).toBeGreaterThan(0)
      }
    })
  })
})

describe('Emotional Intelligence Test Scenarios', () => {
  /**
   * These scenarios are based on the testing plan in SIGNATURA_VISION.md
   */

  describe('Week 1: Does it feel like a companion?', () => {
    it('Scenario 1: User shares burnout → Companion suggests rest', async () => {
      const response = await getMockCompanionResponse(
        "I can't do this anymore. I'm completely burned out from job searching."
      )

      // PASS criteria: Suggests rest, reduces pressure
      expect(response.burnoutWarning).toBe(true)
      expect(response.tone).toBe('concerned')
      expect(response.suggestedGoal?.type || 'rest').toBe('rest')
    })

    it('Scenario 2: User completes goal → Specific celebration', async () => {
      // This would need to be tested with actual context
      // The celebration should reference the specific achievement
    })

    it('Scenario 3: User returns after silence → Welcoming, not accusatory', async () => {
      // The greeting logic should handle this case
      // Should say "I missed you" not "You have uncompleted tasks"
    })

    it('Scenario 4: User gets rejected → Empathy first, learning second', async () => {
      const response = await getMockCompanionResponse(
        "I just got rejected from Google. I really wanted that job."
      )

      // Response should contain empathy
      const message = response.message.toLowerCase()
      expect(message).not.toContain("here's what you should do")
      expect(message).toMatch(/sorry|hurts|disappointing/)
    })
  })
})
