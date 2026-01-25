-- ============================================================================
-- SIGNATURA PHASE 3: ENHANCED 10-INDICATOR FRAMEWORK
-- Application-Centric Architecture
-- ============================================================================
-- This migration enhances the indicators with universal descriptions
-- and adds application-centric tables for the complete job journey.
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE INDICATORS TABLE SCHEMA
-- ============================================================================

-- Add category column if not exists
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('Cognitive', 'Interpersonal', 'Character'));

-- Ensure measurement_methods and research_support exist
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS measurement_methods TEXT;
ALTER TABLE indicators ADD COLUMN IF NOT EXISTS research_support TEXT;

-- ============================================================================
-- PART 2: ENHANCE SUB_INDICATORS TABLE SCHEMA
-- ============================================================================

-- Add weight column to sub_indicators
ALTER TABLE sub_indicators ADD COLUMN IF NOT EXISTS weight NUMERIC(4,2) DEFAULT 0.25;
ALTER TABLE sub_indicators ADD COLUMN IF NOT EXISTS name TEXT;

-- ============================================================================
-- PART 3: CLEAR AND RESEED INDICATORS WITH ENHANCED DATA
-- ============================================================================

-- Clear existing data
DELETE FROM sub_indicators;
DELETE FROM indicators;

-- Insert all 10 indicators with UNIVERSAL job seeker descriptions
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(1, 'Job Knowledge & Professional Competence', 'Cognitive',
'Depth of expertise in relevant domain, mastery of professional competencies, and proficiency with field-specific tools, methods, or technologies',
'Skills assessments, work samples, certifications, licenses, demonstrated expertise, portfolio review, practical demonstrations',
'Schmidt & Hunter (1998): job knowledge correlation r=0.48 with job performance across all occupations'),

(2, 'Problem-Solving & Critical Thinking', 'Cognitive',
'Ability to analyze complex situations, identify root causes, develop effective solutions, and make sound decisions under various constraints',
'Case studies, situational judgment tests, past problem resolution examples, decision-making scenarios, troubleshooting demonstrations',
'Kuncel et al. (2004): general mental ability/reasoning correlation r=0.51 with job performance across occupations'),

(3, 'Communication & Articulation', 'Interpersonal',
'Clarity and effectiveness in verbal and written communication across diverse audiences, contexts, and mediums; ability to listen actively and present information compellingly',
'Presentation skills evaluation, writing samples, interview clarity assessment, stakeholder feedback, customer communication reviews, public speaking demonstrations',
'Barrick & Mount (1991): communication skills predict team effectiveness and customer satisfaction across roles'),

(4, 'Social Skills & Interpersonal Ability', 'Interpersonal',
'Effectiveness in building relationships, collaborating with others, navigating social dynamics, demonstrating empathy, and working productively within teams or with clients/customers/patients',
'Behavioral interview questions, peer feedback, 360-degree reviews, teamwork examples, conflict resolution demonstrations, customer/patient satisfaction scores',
'Van Scotter & Motowidlo (1996): interpersonal facilitation correlation r=0.37 with contextual performance'),

(5, 'Integrity & Ethical Standards', 'Character',
'Adherence to ethical principles, honesty, accountability, and professional conduct; demonstrating trustworthiness and moral responsibility in decision-making and actions',
'Reference checks, behavioral integrity assessments, ethical dilemma scenarios, past conduct reviews, professional code adherence, value alignment discussions',
'Ones et al. (1993): integrity tests correlation r=0.41 with reduced counterproductive work behavior'),

(6, 'Adaptability & Flexibility', 'Character',
'Ability to adjust effectively to change, handle uncertainty and ambiguity, remain productive under pressure, and modify approaches based on evolving circumstances or new information',
'Change management examples, stress tolerance assessments, situational adaptability scenarios, demonstrations of pivoting strategies, resilience stories',
'Pulakos et al. (2000): adaptability predicts performance in dynamic, changing work environments'),

(7, 'Learning Agility & Growth Mindset', 'Cognitive',
'Speed and effectiveness of learning new skills, concepts, or procedures; openness to feedback and continuous professional development; capacity for self-reflection and improvement',
'Learning curve analysis, skill acquisition demonstrations, feedback receptiveness examples, professional development history, certification pursuit, self-improvement initiatives',
'De Rue et al. (2012): learning agility correlation r=0.38 with leadership potential'),

(8, 'Leadership & Initiative', 'Interpersonal',
'Ability to inspire and guide others, take ownership of outcomes, demonstrate proactive problem-solving, and drive results whether in formal leadership roles or as individual contributors',
'Leadership examples, ownership demonstrations, influence stories, initiative-taking instances, mentorship experiences, project management success',
'Judge et al. (2002): transformational leadership correlation r=0.44 with effectiveness'),

(9, 'Creativity & Innovation', 'Cognitive',
'Capacity for original thinking, generating novel ideas, challenging assumptions, and implementing creative solutions; willingness to experiment and take calculated risks',
'Innovation examples, creative problem-solving demonstrations, novel solutions developed, process improvements initiated, artistic/design portfolio, original contributions',
'Tierney & Farmer (2002): creative self-efficacy predicts creative performance'),

(10, 'Motivation & Drive', 'Character',
'Internal motivation, persistence in pursuing goals, commitment to excellence, work ethic, and sustained effort toward achievement despite obstacles or setbacks',
'Goal achievement track record, persistence examples, work ethic demonstrations, intrinsic motivation signals, long-term commitment patterns, performance consistency',
'Barrick & Mount (1991): conscientiousness (related to drive) correlation r=0.31 across all job types');

-- ============================================================================
-- PART 4: INSERT ALL 40 SUB-INDICATORS WITH WEIGHTS
-- ============================================================================

-- Sub-indicators for Indicator 1: Job Knowledge & Professional Competence
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(1, 'Domain Expertise',
'Deep knowledge of field-specific concepts, practices, standards, theories, or methodologies (medical procedures, teaching pedagogy, construction codes, financial regulations, software architecture)', 0.30),
(1, 'Professional Proficiency',
'Mastery of core competencies, techniques, and skills required for the role (patient care, lesson planning, sales techniques, coding, equipment operation, design principles)', 0.30),
(1, 'Tool/System Mastery',
'Proficiency with relevant tools, equipment, software, systems, or technologies (medical devices, educational platforms, POS systems, power tools, design software, programming languages)', 0.25),
(1, 'Industry Knowledge',
'Understanding of industry trends, regulations, standards, best practices, compliance requirements, and professional context', 0.15);

-- Sub-indicators for Indicator 2: Problem-Solving & Critical Thinking
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(2, 'Analytical Reasoning',
'Ability to break down complex problems systematically, identify patterns, evaluate options, and apply logical thinking to reach sound conclusions', 0.30),
(2, 'Creative Solutions',
'Generating innovative, practical approaches to challenges; thinking beyond standard procedures to find effective alternatives', 0.25),
(2, 'Decision Quality',
'Making sound, timely judgments with available information; weighing trade-offs, considering consequences, and choosing appropriate courses of action', 0.25),
(2, 'Root Cause Analysis',
'Identifying underlying issues rather than just treating symptoms; understanding systemic factors and preventing recurrence', 0.20);

-- Sub-indicators for Indicator 3: Communication & Articulation
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(3, 'Verbal Clarity',
'Speaking clearly, articulately, and effectively in various settings (one-on-one, meetings, presentations, customer interactions, teaching, public speaking)', 0.30),
(3, 'Written Communication',
'Writing clearly, concisely, and professionally across formats (emails, reports, documentation, proposals, patient notes, lesson plans, technical docs)', 0.25),
(3, 'Active Listening',
'Understanding others perspectives, asking clarifying questions, demonstrating comprehension, responding appropriately to verbal and non-verbal cues', 0.25),
(3, 'Presentation Skills',
'Engaging audiences, conveying information effectively, adapting communication style to audience, using appropriate visual aids or demonstrations', 0.20);

-- Sub-indicators for Indicator 4: Social Skills & Interpersonal Ability
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(4, 'Team Collaboration',
'Working effectively with colleagues, contributing to team goals, supporting others, sharing knowledge, coordinating with diverse stakeholders', 0.30),
(4, 'Conflict Resolution',
'Addressing disagreements constructively, finding common ground, de-escalating tensions, mediating disputes, maintaining professional relationships despite differences', 0.25),
(4, 'Empathy & Emotional Intelligence',
'Understanding others feelings and perspectives, responding with compassion, recognizing emotional cues, adapting approach based on others needs (patients, students, customers, colleagues)', 0.25),
(4, 'Relationship Building',
'Establishing trust, maintaining professional networks, creating positive rapport, cultivating long-term connections with clients, partners, or community members', 0.20);

-- Sub-indicators for Indicator 5: Integrity & Ethical Standards
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(5, 'Honesty & Truthfulness',
'Being truthful in communications, admitting mistakes, representing information accurately, avoiding deception or misrepresentation', 0.30),
(5, 'Accountability & Responsibility',
'Taking ownership of actions and outcomes, following through on commitments, accepting consequences, fulfilling professional duties reliably', 0.25),
(5, 'Ethical Decision-Making',
'Making choices aligned with professional codes, organizational values, and moral principles; considering stakeholder impact; refusing to compromise ethical standards', 0.25),
(5, 'Transparency & Fairness',
'Operating with openness, treating people equitably, avoiding bias or favoritism, maintaining confidentiality when appropriate, disclosing conflicts of interest', 0.20);

-- Sub-indicators for Indicator 6: Adaptability & Flexibility
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(6, 'Change Management',
'Embracing new processes, technologies, or organizational changes; helping others through transitions; maintaining effectiveness during periods of change', 0.30),
(6, 'Resilience & Stress Tolerance',
'Maintaining composure and performance under pressure, recovering from setbacks, managing high-stress situations (emergencies, deadlines, customer crises)', 0.25),
(6, 'Open-Mindedness',
'Considering alternative viewpoints, receptiveness to different approaches, willingness to modify opinions based on new evidence, avoiding rigid thinking', 0.25),
(6, 'Situational Flexibility',
'Adjusting communication style, work methods, or priorities based on context; handling diverse tasks; responding effectively to unexpected situations', 0.20);

-- Sub-indicators for Indicator 7: Learning Agility & Growth Mindset
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(7, 'Knowledge Acquisition',
'Quickly grasping new concepts, procedures, or information; ability to learn from experience, training, or self-study; transferring learning across contexts', 0.30),
(7, 'Skill Development',
'Building new competencies, mastering new techniques or tools, pursuing relevant certifications or training, expanding professional capabilities', 0.25),
(7, 'Self-Awareness & Reflection',
'Understanding personal strengths and development areas, recognizing blind spots, seeking growth opportunities, honest self-assessment', 0.25),
(7, 'Feedback Receptiveness',
'Actively seeking feedback, accepting constructive criticism gracefully, applying suggestions for improvement, viewing feedback as opportunity rather than criticism', 0.20);

-- Sub-indicators for Indicator 8: Leadership & Initiative
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(8, 'Vision & Direction Setting',
'Articulating clear goals, creating shared purpose, providing strategic direction, aligning team/project efforts toward meaningful objectives', 0.30),
(8, 'Team Motivation & Development',
'Inspiring others, recognizing contributions, developing peoples capabilities, creating positive culture, providing mentorship or coaching, building confidence', 0.25),
(8, 'Ownership & Accountability',
'Taking responsibility for results, driving projects to completion, going beyond assigned duties, ensuring follow-through, accepting accountability for team outcomes', 0.25),
(8, 'Strategic Thinking & Influence',
'Seeing big picture, anticipating challenges, persuading others, building coalitions, making decisions that balance short and long-term priorities', 0.20);

-- Sub-indicators for Indicator 9: Creativity & Innovation
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(9, 'Original Thinking',
'Generating unique ideas, approaching problems from fresh perspectives, connecting disparate concepts, thinking beyond conventional solutions', 0.30),
(9, 'Idea Generation & Development',
'Producing multiple potential solutions, refining concepts into actionable plans, brainstorming effectively, contributing creative suggestions', 0.25),
(9, 'Risk-Taking & Experimentation',
'Trying new approaches, testing hypotheses, learning from failures, challenging status quo, proposing unconventional methods when appropriate', 0.25),
(9, 'Implementation of Innovations',
'Turning creative ideas into practical reality, improving processes, developing new methods, introducing beneficial changes, making innovations stick', 0.20);

-- Sub-indicators for Indicator 10: Motivation & Drive
INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(10, 'Goal Orientation & Achievement',
'Setting ambitious yet realistic goals, maintaining focus on objectives, tracking progress, celebrating milestones, driving toward tangible results', 0.30),
(10, 'Persistence & Perseverance',
'Continuing efforts despite challenges, overcoming obstacles, maintaining commitment when faced with setbacks, showing tenacity and determination', 0.25),
(10, 'Ambition & Career Investment',
'Seeking advancement opportunities, pursuing professional growth, investing in career development, aspiring to higher levels of contribution and responsibility', 0.25),
(10, 'Work Ethic & Reliability',
'Demonstrating consistent effort, meeting deadlines, showing up prepared, maintaining quality standards, taking work seriously, being dependable', 0.20);

-- ============================================================================
-- PART 5: APPLICATION-CENTRIC SCHEMA UPDATES
-- ============================================================================

-- Update job_applications table
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS cv_version_id UUID REFERENCES cv_versions(id);
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS excitement_level INTEGER CHECK (excitement_level BETWEEN 1 AND 10);
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low'));
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS industry TEXT;

-- Update cv_versions table for application linking
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES job_applications(id);
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS base_cv_id UUID REFERENCES cv_versions(id);
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS indicator_scores_before JSONB;
ALTER TABLE cv_versions ADD COLUMN IF NOT EXISTS indicator_scores_after JSONB;

-- ============================================================================
-- PART 6: CREATE COMPENSATION_NEGOTIATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS compensation_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,

  -- Offer details
  base_salary DECIMAL(12,2),
  bonus_structure JSONB,
  equity JSONB,
  benefits JSONB,
  other_compensation JSONB,

  -- Market analysis
  market_data JSONB,
  total_comp_value DECIMAL(12,2),
  market_comparison TEXT CHECK (market_comparison IN ('below_market', 'at_market', 'above_market')),
  market_percentile INTEGER CHECK (market_percentile BETWEEN 0 AND 100),

  -- Negotiation strategy
  strategy TEXT,
  talking_points JSONB,
  scripts JSONB,
  counter_offers JSONB DEFAULT '[]',

  -- Status
  status TEXT CHECK (status IN ('analyzing', 'preparing', 'negotiating', 'accepted', 'declined')) DEFAULT 'analyzing',

  -- Companion support
  companion_guidance TEXT,
  confidence_boost_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 7: CREATE CONTRACT_REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE NOT NULL,

  -- Contract document
  contract_url TEXT,
  contract_text TEXT,
  contract_type TEXT CHECK (contract_type IN ('employment', 'contractor', 'consulting', 'offer_letter', 'other')),

  -- Analysis results
  risk_assessment JSONB,
  clause_analysis JSONB DEFAULT '[]',
  key_terms JSONB,
  red_flags JSONB DEFAULT '[]',

  -- Recommendations
  negotiation_points TEXT[],
  questions_to_ask TEXT[],
  attorney_recommended BOOLEAN DEFAULT false,
  attorney_recommended_reason TEXT,

  -- Status
  status TEXT CHECK (status IN ('uploaded', 'analyzing', 'reviewed', 'signed')) DEFAULT 'uploaded',

  -- Companion support
  companion_summary TEXT,
  plain_language_explanation TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 8: UPDATE INTERVIEW_SESSIONS FOR APPLICATION-CENTRIC
-- ============================================================================

-- Add missing columns to interview_sessions if needed
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS interviewer_persona TEXT CHECK (interviewer_persona IN ('friendly', 'skeptical', 'technical_expert', 'behavioral', 'panel'));
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS overall_score DECIMAL(3,1);
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS indicator_scores JSONB;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS strengths TEXT[];
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS improvements TEXT[];
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS transcript TEXT;

-- ============================================================================
-- PART 9: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE compensation_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_reviews ENABLE ROW LEVEL SECURITY;

-- Compensation negotiations policies
DROP POLICY IF EXISTS "Users can view own negotiations" ON compensation_negotiations;
DROP POLICY IF EXISTS "Users can insert own negotiations" ON compensation_negotiations;
DROP POLICY IF EXISTS "Users can update own negotiations" ON compensation_negotiations;
DROP POLICY IF EXISTS "Users can delete own negotiations" ON compensation_negotiations;

CREATE POLICY "Users can view own negotiations" ON compensation_negotiations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own negotiations" ON compensation_negotiations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own negotiations" ON compensation_negotiations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own negotiations" ON compensation_negotiations FOR DELETE USING (auth.uid() = user_id);

-- Contract reviews policies
DROP POLICY IF EXISTS "Users can view own contract reviews" ON contract_reviews;
DROP POLICY IF EXISTS "Users can insert own contract reviews" ON contract_reviews;
DROP POLICY IF EXISTS "Users can update own contract reviews" ON contract_reviews;
DROP POLICY IF EXISTS "Users can delete own contract reviews" ON contract_reviews;

CREATE POLICY "Users can view own contract reviews" ON contract_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contract reviews" ON contract_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contract reviews" ON contract_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contract reviews" ON contract_reviews FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 10: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_compensation_negotiations_user ON compensation_negotiations(user_id);
CREATE INDEX IF NOT EXISTS idx_compensation_negotiations_application ON compensation_negotiations(application_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_user ON contract_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_reviews_application ON contract_reviews(application_id);
CREATE INDEX IF NOT EXISTS idx_indicators_category ON indicators(category);
CREATE INDEX IF NOT EXISTS idx_sub_indicators_indicator ON sub_indicators(indicator_number);

-- ============================================================================
-- PART 11: TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Create the handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON compensation_negotiations;
DROP TRIGGER IF EXISTS set_updated_at ON contract_reviews;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON compensation_negotiations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contract_reviews
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Indicators: ' || COUNT(*) FROM indicators;
SELECT 'Sub-indicators: ' || COUNT(*) FROM sub_indicators;
SELECT 'Categories: ' || string_agg(DISTINCT category, ', ') FROM indicators;
