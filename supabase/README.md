# Supabase Configuration

## Local Development Setup

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Start local Supabase:
   ```bash
   supabase start
   ```

3. Apply migrations:
   ```bash
   supabase db reset
   ```

4. Generate TypeScript types:
   ```bash
   supabase gen types typescript --local > src/types/database.generated.ts
   ```

## Production Setup

1. Create a project at [supabase.com](https://supabase.com)

2. Get your credentials from Settings > API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Enable the required extensions in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "vector";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```

4. Run the migration:
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `migrations/001_emotional_core_schema.sql`
   - Execute

## Migration Files

- `001_emotional_core_schema.sql` - Core emotional intelligence tables
  - User emotional context (daily check-ins)
  - Companion conversations (memory system)
  - Companion personalization
  - Candidate visibility settings
  - Application follow-ups
  - Recruiter feedback quality
  - Job applications and CV versions

## Row Level Security

All tables have RLS enabled by default. Users can only access their own data.
See the migration file for specific policies.

## Database Philosophy

> "This is not a job search database. This is a companion relationship database."

Priority order:
1. Emotional context and memory
2. User empowerment and control
3. Communication and connection
4. Job search tools (as touchpoints)
