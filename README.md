# Signatura

**AI Career Companion** - Making job seekers feel less alone.

## What Is Signatura?

Signatura is **not** a job search tool suite. It's an AI companion that walks alongside someone during one of the loneliest, most uncertain times in their professional life.

The tools (CV optimization, interview coaching, salary negotiation, contract review) are **touchpoints**—conversation starters that let the companion build trust, provide support, and combat the isolation of job searching.

> "Every line of code should ask: Does this make the user feel less alone?"

## Core Philosophy

### The Problem We Solve

**Primary (90% of the value):** Loneliness and uncertainty during job search
- Feeling alone in the process
- Not knowing if you're doing things right
- Self-doubt and anxiety
- Burnout from rejections
- No one to celebrate small wins with

**Secondary (10%):** Suboptimal CVs, poor interview prep, weak salary negotiation

### The Approach

| What People Think | What Signatura Actually Is |
|-------------------|----------------------------|
| CV optimization tool | A companion that helps with CVs |
| Interview prep app | A supportive partner for practice |
| Job board with AI | A friend that finds opportunities and celebrates applications |

## Architecture Principles

### 1. Emotional Intelligence First
- Validation before advice
- Specific recognition over generic praise
- Memory and context from past conversations
- Burnout detection and rest encouragement

### 2. Candidate-Controlled Visibility
- "YOU decide when you're ready to be discovered"
- Granular privacy controls
- Age-blind CV processing
- Anonymization options

### 3. Meaningful Communication
- Follow-up email generation at every stage
- Tracking to combat "did they even see it?" anxiety
- Professional, non-desperate language

### 4. Recruiter Accountability
- Rejections MUST include specific, actionable feedback
- Indicator-based feedback (10 dimensions)
- Recruiter quality tracking

## The 10-Indicator Framework

1. Job Knowledge & Technical Skills
2. Problem-Solving & Critical Thinking
3. Communication & Articulation
4. Social Skills & Interpersonal Ability
5. Integrity & Ethical Standards
6. Adaptability & Flexibility
7. Learning Agility & Growth Mindset
8. Leadership & Initiative
9. Creativity & Innovation
10. Motivation & Drive

## Project Structure

```
signatura/
├── docs/
│   ├── SIGNATURA_VISION.md          # Full architecture vision
│   ├── AI_PROMPTS_LIBRARY.md        # AI prompt collection
│   └── database-schema-emotional-core.sql  # Database schema
├── src/                              # Application source (TBD)
├── tests/                            # Test suite (TBD)
└── README.md
```

## Documentation

- **[Vision Document](docs/SIGNATURA_VISION.md)** - Complete architecture and philosophy
- **[AI Prompts Library](docs/AI_PROMPTS_LIBRARY.md)** - Emotional intelligence prompt collection
- **[Database Schema](docs/database-schema-emotional-core.sql)** - Emotional core database design

## Tech Stack (Planned)

- **Frontend:** Next.js with TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Claude API for companion interactions
- **Vector Search:** pgvector for conversation memory
- **Deployment:** Vercel

## Development Phases

| Phase | Focus | Goal |
|-------|-------|------|
| 1 | Companion Foundation | AI companion relationship established |
| 2 | Candidate Empowerment | Visibility controls, follow-up system |
| 3 | Job Search Tools | CV, Interview, Compensation, Contract |
| 4 | Recruiter Accountability | Forced feedback, quality tracking |
| 5 | Advanced Features | Burnout prediction, proactive support |

## Success Metrics

**Primary (Companion Relationship):**
- Daily check-in engagement: 70%+
- Mood improvement over 4 weeks: +2 points average
- Micro-goal completion: 60%+

**Secondary (Tool Usage):**
- Follow-up send rate: 40%+
- Talent pool opt-in: 30%+
- Session completion: 80%+

## Contributing

This project is in early development. See the vision document for architectural guidelines.

## License

TBD

---

*"This is not a job search app with AI features. This is an AI companion with job search tools. The difference is everything."*
