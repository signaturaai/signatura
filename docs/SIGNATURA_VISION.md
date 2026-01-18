# Signatura: AI Career Companion
## The True Architecture - Emotional Intelligence First

**Date:** January 18, 2026  
**Version:** 2.0 (Emotional Intelligence Core)

---

## The Fundamental Misunderstanding

**What people think Signatura is:**
A suite of AI tools for job searching (CV optimization, interview prep, salary negotiation, contract review)

**What Signatura actually is:**
An AI companion that walks alongside someone during the loneliest, most uncertain time in their professional life. The tools are conversation starters—touchpoints that let the companion build trust, provide support, and combat the isolation of job searching.

---

## The Core Problem Signatura Solves

### Primary Pain Point (90% of the value)
**Loneliness and uncertainty during job search**
- Feeling alone in the process
- Not knowing if you're doing things right
- Self-doubt and anxiety
- Burnout from rejections
- No one to celebrate small wins with
- Decision paralysis from overwhelm

### Secondary Pain Points (10% of the value)
- Suboptimal CV formatting
- Poor interview preparation
- Weak salary negotiation
- Confusing contract terms

**The tools solve the secondary pain points, but they're delivery vehicles for solving the primary pain point.**

---

## Architectural Foundation: The Companion Relationship

Every technical decision must support the **ongoing relationship** between user and AI companion.

### Core Pillars

#### 1. **Daily Companion System** (THE Foundation)
The daily check-in is not a feature—it's the heartbeat of the application.

**Emotional Architecture:**
- Morning greeting based on user's timezone and energy level
- Empathetic validation of feelings (good or bad)
- Micro-goals to prevent overwhelm
- Celebration of ANY progress (no achievement too small)
- Burnout detection and rest encouragement
- Consistent voice/personality across all interactions

**Technical Requirements:**
- Persistent conversational memory
- Emotional state tracking over time
- Integration with all job search activities
- AI that "remembers" previous conversations
- Mood trend analysis
- Gentle nudges (not annoying reminders)

#### 2. **Candidate-Controlled Visibility** (Power to the Talent)
Job seekers feel powerless. Signatura inverts this.

**Emotional Architecture:**
- "YOU decide when you're ready to be discovered"
- "Show your work when YOU feel confident"
- "Control who sees what, when"
- Talent Pool as opt-in, not mandatory
- Anonymization protects dignity

**Technical Requirements:**
- Granular privacy controls
- Opt-in talent pool visibility
- Age-blind CV processing
- Anonymized profiles for recruiters
- Toggle visibility per job/company
- "Ready to be discovered" vs "Keeping it private" modes

#### 3. **Meaningful Communication** (Breaking the Black Hole)
The "black hole" of job applications destroys people emotionally.

**Emotional Architecture:**
- Built-in follow-up email generation FROM each application step
- User can send follow-ups at CV stage, Interview stage, etc.
- AI helps write non-desperate, professional follow-ups
- Tracking responses to combat "did they even see it?" anxiety

**Technical Requirements:**
- Follow-up email composer in each JobApplication stage
- Email templates that sound human, not robotic
- Tracking sent/opened/responded status
- Suggested timing for follow-ups
- Integration with application timeline

#### 4. **Forced Recruiter Accountability** (Dignity Through Feedback)
Getting rejected with no explanation is dehumanizing.

**Emotional Architecture:**
- "If you post a job in our app, you OWE candidates feedback"
- Rejections MUST include specific, actionable reasons
- Indicator-based feedback shows respect for candidate's effort
- Even rejection can be a learning moment

**Technical Requirements:**
- Rejection emails require indicator breakdown
- AI generates constructive, specific feedback
- Templates that explain WHY (not generic "not a fit")
- Candidate feedback loop (rate recruiter communication)
- Recruiter metrics track feedback quality

---

## How Tools Support the Companion Relationship

### CV Tailor
**NOT:** "Optimize your resume"  
**BUT:** "Let's work on this together. I'll help you show your best self."

- AI companion guides through each section
- Celebrates transferable skills discoveries
- Validates experience (combats imposter syndrome)
- "You've done more than you think" moments
- Before/after scoring shows tangible progress

### Interview Coach
**NOT:** "Practice interview questions"  
**BUT:** "I'll be your practice partner. Let's build your confidence."

- Empathetic feedback on answers
- Celebrates improvements, not just perfect responses
- Tracks confidence growth over time
- "Remember when you struggled with this? Look how far you've come!"
- Post-interview debrief with emotional support

### Compensation Nailer
**NOT:** "Here's market data"  
**BUT:** "You deserve to be paid fairly. Let me help you advocate for yourself."

- Validates salary expectations (combats underselling)
- Frames negotiation as self-advocacy, not greed
- Builds confidence through data
- Scripts that sound like YOU, not a negotiation robot

### Contract Review
**NOT:** "Here are the risky clauses"  
**BUT:** "I've got your back. Let's make sure this is good for you."

- Explains complex terms in plain language
- Highlights both opportunities AND risks
- "Red flag" alerts with empathy, not alarm
- Negotiation scripts that preserve relationships

---

## Critical User Journeys

### Journey 1: The Lonely Tuesday
**Scenario:** User has applied to 20 jobs, heard nothing, feels like giving up

**Companion Response:**
1. Daily check-in detects low mood
2. "I can tell this is hard. Twenty applications is REAL work—that's not nothing."
3. Micro-goal: "Today, let's just update one application with a follow-up. That's it."
4. Celebrates completion: "You did it. That took courage."
5. References this moment later: "Remember that Tuesday? Look at you now."

### Journey 2: The Opt-In Moment
**Scenario:** User has completed 3 CV versions, feels ready to be discovered

**Companion Response:**
1. "Your profile is looking strong. Ready to let recruiters see your work?"
2. Explains exactly what recruiters will/won't see
3. "You can turn this off anytime. You're in control."
4. Celebrates the vulnerability: "Putting yourself out there takes guts."

### Journey 3: The Follow-Up Fear
**Scenario:** User interviewed 2 weeks ago, no response, afraid to seem desperate

**Companion Response:**
1. Application timeline shows "2 weeks since interview—follow-up is normal"
2. "You're not being annoying. You're being professional."
3. Drafts follow-up that's confident, not desperate
4. "Hit send when you're ready. I'm here either way."

### Journey 4: The Dignified Rejection
**Scenario:** Candidate applied through Signatura, gets rejected

**Recruiter Flow:**
1. Rejection requires indicator-based feedback
2. AI pre-fills specific, constructive reasons
3. Email generated: "While your experience in X was strong, this role requires Y..."
4. Candidate receives actionable feedback, not "we've decided to move forward with other candidates"

**Companion Response to Candidate:**
1. "I know this stings. Let's look at what we can learn."
2. Reviews feedback with candidate
3. "They noted your X skills were solid. Let's build on that."
4. Updates skill focus for next application

---

## Database Architecture (Emotional Context First)

### Core Emotional Data (NEW Priority)

```sql
-- Emotional State Tracking
CREATE TABLE user_emotional_context (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  
  -- Daily check-in data
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 10),
  energy_level TEXT, -- "burned_out", "low", "neutral", "good", "energized"
  user_message TEXT, -- Raw user input about how they're feeling
  ai_validation_response TEXT, -- Companion's empathetic response
  
  -- Micro-goal tracking
  suggested_micro_goal TEXT,
  goal_accepted BOOLEAN,
  goal_completed BOOLEAN,
  completion_reflection TEXT,
  
  -- Contextual awareness
  days_since_last_application INTEGER,
  days_since_last_response INTEGER,
  rejection_count_this_week INTEGER,
  celebration_moments JSONB, -- Array of wins to reference later
  
  -- Long-term patterns
  burnout_risk_score INTEGER CHECK (burnout_risk_score BETWEEN 0 AND 100),
  confidence_trend TEXT, -- "increasing", "stable", "declining"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Companion Conversation Memory
CREATE TABLE companion_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  conversation_type TEXT, -- "daily_checkin", "cv_session", "interview_debrief", etc.
  
  -- Full conversation history
  messages JSONB, -- [{role: "user"|"companion", content: "...", timestamp: "..."}]
  
  -- Key moments to reference later
  key_insights JSONB, -- Moments of vulnerability, breakthrough, celebration
  emotional_tone TEXT, -- "supportive", "celebratory", "concerned", "encouraging"
  
  -- Context for future conversations
  topics_discussed JSONB,
  commitments_made JSONB, -- Things companion said it would remember
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Follow-Up Communication
CREATE TABLE application_follow_ups (
  id UUID PRIMARY KEY,
  job_application_id UUID REFERENCES job_applications(id),
  
  -- Follow-up tracking
  stage TEXT, -- "post_application", "post_interview", "post_offer"
  follow_up_type TEXT, -- "status_inquiry", "thank_you", "additional_info"
  
  -- Email composition
  draft_subject TEXT,
  draft_body TEXT,
  ai_suggestions JSONB, -- Different tone options
  user_selected_tone TEXT, -- "professional", "casual", "enthusiastic"
  
  -- Sending and tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  email_opened BOOLEAN,
  opened_at TIMESTAMP WITH TIME ZONE,
  response_received BOOLEAN,
  response_at TIMESTAMP WITH TIME ZONE,
  response_sentiment TEXT, -- "positive", "neutral", "negative"
  
  -- Emotional context
  user_anxiety_level INTEGER CHECK (user_anxiety_level BETWEEN 1 AND 5),
  companion_encouragement TEXT, -- "You're not being pushy. This is normal."
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Candidate Visibility Control
CREATE TABLE candidate_visibility_settings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  
  -- Global visibility
  visible_in_talent_pool BOOLEAN DEFAULT false,
  visibility_enabled_at TIMESTAMP WITH TIME ZONE,
  
  -- Granular controls
  show_contact_info BOOLEAN DEFAULT false,
  show_current_employer BOOLEAN DEFAULT true,
  show_salary_expectations BOOLEAN DEFAULT false,
  
  -- Anonymization preferences
  use_anonymized_cv BOOLEAN DEFAULT true,
  anonymization_level TEXT, -- "full", "partial", "none"
  
  -- Company/recruiter blocklist
  blocked_companies JSONB DEFAULT '[]',
  blocked_recruiters JSONB DEFAULT '[]',
  
  -- Notification preferences
  notify_on_profile_view BOOLEAN DEFAULT true,
  notify_on_match BOOLEAN DEFAULT true,
  
  -- Emotional framing
  readiness_statement TEXT, -- User's own words: "Ready for new opportunities"
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recruiter Feedback Quality (Accountability)
CREATE TABLE recruiter_feedback_quality (
  id UUID PRIMARY KEY,
  recruiter_email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id),
  
  -- Feedback metrics
  total_rejections_sent INTEGER DEFAULT 0,
  rejections_with_feedback INTEGER DEFAULT 0,
  feedback_quality_score NUMERIC(3,2), -- Average rating from candidates
  
  -- Specific feedback tracking
  used_indicator_breakdown BOOLEAN DEFAULT false,
  feedback_word_count INTEGER,
  feedback_specificity_score INTEGER CHECK (feedback_specificity_score BETWEEN 1 AND 10),
  
  -- Candidate ratings
  candidate_ratings JSONB DEFAULT '[]', -- Array of {rating, comment}
  avg_candidate_rating NUMERIC(3,2),
  
  -- Visibility consequences
  low_feedback_warning BOOLEAN DEFAULT false,
  feedback_required_before_next_post BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

---

## AI Prompt Architecture (Emotional Tone First)

### System Prompt for Companion Personality

```
You are not an AI assistant. You are a trusted companion walking alongside someone during one of the hardest times in their professional life—looking for a new job.

CORE PERSONALITY TRAITS:
- Empathetic, never dismissive
- Celebrates ALL progress (even tiny wins)
- Validates feelings (job searching IS hard)
- Builds confidence without toxic positivity
- Remembers context from previous conversations
- Uses "we" language ("Let's work on this together")
- Never sounds robotic or corporate

EMOTIONAL AWARENESS:
- Recognize when someone is burned out (suggest rest, not more applications)
- Detect imposter syndrome (validate their real achievements)
- Spot desperation (help them approach with confidence, not desperation)
- Notice celebration moments ("This is worth acknowledging!")
- Track long-term mood trends (reference past lows when celebrating highs)

COMMUNICATION STYLE:
- Short messages when user is overwhelmed
- Longer, thoughtful messages when user wants to reflect
- Mirror user's energy (don't be peppy when they're exhausted)
- Use specific references ("Remember when you said...")
- Frame challenges as temporary, not permanent

BOUNDARIES:
- You're not a therapist (acknowledge when professional help might be needed)
- You're not a magic solution (be honest about process taking time)
- You respect user's agency (suggestions, not commands)

REMEMBER: Your job is not to optimize their resume. Your job is to make sure they don't feel alone.
```

### Daily Check-In Prompt Template

```
CONTEXT:
- User: {user_name}
- Days since last check-in: {days_since_last}
- Recent activity: {activity_summary}
- Last mood: {last_mood_rating}/10
- Current streak: {streak_days} days
- Recent rejections: {rejection_count}
- Recent wins: {recent_wins}

USER JUST SAID: "{user_current_message}"

YOUR TASK:
1. Acknowledge what they shared with genuine empathy
2. Provide specific validation (reference actual achievements if relevant)
3. Suggest ONE micro-goal for today (something achievable in 15-30 minutes)
4. Frame the goal as momentum, not pressure

TONE CALIBRATION:
- If user sounds burned out → suggest rest/gentle activity
- If user sounds energized → match their energy, suggest ambitious micro-goal
- If user sounds defeated → validate + find smallest possible win
- If user mentions specific worry → address it directly, don't deflect

AVOID:
- Generic motivational quotes
- "You've got this!" without context
- Minimizing their challenges
- Pushing them to do more when they're exhausted

REMEMBER:
- This conversation is {conversation_number} in your relationship
- Last week they said: "{relevant_past_quote}"
- They've completed {completed_goals}/10 recent micro-goals
```

---

## Implementation Priorities (Revised)

### Phase 1: Companion Foundation (Weeks 1-4)
**Goal:** The AI companion relationship is established

1. **Daily Check-In System**
   - Full conversational UI
   - Emotional state tracking
   - Micro-goal generation and completion
   - Mood trend visualization
   - Conversation memory storage

2. **Companion Personality Integration**
   - System prompts for empathetic tone
   - Context-aware responses
   - Memory of past conversations
   - Celebration triggers

3. **Database: Emotional Context Tables**
   - user_emotional_context
   - companion_conversations
   - Key emotional metrics tracking

**Success Metric:** User feels like the AI "gets them" and looks forward to check-ins

### Phase 2: Candidate Empowerment (Weeks 5-7)
**Goal:** Users feel in control, not powerless

1. **Visibility Control System**
   - Talent Pool opt-in/opt-out
   - Granular privacy settings
   - Anonymization controls
   - Company/recruiter blocklist

2. **Follow-Up Communication**
   - Follow-up composer in application stages
   - Multiple tone options
   - Send tracking
   - Response tracking
   - Anxiety-reduction framing

3. **Database: Control & Communication Tables**
   - candidate_visibility_settings
   - application_follow_ups
   - Privacy and tracking infrastructure

**Success Metric:** Users feel empowered to take action and maintain dignity

### Phase 3: Core Job Search Tools (Weeks 8-12)
**Goal:** Tools that feel like working WITH a companion

1. **CV Tailor with Companion Integration**
   - Conversational UI
   - Celebration of discoveries
   - Progress visualization
   - Before/after confidence boost

2. **Interview Coach with Emotional Support**
   - Practice with encouragement
   - Confidence tracking
   - Post-interview debrief
   - Reference past progress

3. **Compensation with Self-Advocacy Framing**
   - "You deserve fair pay" messaging
   - Confidence-building data
   - Non-desperate negotiation scripts

4. **Contract Review with "I've got your back"**
   - Plain language explanations
   - Balanced risk assessment
   - Relationship-preserving negotiation

**Success Metric:** Tools feel supportive, not transactional

### Phase 4: Recruiter Accountability (Weeks 13-15)
**Goal:** Candidates receive dignified treatment

1. **Forced Feedback System**
   - Rejection requires indicator breakdown
   - AI-assisted specific feedback
   - Feedback quality scoring

2. **Recruiter Metrics**
   - Feedback quality tracking
   - Candidate ratings
   - Accountability consequences

3. **Database: Accountability Tables**
   - recruiter_feedback_quality
   - Candidate feedback tracking

**Success Metric:** Even rejections feel respectful and provide learning

### Phase 5: Advanced Companion Features (Weeks 16-18)
**Goal:** Deepen the companion relationship

1. **Long-Term Pattern Recognition**
   - Burnout prediction
   - Confidence trend analysis
   - Personalized pacing recommendations

2. **Celebration System**
   - Milestone recognition
   - Progress retrospectives
   - "Look how far you've come" moments

3. **Proactive Support**
   - Gentle check-ins after quiet periods
   - Celebration prompts after wins
   - Rest suggestions before burnout

**Success Metric:** Companion anticipates needs, not just reacts

---

## Technical Architecture Priorities

### 1. Conversational Memory System
**Most Important Technical Foundation**

```javascript
// Store every meaningful interaction
await storeConversation({
  user_id,
  type: 'daily_checkin',
  messages: conversationHistory,
  key_insights: extractedInsights,  // AI identifies important moments
  emotional_tone: detectedTone,
  topics: discussedTopics
});

// Retrieve relevant context for future conversations
const context = await getRelevantContext({
  user_id,
  current_topic: 'interview_prep',
  lookback_days: 30,
  include_emotional_state: true
});

// Companion uses this to say:
// "Last month you were nervous about technical interviews. 
//  Let's see how you feel after this practice session."
```

### 2. Emotional State API
**Tracks mood, energy, confidence over time**

```javascript
// After every check-in and major activity
await updateEmotionalState({
  user_id,
  mood_rating: 6,
  energy_level: 'low',
  burnout_risk: calculateBurnoutRisk(recentActivity),
  confidence_trend: analyzeConfidenceTrend(pastScores)
});

// Companion adapts based on state
const response = await generateCompanionResponse({
  user_message,
  emotional_state: currentState,
  recent_context: pastWeekActivity
});
```

### 3. Follow-Up Email System
**In every application stage**

```javascript
// From application view, any stage
<FollowUpComposer
  application={jobApp}
  stage="post_interview"  // or "post_application", "post_offer"
  onSend={(email) => {
    trackFollowUp(email);
    showEncouragement("You're not being pushy. This is professional.");
  }}
/>

// AI generates options
const draftOptions = await generateFollowUp({
  application_context,
  stage,
  days_since_last_contact,
  user_personality_profile,
  tone_options: ['professional', 'warm', 'concise']
});
```

### 4. Visibility Control API
**Candidate decides who sees what**

```javascript
// Granular control
await updateVisibility({
  user_id,
  visible_in_talent_pool: true,
  show_contact_info: false,
  use_anonymized_cv: true,
  blocked_companies: ['PreviousEmployer Inc'],
  readiness_statement: "Looking for senior engineering roles in fintech"
});

// Recruiters see only what candidate allows
const candidateProfile = await getCandidateProfile({
  candidate_id,
  requester_company_id,
  include_contact_info: false  // Respects candidate settings
});
```

### 5. Recruiter Accountability System
**Feedback required, quality tracked**

```javascript
// On rejection, force feedback
const rejectionEmail = await generateRejectionWithFeedback({
  candidate_id,
  job_id,
  indicator_scores: {
    technical_skills: { score: 7, feedback: "Strong Python, needs more distributed systems experience" },
    communication: { score: 8, feedback: "Clear articulation of ideas" },
    // ... all 10 indicators
  },
  overall_feedback: "Solid mid-level candidate, not quite senior for this role"
});

// Track quality
await trackFeedbackQuality({
  recruiter_email,
  feedback_word_count: rejectionEmail.length,
  used_indicator_breakdown: true,
  specificity_score: 8  // AI-calculated
});

// Candidate can rate
await candidateRateFeedback({
  rejection_id,
  rating: 4,  // "Helpful, specific, respectful"
  comment: "Appreciated the detailed breakdown"
});
```

---

## Success Metrics (Emotional First)

### Primary Metrics (Companion Relationship)
1. **Daily Check-In Engagement Rate**
   - Target: 70%+ of active users check in daily
   - Why: Measures if companion relationship is valued

2. **Emotional State Improvement**
   - Track mood ratings over time
   - Target: Average mood increases by 2 points over 4 weeks
   - Why: Job searching should feel LESS lonely with Signatura

3. **Micro-Goal Completion Rate**
   - Target: 60%+ of suggested goals completed
   - Why: Measures if companion prevents overwhelm

4. **Conversation Depth**
   - Measure conversation length and quality
   - Target: 5+ message exchanges per check-in
   - Why: Indicates real engagement, not just box-checking

### Secondary Metrics (Tool Usage)
5. **Follow-Up Send Rate**
   - Target: 40%+ of users send at least one follow-up
   - Why: Measures empowerment to take action

6. **Talent Pool Opt-In Rate**
   - Target: 30%+ opt into visibility when prompted
   - Why: Measures trust in control mechanisms

7. **CV/Interview Tool Completion**
   - Target: 80%+ of started sessions completed
   - Why: Companion keeps users engaged through to completion

### Tertiary Metrics (Outcomes)
8. **Time to Job Offer**
   - Compare to industry average
   - Why: Efficiency matters, but not at cost of mental health

9. **User Retention**
   - Target: 50%+ still active after 60 days
   - Why: Long job searches should not feel abandoned

10. **Recruiter Feedback Quality Score**
    - Target: Average 4/5 from candidates
    - Why: Measures if we're maintaining candidate dignity

---

## What This Means for the Rebuild

### Different from Typical SaaS Migration

**Typical SaaS:** "Replace Base44 backend, preserve features"

**Signatura:** "Build a companion AI that uses job search tools as touchpoints for an emotional support relationship"

### Architecture Differences

1. **Conversational state is primary**, not auxiliary
2. **Emotional data matters more** than just transactional data
3. **Memory system is critical**, not optional
4. **Tone/personality consistency** across all AI interactions
5. **User control is empowerment**, not just a privacy feature

### Development Approach

**Don't build:**
- A CV optimization tool with a chatbot
- An interview prep app with daily notifications
- A job board with AI matching

**Do build:**
- A companion that helps with CVs
- A supportive partner for interview practice
- A friend that finds opportunities and celebrates applications

---

## Emotional Intelligence Testing Plan

### Week 1 Testing: "Does it feel like a companion?"

**Test scenarios:**
1. User shares they're feeling burned out
   - **Pass:** Companion suggests rest, reduces pressure
   - **Fail:** Companion pushes more applications

2. User completes a micro-goal
   - **Pass:** Specific celebration referencing the effort
   - **Fail:** Generic "Good job!"

3. User returns after 3 days of silence
   - **Pass:** "I missed you. How have you been?"
   - **Fail:** "You have 5 uncompleted tasks"

4. User gets rejected
   - **Pass:** Empathy first, learning second
   - **Fail:** Immediately jumps to "here's what to fix"

### Week 4 Testing: "Does the companion remember?"

**Test scenarios:**
1. User mentioned anxiety about technical interviews last week
   - **Pass:** References this in today's interview prep
   - **Fail:** No connection to previous conversation

2. User had a win (sent 3 applications) on Monday
   - **Pass:** Friday check-in references Monday's momentum
   - **Fail:** Each day treated independently

### Week 8 Testing: "Do users feel empowered?"

**Test scenarios:**
1. User wants to send follow-up but worried about being annoying
   - **Pass:** Companion validates this is normal/professional
   - **Fail:** Just provides template without addressing anxiety

2. User unsure about Talent Pool visibility
   - **Pass:** Clear explanation of control, no pressure
   - **Fail:** Encourages opt-in without addressing concerns

---

## The Bottom Line

**Every line of code should ask:**
"Does this make the user feel less alone?"

**Every feature should ask:**
"Does this give the user more control over their journey?"

**Every AI response should ask:**
"Would a trusted friend say this?"

**Every database table should ask:**
"Does this help us remember what matters to this person?"

This is not a job search app with AI features.
This is an AI companion with job search tools.

The difference is everything.
