# Signatura - AI Career Companion

Signatura is not a job search tool. It's an AI companion that walks alongside job seekers during one of the loneliest, most uncertain times in their professional lives.

## Philosophy

> "The tools are just touchpoints. The relationship is everything."

Traditional job platforms treat job seekers as products to be sold to recruiters. Signatura flips this model by putting human dignity first. Every feature is designed around emotional intelligence, not just task completion.

### Core Principles

1. **Emotional Intelligence First** - Understand mood before offering advice
2. **Validation Before Optimization** - Acknowledge feelings before suggesting actions
3. **Energy-Aware Assistance** - Adapt to user's current capacity
4. **Burnout Prevention** - Actively detect and prevent over-application
5. **Celebration of Small Wins** - Every step forward matters

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL + pgvector)
- **Authentication**: Supabase Auth
- **AI**: OpenAI GPT-4
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + React Testing Library

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, signup)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── companion/     # Daily check-in & companion chat
│   │   ├── applications/  # Application tracker
│   │   ├── cv/           # CV optimization
│   │   ├── interview/    # Interview preparation
│   │   └── settings/     # User settings
│   └── api/              # API routes
├── components/
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── auth/             # Authentication components
│   ├── companion/        # Companion chat & presence
│   └── dashboard/        # Dashboard layout & nav
├── lib/
│   ├── ai/               # AI/Companion logic
│   │   ├── companion.ts  # Core companion functions
│   │   ├── prompts.ts    # Emotional intelligence prompts
│   │   ├── context.ts    # Context retrieval
│   │   └── memory.ts     # Conversation memory
│   ├── supabase/         # Supabase clients
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- OpenAI API key (optional for development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/signatura.git
cd signatura
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key  # Optional
USE_MOCK_AI=true  # Set to false when using real API
```

5. Run database migrations:
```bash
npx supabase db push
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Development

### Mock AI Mode

To save API costs during development, set `USE_MOCK_AI=true` in your environment. The companion will return contextually appropriate mock responses.

### Running Tests

```bash
npm run test
```

### Key Files

- `src/lib/ai/companion.ts` - Core companion logic with emotional detection
- `src/lib/ai/prompts.ts` - All emotional intelligence prompts
- `src/types/companion.ts` - Type definitions for companion interactions

## Architecture

### The Companion Model

Unlike traditional chatbots, Signatura's companion:

1. **Remembers context** - Knows your history, struggles, and wins
2. **Adapts to energy** - Suggests rest when you're exhausted
3. **Celebrates progress** - Every application sent is acknowledged
4. **Provides support** - Rejections are met with empathy, not advice

### Database Schema (4 Tiers)

1. **Emotional Foundation** - Daily check-ins, energy levels, streaks
2. **User Empowerment** - CVs, skills, goals with user control
3. **Dignified Communication** - Conversations with context and memory
4. **Job Search Tools** - Applications, companies, interviews

See `docs/database-schema-emotional-core.sql` for the complete schema.

## Documentation

- `docs/SIGNATURA_VISION.md` - Complete product vision and philosophy
- `docs/AI_PROMPTS_LIBRARY.md` - All emotional intelligence prompts
- `docs/database-schema-emotional-core.sql` - Database schema
- `docs/IMPLEMENTATION_LOG.md` - Development progress log

## Contributing

This project follows the principle of emotional intelligence first. When contributing:

1. Use "companion" terminology, never "assistant" or "chatbot"
2. Consider emotional impact before adding features
3. Validate feelings before optimizing workflows
4. Test for burnout detection and prevention

## License

Private - All rights reserved
