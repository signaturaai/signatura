-- ============================================================================
-- SIGNATURA 10-INDICATOR FRAMEWORK - COMPLETE IMPLEMENTATION
-- 70 Sub-Indicators as per Authoritative Specification
-- ============================================================================
-- This migration ensures ALL indicators and sub-indicators are present
-- with the correct names, descriptions, and display orders.
--
-- TOTAL: 10 Indicators, 70 Sub-Indicators
--   - Indicators 1-7: 5 sub-indicators each (35)
--   - Indicator 8: 12 sub-indicators (Leadership & Initiative)
--   - Indicator 9: 8 sub-indicators (Creativity & Innovation)
--   - Indicator 10: 15 sub-indicators (Motivation & Drive)
-- ============================================================================

-- ============================================================================
-- STEP 1: CLEAR EXISTING DATA (to avoid duplicates)
-- ============================================================================

DELETE FROM sub_indicators;
DELETE FROM indicators;

-- ============================================================================
-- STEP 2: INSERT ALL 10 INDICATORS
-- ============================================================================

INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(1, 'Job Knowledge & Professional Competence', 'Cognitive',
'Deep understanding of field-specific principles, theories, and practices. Includes domain expertise, technical skills, tool mastery, industry awareness, and commitment to continuous learning.',
'Skills assessments, work samples, certifications, licenses, demonstrated expertise, portfolio review, practical demonstrations',
'Schmidt & Hunter (1998): job knowledge r=0.48 with performance across all job types'),

(2, 'Problem-Solving & Critical Thinking', 'Cognitive',
'Breaking down complex problems, making well-reasoned decisions, strategic thinking, identifying root causes, and developing innovative solutions.',
'Case studies, situational judgment tests, past problem resolution examples, decision-making scenarios, troubleshooting demonstrations',
'Kuncel et al. (2004): GMA/reasoning r=0.51 with job performance across occupations'),

(3, 'Communication & Articulation', 'Interpersonal',
'Speaking, writing, and listening effectively across all contexts. Includes verbal clarity, written communication, active listening, presentation skills, and cross-cultural communication.',
'Presentation skills evaluation, writing samples, interview clarity assessment, stakeholder feedback, customer communication reviews',
'Barrick & Mount (1991): communication skills predict team effectiveness across all industries'),

(4, 'Social Skills & Interpersonal Ability', 'Interpersonal',
'Working effectively with others and building strong relationships. Includes team collaboration, conflict resolution, empathy, networking, and customer/client focus.',
'Behavioral interview questions, peer feedback, 360-degree reviews, teamwork examples, customer satisfaction scores',
'Van Scotter & Motowidlo (1996): interpersonal facilitation r=0.37 with contextual performance'),

(5, 'Integrity & Ethical Standards', 'Character',
'Being truthful, fair, and ethical in all professional interactions. Includes honesty, confidentiality, accountability, fairness, and ethical decision-making.',
'Reference checks, behavioral integrity assessments, ethical dilemma scenarios, professional code adherence',
'Ones et al. (1993): integrity tests r=0.41 with counterproductive behavior prevention'),

(6, 'Adaptability & Flexibility', 'Character',
'Openness to change and maintaining effectiveness under varying conditions. Includes embracing change, resilience, multitasking, learning new skills, and cross-functional adaptability.',
'Change management examples, stress tolerance assessments, situational adaptability scenarios, resilience demonstrations',
'Pulakos et al. (2000): adaptability predicts performance in dynamic environments across industries'),

(7, 'Learning Agility & Growth Mindset', 'Cognitive',
'Seeking feedback and continuously improving performance. Includes self-reflection, continuous improvement, intellectual curiosity, resourcefulness, and application of learning.',
'Learning curve analysis, skill acquisition demonstrations, feedback receptiveness, professional development history',
'De Rue et al. (2012): learning agility r=0.38 with leadership potential and career success'),

(8, 'Leadership & Initiative', 'Interpersonal',
'Taking ownership, inspiring others, and driving results. Includes goal setting, team development, accountability, strategic thinking, delegation, conflict resolution, change management, and mentorship.',
'Leadership examples, ownership demonstrations, influence stories, initiative-taking instances, mentorship experiences',
'Judge et al. (2002): transformational leadership r=0.44 with effectiveness across contexts'),

(9, 'Creativity & Innovation', 'Cognitive',
'Generating unique ideas and implementing beneficial changes. Includes original thinking, experimentation, design thinking, divergent/convergent thinking, and trend spotting.',
'Innovation examples, creative problem-solving demonstrations, novel solutions, process improvements, original contributions',
'Tierney & Farmer (2002): creative self-efficacy predicts creative performance across domains'),

(10, 'Motivation & Drive', 'Character',
'Taking initiative and maintaining high standards of excellence. Includes proactiveness, persistence, achievement orientation, work ethic, self-motivation, and drive for impact.',
'Goal achievement track record, persistence examples, work ethic demonstrations, performance consistency, commitment patterns',
'Barrick & Mount (1991): conscientiousness r=0.31 with performance across all job types');

-- ============================================================================
-- STEP 3: INSERT ALL 70 SUB-INDICATORS
-- ============================================================================

-- ============================================================================
-- Indicator 1: Job Knowledge & Professional Competence (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(1, 'Domain Expertise',
'Deep understanding of field-specific principles, theories, and practices', 0.25),
(1, 'Technical Skills',
'Proficiency in specialized skills required for the role (e.g., programming languages, surgical techniques, financial modeling)', 0.25),
(1, 'Tool/System Mastery',
'Proficiency with relevant tools, equipment, software, systems, or technologies (medical devices, educational platforms, POS systems, power tools, design software, programming languages)', 0.20),
(1, 'Industry Awareness',
'Knowledge of industry trends, market dynamics, regulatory environment, and competitive landscape', 0.15),
(1, 'Continuous Learning',
'Staying updated with new developments, best practices, and advancements in the field', 0.15);

-- ============================================================================
-- Indicator 2: Problem-Solving & Critical Thinking (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(2, 'Analytical Skills',
'Breaking down complex problems, gathering and interpreting data, identifying patterns and anomalies', 0.25),
(2, 'Decision Making',
'Making timely, well-reasoned choices, considering various factors and potential consequences', 0.25),
(2, 'Strategic Thinking',
'Identifying long-term implications, aligning solutions with broader organizational goals, anticipating future challenges', 0.20),
(2, 'Root Cause Analysis',
'Identifying underlying issues rather than just treating symptoms; understanding systemic factors and preventing recurrence', 0.15),
(2, 'Innovative Solutions',
'Developing creative or unconventional approaches to problems, thinking outside the box', 0.15);

-- ============================================================================
-- Indicator 3: Communication & Articulation (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(3, 'Verbal Communication',
'Speaking clearly, concisely, and persuasively; adjusting message to audience', 0.25),
(3, 'Written Communication',
'Writing clearly, concisely, and professionally across formats (emails, reports, documentation, proposals, patient notes, lesson plans, technical docs)', 0.25),
(3, 'Active Listening',
'Understanding others'' perspectives, asking clarifying questions, demonstrating comprehension, responding appropriately to verbal and non-verbal cues', 0.20),
(3, 'Presentation Skills',
'Engaging audiences, conveying information effectively, adapting communication style to audience, using appropriate visual aids or demonstrations', 0.15),
(3, 'Cross-Cultural Communication',
'Communicating effectively with diverse cultural backgrounds; understanding nuances and adapting communication style', 0.15);

-- ============================================================================
-- Indicator 4: Social Skills & Interpersonal Ability (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(4, 'Team Collaboration',
'Working effectively with colleagues, contributing to team goals, supporting others, sharing knowledge, coordinating with diverse stakeholders', 0.25),
(4, 'Conflict Resolution',
'Addressing disagreements constructively, finding common ground, de-escalating tensions, mediating disputes, maintaining professional relationships despite differences', 0.20),
(4, 'Empathy & Emotional Intelligence',
'Understanding others'' feelings and perspectives, responding with compassion, recognizing emotional cues, adapting approach based on others'' needs (patients, students, customers, colleagues)', 0.20),
(4, 'Networking & Relationship Building',
'Establishing and maintaining positive professional relationships with peers, clients, stakeholders, and external partners', 0.20),
(4, 'Customer/Client Focus',
'Understanding and addressing client needs, providing excellent service, building rapport, and ensuring satisfaction', 0.15);

-- ============================================================================
-- Indicator 5: Integrity & Ethical Standards (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(5, 'Honesty & Transparency',
'Being truthful and open in all interactions; maintaining sincerity and avoiding deception', 0.25),
(5, 'Confidentiality',
'Protecting sensitive information, adhering to privacy policies, maintaining discretion', 0.20),
(5, 'Accountability',
'Taking responsibility for actions, admitting mistakes, and learning from them', 0.20),
(5, 'Fairness & Respect',
'Treating all individuals equitably, upholding principles of justice, showing consideration for diverse viewpoints', 0.20),
(5, 'Ethical Decision Making',
'Consistently applying moral principles and professional codes of conduct to guide choices', 0.15);

-- ============================================================================
-- Indicator 6: Adaptability & Flexibility (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(6, 'Embracing Change',
'Openness to new ideas, methods, and technologies; willingness to adjust to evolving circumstances', 0.25),
(6, 'Resilience',
'Maintaining composure and effectiveness under pressure or in the face of setbacks; bouncing back from adversity', 0.25),
(6, 'Multitasking & Prioritization',
'Managing multiple tasks efficiently, adjusting priorities as needed, and handling interruptions gracefully', 0.20),
(6, 'Learning New Skills',
'Quickly acquiring new knowledge or competencies as required by changing roles or environments', 0.15),
(6, 'Cross-Functional Adaptability',
'Successfully transitioning between different roles, teams, or projects; applying skills in varied contexts', 0.15);

-- ============================================================================
-- Indicator 7: Learning Agility & Growth Mindset (5 sub-indicators)
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(7, 'Self-Reflection & Feedback Integration',
'Seeking feedback, reflecting on performance, and incorporating insights for personal and professional development', 0.25),
(7, 'Continuous Improvement',
'Proactively identifying areas for growth, pursuing new learning opportunities, and refining skills', 0.25),
(7, 'Intellectual Curiosity',
'Demonstrating a genuine desire to learn, explore new ideas, and understand complex concepts', 0.20),
(7, 'Resourcefulness',
'Finding creative ways to acquire knowledge or solve problems when faced with limited resources', 0.15),
(7, 'Application of Learning',
'Effectively translating new knowledge or skills into improved performance and tangible results', 0.15);

-- ============================================================================
-- Indicator 8: Leadership & Initiative (12 sub-indicators) - EXPANDED
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(8, 'Goal Setting & Vision',
'Defining clear objectives, inspiring others towards a shared vision, providing direction', 0.10),
(8, 'Team Motivation & Development',
'Inspiring others, recognizing contributions, developing people''s capabilities, creating positive culture, providing mentorship or coaching, building confidence', 0.10),
(8, 'Ownership & Accountability',
'Taking responsibility for results, driving projects to completion, going beyond assigned duties, ensuring follow-through, accepting accountability for team outcomes', 0.10),
(8, 'Strategic Thinking & Influence',
'Seeing big picture, anticipating challenges, persuading others, building coalitions, making decisions that balance short and long-term priorities', 0.10),
(8, 'Delegating & Empowering',
'Effectively assigning tasks, trusting team members, fostering autonomy, providing necessary support', 0.08),
(8, 'Conflict Resolution (Leadership)',
'Mediating disputes within teams, addressing interpersonal issues, fostering healthy team dynamics', 0.08),
(8, 'Change Management',
'Guiding teams through transitions, communicating rationale for change, ensuring smooth adoption', 0.08),
(8, 'Performance Management',
'Setting clear expectations, providing regular feedback, conducting reviews, addressing performance issues constructively', 0.08),
(8, 'Crisis Management',
'Remaining calm and effective during emergencies, making critical decisions under pressure, coordinating rapid response', 0.08),
(8, 'Mentorship & Coaching',
'Guiding and developing less experienced team members, sharing knowledge, fostering their growth', 0.08),
(8, 'Decisiveness',
'Making firm decisions in a timely manner, even with incomplete information', 0.06),
(8, 'Problem Anticipation',
'Identifying potential issues before they arise, proactively developing mitigation strategies', 0.06);

-- ============================================================================
-- Indicator 9: Creativity & Innovation (8 sub-indicators) - EXPANDED
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(9, 'Original Thinking',
'Generating unique ideas, approaches, or solutions not previously considered', 0.15),
(9, 'Experimentation & Risk-Taking',
'Willingness to try new methods, embrace ambiguity, and learn from failures', 0.15),
(9, 'Design Thinking',
'Applying a human-centered approach to problem-solving, focusing on user needs and iterative development', 0.15),
(9, 'Implementation of Innovations',
'Turning creative ideas into practical reality, improving processes, developing new methods, introducing beneficial changes, making innovations stick', 0.15),
(9, 'Divergent Thinking',
'Exploring multiple possibilities and perspectives without premature judgment', 0.10),
(9, 'Convergent Thinking',
'Systematically evaluating ideas to identify the most viable solution', 0.10),
(9, 'Resource Optimization',
'Creative use of existing resources to achieve desired outcomes', 0.10),
(9, 'Trend Spotting',
'Identifying emerging patterns or shifts that could lead to new opportunities or challenges', 0.10);

-- ============================================================================
-- Indicator 10: Motivation & Drive (15 sub-indicators) - EXPANDED
-- ============================================================================

INSERT INTO sub_indicators (indicator_number, name, description, weight) VALUES
(10, 'Proactiveness & Initiative',
'Taking action without explicit direction, seeking out new opportunities, anticipating needs', 0.08),
(10, 'Persistence & Perseverance',
'Continuing efforts despite challenges, overcoming obstacles, maintaining commitment when faced with setbacks, showing tenacity and determination', 0.08),
(10, 'Achievement Orientation',
'Setting high standards, striving for excellence, continuously seeking to exceed expectations', 0.08),
(10, 'Work Ethic & Reliability',
'Demonstrating consistent effort, meeting deadlines, showing up prepared, maintaining quality standards, taking work seriously, being dependable', 0.08),
(10, 'Self-Motivation',
'Driving oneself to accomplish tasks and goals, even when external motivation is low', 0.08),
(10, 'Enthusiasm & Engagement',
'Displaying a positive attitude, genuine interest, and active involvement in work', 0.07),
(10, 'Commitment to Quality',
'Ensuring high standards in all outputs, paying attention to detail, delivering polished work', 0.07),
(10, 'Goal Orientation',
'Focusing efforts on achieving specific, measurable objectives', 0.07),
(10, 'Resilience to Failure',
'Viewing setbacks as learning opportunities, maintaining a positive outlook after failure', 0.07),
(10, 'Professionalism',
'Exhibiting appropriate conduct, demeanor, and appearance in the workplace', 0.06),
(10, 'Time Management',
'Organizing tasks and priorities effectively to meet deadlines and optimize productivity', 0.06),
(10, 'Self-Development',
'Actively seeking opportunities for personal and professional growth, investing in new skills', 0.06),
(10, 'Passion for the Mission',
'Demonstrating alignment with and enthusiasm for the organization''s goals', 0.05),
(10, 'Adaptability to Feedback',
'Openness to constructive criticism and willingness to adjust behavior or approaches based on it', 0.05),
(10, 'Drive for Impact',
'Desire to make a meaningful contribution and see the tangible results of one''s work', 0.04);

-- ============================================================================
-- STEP 4: ADD DISPLAY ORDER TO SUB-INDICATORS
-- ============================================================================

-- Add display_order column if it doesn't exist
ALTER TABLE sub_indicators ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update display orders for each indicator's sub-indicators
DO $$
DECLARE
    indicator_num INTEGER;
    sub_record RECORD;
    counter INTEGER;
BEGIN
    FOR indicator_num IN 1..10 LOOP
        counter := 1;
        FOR sub_record IN
            SELECT id FROM sub_indicators
            WHERE indicator_number = indicator_num
            ORDER BY id
        LOOP
            UPDATE sub_indicators
            SET display_order = counter
            WHERE id = sub_record.id;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 5: VERIFY COUNTS
-- ============================================================================

-- This will output verification results
SELECT
  i.number as indicator_number,
  i.name as indicator_name,
  COUNT(si.id) as sub_indicator_count
FROM indicators i
LEFT JOIN sub_indicators si ON si.indicator_number = i.number
GROUP BY i.number, i.name
ORDER BY i.number;

-- Expected output:
-- 1  | Job Knowledge & Professional Competence    | 5
-- 2  | Problem-Solving & Critical Thinking        | 5
-- 3  | Communication & Articulation               | 5
-- 4  | Social Skills & Interpersonal Ability      | 5
-- 5  | Integrity & Ethical Standards              | 5
-- 6  | Adaptability & Flexibility                 | 5
-- 7  | Learning Agility & Growth Mindset          | 5
-- 8  | Leadership & Initiative                    | 12
-- 9  | Creativity & Innovation                    | 8
-- 10 | Motivation & Drive                         | 15
-- TOTAL: 70 sub-indicators

-- Final count verification
SELECT 'Total Indicators: ' || COUNT(*) FROM indicators;
SELECT 'Total Sub-Indicators: ' || COUNT(*) FROM sub_indicators;
