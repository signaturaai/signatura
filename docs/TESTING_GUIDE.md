# Signatura Testing Guide

## 1. Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group
│   │   ├── layout.tsx            # Auth layout (centered card)
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/page.tsx       # Signup page
│   │
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Dashboard layout with nav
│   │   ├── page.tsx              # Dashboard home (redirect to /companion)
│   │   ├── companion/page.tsx    # Main companion interface
│   │   ├── applications/page.tsx # Job applications tracker
│   │   ├── cv/page.tsx           # CV/Resume builder (placeholder)
│   │   ├── interview/page.tsx    # Interview prep (placeholder)
│   │   └── settings/page.tsx     # User settings
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/callback/route.ts    # OAuth callback handler
│   │   ├── checkin/route.ts          # Daily check-in API
│   │   ├── companion/chat/route.ts   # Chat conversation API
│   │   ├── goals/route.ts            # Micro-goals API
│   │   ├── celebration/route.ts      # Celebration messages API
│   │   └── support/route.ts          # Rejection/burnout support API
│   │
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page (public)
│
├── components/
│   ├── auth/
│   │   ├── login-form.tsx        # Email/password + OAuth login
│   │   └── signup-form.tsx       # Registration form
│   │
│   ├── companion/
│   │   ├── chat.tsx              # Main chat interface
│   │   ├── dashboard.tsx         # Companion dashboard orchestrator
│   │   ├── emotional-state.tsx   # Mood/energy display widget
│   │   ├── goal-card.tsx         # Micro-goal display/actions
│   │   └── presence.tsx          # "Companion is here" indicator
│   │
│   ├── dashboard/
│   │   └── nav.tsx               # Sidebar navigation
│   │
│   └── ui/                       # Base UI components
│       ├── avatar.tsx
│       ├── button.tsx            # With gradient, companion variants
│       ├── card.tsx
│       ├── input.tsx
│       ├── label.tsx
│       └── textarea.tsx
│
├── lib/
│   ├── ai/
│   │   ├── companion.ts          # AI response generation
│   │   ├── context.ts            # User context builder
│   │   ├── memory.ts             # Conversation memory
│   │   └── prompts.ts            # System prompts
│   │
│   ├── design/
│   │   └── colors.ts             # Brand color system
│   │
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware helper
│   │
│   └── utils/
│       └── cn.ts                 # Class name utility
│
├── types/
│   ├── companion.ts              # Companion types
│   └── database.ts               # Database types
│
└── middleware.ts                 # Route protection
```

## 2. All Routes

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page with gradient hero |
| `/login` | Sign in page |
| `/signup` | Registration page |

### Protected Routes (require auth)
| Route | Description |
|-------|-------------|
| `/companion` | Main companion chat interface |
| `/applications` | Job applications tracker |
| `/cv` | CV/Resume builder (placeholder) |
| `/interview` | Interview prep (placeholder) |
| `/settings` | User preferences |

### API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/callback` | GET | OAuth callback handler |
| `/api/checkin` | GET | Get today's check-in status |
| `/api/checkin` | POST | Submit daily check-in |
| `/api/companion/chat` | POST | Send message to companion |
| `/api/goals` | GET | Get current/recent goals |
| `/api/goals` | POST | Accept goal or request new |
| `/api/goals` | PUT | Complete a goal |
| `/api/celebration` | POST | Generate celebration message |
| `/api/support` | POST | Get rejection/burnout support |

## 3. Sample Test Data

Run these SQL commands in your Supabase SQL Editor to create test data.

### Create Test User Profile
```sql
-- First, create a user through the signup flow, then update their profile:
-- Replace 'YOUR_USER_ID' with the actual user ID from auth.users

UPDATE user_profiles
SET
  full_name = 'Alex Thompson',
  job_search_status = 'actively_searching',
  target_role = 'Senior Software Engineer',
  target_industry = 'Technology',
  years_of_experience = 5,
  current_streak = 3,
  longest_streak = 7,
  total_checkins = 12,
  days_with_companion = 14,
  preferred_check_in_time = '09:00:00',
  timezone = 'America/New_York'
WHERE id = 'YOUR_USER_ID';
```

### Create Past Check-ins (Different Moods)
```sql
-- Replace 'YOUR_USER_ID' with actual user ID

-- Check-in 1: Great day (3 days ago)
INSERT INTO user_emotional_context (
  user_id, date, time_of_checkin, mood_rating, energy_level,
  user_message, ai_validation_response, response_tone,
  suggested_micro_goal, goal_type, goal_difficulty,
  user_accepted_goal, goal_completed,
  burnout_risk_score, burnout_risk_level
) VALUES (
  'YOUR_USER_ID',
  CURRENT_DATE - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  8,
  'high',
  'Had a great interview yesterday! Feeling really positive about it.',
  'That''s wonderful news! The energy in your message is contagious. It sounds like you presented yourself well. How did you feel about the conversation?',
  'enthusiastic',
  'Send a thoughtful thank-you email to your interviewer',
  'application',
  'small',
  true,
  true,
  15,
  'low'
);

-- Check-in 2: Struggling day (2 days ago)
INSERT INTO user_emotional_context (
  user_id, date, time_of_checkin, mood_rating, energy_level,
  user_message, ai_validation_response, response_tone,
  suggested_micro_goal, goal_type, goal_difficulty,
  user_accepted_goal, goal_completed,
  burnout_risk_score, burnout_risk_level
) VALUES (
  'YOUR_USER_ID',
  CURRENT_DATE - INTERVAL '2 days',
  NOW() - INTERVAL '2 days',
  4,
  'low',
  'Got rejected from that job I was excited about. Feeling pretty down.',
  'I''m so sorry to hear that. Rejection stings, especially when you were hopeful. Your feelings are completely valid. Take a moment to acknowledge this disappointment - it''s okay to feel hurt.',
  'comforting',
  'Take a 15-minute walk outside, no phones',
  'self_care',
  'tiny',
  true,
  true,
  45,
  'moderate'
);

-- Check-in 3: Neutral day (yesterday)
INSERT INTO user_emotional_context (
  user_id, date, time_of_checkin, mood_rating, energy_level,
  user_message, ai_validation_response, response_tone,
  suggested_micro_goal, goal_type, goal_difficulty,
  user_accepted_goal, goal_completed,
  burnout_risk_score, burnout_risk_level
) VALUES (
  'YOUR_USER_ID',
  CURRENT_DATE - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  6,
  'neutral',
  'Just another day of applying. Sent out 3 applications.',
  'Consistency is its own kind of strength. Three applications is solid progress. How are you feeling about the roles you applied to?',
  'supportive',
  'Review one company''s Glassdoor reviews to prepare',
  'research',
  'small',
  true,
  false,
  25,
  'low'
);

-- Check-in 4: Burnout warning (4 days ago)
INSERT INTO user_emotional_context (
  user_id, date, time_of_checkin, mood_rating, energy_level,
  user_message, ai_validation_response, response_tone,
  suggested_micro_goal, goal_type, goal_difficulty,
  user_accepted_goal, goal_completed,
  burnout_risk_score, burnout_risk_level,
  follow_up_needed, follow_up_topic
) VALUES (
  'YOUR_USER_ID',
  CURRENT_DATE - INTERVAL '4 days',
  NOW() - INTERVAL '4 days',
  3,
  'exhausted',
  'Been applying non-stop for 2 weeks. Nothing. I''m exhausted and starting to doubt myself.',
  'I hear you, and I want you to know that what you''re feeling is a natural response to sustained effort without visible results. Two weeks of intensive searching is mentally taxing. Let''s pause the job search today and focus on you.',
  'gentle',
  'No job search today - watch something that makes you laugh',
  'self_care',
  'tiny',
  true,
  true,
  75,
  'high',
  true,
  'burnout prevention'
);
```

### Create Sample Job Applications
```sql
-- Replace 'YOUR_USER_ID' with actual user ID

INSERT INTO job_applications (
  user_id, company_name, job_title, application_status,
  application_date, source, notes, excitement_level
) VALUES
(
  'YOUR_USER_ID',
  'TechCorp Inc',
  'Senior Software Engineer',
  'interviewing',
  CURRENT_DATE - INTERVAL '10 days',
  'LinkedIn',
  'Great culture fit, interesting tech stack',
  9
),
(
  'YOUR_USER_ID',
  'StartupXYZ',
  'Full Stack Developer',
  'applied',
  CURRENT_DATE - INTERVAL '5 days',
  'Company website',
  'Remote position, good benefits',
  7
),
(
  'YOUR_USER_ID',
  'BigBank Corp',
  'Software Engineer II',
  'rejected',
  CURRENT_DATE - INTERVAL '14 days',
  'Indeed',
  'Didn''t hear back after phone screen',
  5
),
(
  'YOUR_USER_ID',
  'InnovateTech',
  'Backend Engineer',
  'applied',
  CURRENT_DATE - INTERVAL '2 days',
  'Referral',
  'Friend works there, put in good word',
  8
);
```

## 4. Testing Checklist

### Sign Up Flow
- [ ] Navigate to `/signup`
- [ ] Enter email and password
- [ ] Click "Create account"
- [ ] Check for confirmation email (if email confirmation enabled)
- [ ] Verify redirect to `/companion` after signup
- [ ] Verify user profile created in `user_profiles` table

### Login Flow
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Click "Sign in"
- [ ] Verify redirect to `/companion`
- [ ] Test "Magic Link" option (sends email)
- [ ] Test logout (should redirect to `/login`)

### Daily Check-in Flow
- [ ] Navigate to `/companion`
- [ ] Verify greeting shows your name
- [ ] Verify streak count displays correctly
- [ ] Type a message about how you're feeling
- [ ] Submit and wait for AI response
- [ ] Verify response feels empathetic and personal
- [ ] Check that mood/energy detected correctly
- [ ] Verify micro-goal suggestion appears
- [ ] Test "Accept" button on goal
- [ ] Verify check-in saved in `user_emotional_context` table

### Companion Response Quality
Test these scenarios and evaluate responses:

| Scenario | What to Type | Expected Tone |
|----------|--------------|---------------|
| Good news | "I got a callback for a second interview!" | Enthusiastic, celebratory |
| Bad news | "Got rejected again. Third one this week." | Comforting, validating |
| Burnout | "I'm exhausted. Can't do this anymore." | Gentle, suggests self-care |
| Neutral | "Just another day, applied to 2 jobs." | Supportive, encouraging |
| Anxious | "Interview tomorrow, really nervous." | Calming, confidence-building |

### Micro-Goal System
- [ ] Complete a check-in to receive a goal
- [ ] Verify goal matches your energy level
- [ ] Click "Accept" to commit to goal
- [ ] Navigate away and back - goal should persist
- [ ] Click "Complete" when done
- [ ] Verify celebration message appears
- [ ] Click "Different goal" to get alternative
- [ ] Verify new goal is appropriate

### Mood Tracking
- [ ] Complete check-ins on multiple days
- [ ] Verify `EmotionalState` widget shows:
  - Current mood (emoji + label)
  - Energy level
  - Current streak
  - Burnout warning (if applicable)
- [ ] Check database for mood history

### Navigation & UI
- [ ] Verify sidebar navigation works
- [ ] Test all navigation links
- [ ] Verify gradient colors display correctly
- [ ] Check companion messages have rose background
- [ ] Check user messages have sky blue background
- [ ] Verify responsive design on mobile

### Error Handling
- [ ] Test API with invalid auth (should return 401)
- [ ] Test with network disconnected (graceful error)
- [ ] Test very long messages (should handle)
- [ ] Test rapid message sending (should queue)

## 5. Quick API Tests (curl)

```bash
# Test unauthenticated access (should return 401)
curl http://localhost:3000/api/checkin

# Test health of server
curl -I http://localhost:3000

# Test login page loads
curl -s http://localhost:3000/login | grep -o '<title>[^<]*'
```

## 6. Database Verification Queries

```sql
-- Check user profiles
SELECT id, full_name, current_streak, total_checkins
FROM user_profiles;

-- Check recent check-ins
SELECT date, mood_rating, energy_level, suggested_micro_goal
FROM user_emotional_context
ORDER BY date DESC
LIMIT 5;

-- Check goal completion rate
SELECT
  COUNT(*) FILTER (WHERE user_accepted_goal) as accepted,
  COUNT(*) FILTER (WHERE goal_completed) as completed
FROM user_emotional_context
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Check job applications
SELECT company_name, job_title, application_status
FROM job_applications
ORDER BY application_date DESC;
```

## 7. Expected Behavior Summary

| Feature | Behavior |
|---------|----------|
| First visit | Shows warm greeting, asks how you're feeling |
| Return visit (same day) | Acknowledges you already checked in |
| Streak display | Shows consecutive days of check-ins |
| Low mood detected | Suggests self-care goal, gentle tone |
| High energy detected | Suggests productive goal, enthusiastic tone |
| Burnout warning | Prioritizes rest, no job search goals |
| Goal accepted | Stored in database, shown in UI |
| Goal completed | Celebration message, stats updated |

---

**Ready to test?** Start the server with `npm run dev` and visit http://localhost:3000
