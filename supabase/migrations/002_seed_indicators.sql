-- ============================================================================
-- SIGNATURA 10-INDICATOR ASSESSMENT FRAMEWORK
-- Database Seeding Migration
-- ============================================================================
-- This framework applies to ALL professions and industries:
-- Healthcare, Education, Retail, Finance, Technology, and more.
-- ============================================================================

-- Clear existing data (for re-runs)
DELETE FROM sub_indicators;
DELETE FROM indicators;

-- ============================================================================
-- INDICATOR 1: Job Knowledge & Technical Skills
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(1, 'Job Knowledge & Technical Skills', 'Cognitive',
 'Depth of expertise in relevant domain, professional competencies, and tool proficiency. This includes field-specific knowledge whether medical procedures, teaching methods, financial modeling, or any other professional discipline.',
 'Skills assessments, work samples, certifications, demonstrated expertise, professional credentials',
 'Schmidt & Hunter (1998): job knowledge r=0.48 with performance across all job types');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 1), 'Domain Expertise',
 'Deep knowledge of field-specific concepts, practices, and standards (e.g., clinical protocols for nurses, curriculum standards for teachers, accounting principles for accountants)', 0.30),
((SELECT id FROM indicators WHERE number = 1), 'Professional Proficiency',
 'Mastery of core competencies required for the role (e.g., patient assessment, lesson planning, financial analysis)', 0.30),
((SELECT id FROM indicators WHERE number = 1), 'Tool/System Mastery',
 'Proficiency with relevant tools, systems, or technologies specific to the field (e.g., EHR systems, educational software, point-of-sale systems)', 0.25),
((SELECT id FROM indicators WHERE number = 1), 'Industry Knowledge',
 'Understanding of industry trends, regulations, and context (e.g., healthcare regulations, educational policy, market trends)', 0.15);

-- ============================================================================
-- INDICATOR 2: Problem-Solving & Critical Thinking
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(2, 'Problem-Solving & Critical Thinking', 'Cognitive',
 'Ability to analyze complex situations, identify root causes, and develop effective solutions. Applies across all fields from diagnosing patient conditions to resolving customer complaints to debugging systems.',
 'Case studies, situational questions, past problem resolution examples, decision-making scenarios',
 'Kuncel et al. (2004): GMA/reasoning r=0.51 with job performance across occupations');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 2), 'Analytical Reasoning',
 'Ability to break down complex problems systematically, whether analyzing patient symptoms, student performance data, or sales trends', 0.30),
((SELECT id FROM indicators WHERE number = 2), 'Creative Solutions',
 'Generating innovative approaches to challenges within professional constraints', 0.25),
((SELECT id FROM indicators WHERE number = 2), 'Decision Quality',
 'Making sound judgments with available information under time pressure or uncertainty', 0.25),
((SELECT id FROM indicators WHERE number = 2), 'Root Cause Analysis',
 'Identifying underlying issues rather than just treating symptoms', 0.20);

-- ============================================================================
-- INDICATOR 3: Communication & Articulation
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(3, 'Communication & Articulation', 'Interpersonal',
 'Clarity and effectiveness in verbal and written communication across diverse audiences. Essential whether explaining medical procedures to patients, teaching concepts to students, or presenting to stakeholders.',
 'Presentation skills, writing samples, interview clarity, stakeholder feedback, documentation quality',
 'Barrick & Mount (1991): communication skills predict team effectiveness across all industries');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 3), 'Verbal Clarity',
 'Speaking clearly and effectively in various settings (e.g., patient education, classroom instruction, sales conversations, team meetings)', 0.30),
((SELECT id FROM indicators WHERE number = 3), 'Written Communication',
 'Writing clearly, concisely, and professionally (e.g., medical documentation, lesson plans, reports, emails)', 0.25),
((SELECT id FROM indicators WHERE number = 3), 'Active Listening',
 'Understanding others fully, asking clarifying questions, and demonstrating comprehension', 0.25),
((SELECT id FROM indicators WHERE number = 3), 'Presentation Skills',
 'Engaging audiences and conveying information effectively in formal and informal settings', 0.20);

-- ============================================================================
-- INDICATOR 4: Social Skills & Interpersonal Ability
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(4, 'Social Skills & Interpersonal Ability', 'Interpersonal',
 'Effectiveness in building relationships, collaborating with others, and navigating social dynamics. Critical for patient care, classroom management, customer service, team collaboration, and leadership.',
 'Behavioral questions, peer feedback, teamwork examples, conflict resolution scenarios, customer/client interactions',
 'Van Scotter & Motowidlo (1996): interpersonal facilitation r=0.37 with contextual performance');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 4), 'Team Collaboration',
 'Working effectively with colleagues, whether in healthcare teams, teaching departments, store staff, or project teams', 0.30),
((SELECT id FROM indicators WHERE number = 4), 'Conflict Resolution',
 'Addressing disagreements constructively with patients, students, customers, or colleagues', 0.25),
((SELECT id FROM indicators WHERE number = 4), 'Empathy',
 'Understanding and responding to others'' emotions and perspectives appropriately', 0.25),
((SELECT id FROM indicators WHERE number = 4), 'Relationship Building',
 'Establishing trust and rapport with diverse stakeholders', 0.20);

-- ============================================================================
-- INDICATOR 5: Integrity & Ethical Standards
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(5, 'Integrity & Ethical Standards', 'Character',
 'Adherence to ethical principles, honesty, and accountability in professional conduct. Essential for maintaining trust whether in healthcare, education, finance, or any field with professional responsibilities.',
 'Reference checks, ethical dilemma scenarios, past conduct examples, value alignment assessments',
 'Ones et al. (1993): integrity tests r=0.41 with counterproductive behavior prevention');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 5), 'Honesty',
 'Truthfulness in all professional interactions and documentation', 0.30),
((SELECT id FROM indicators WHERE number = 5), 'Accountability',
 'Taking responsibility for actions and outcomes, admitting mistakes, following through on commitments', 0.30),
((SELECT id FROM indicators WHERE number = 5), 'Ethical Decision-Making',
 'Making choices that align with professional ethics and organizational values', 0.25),
((SELECT id FROM indicators WHERE number = 5), 'Transparency',
 'Being open about processes, decisions, and potential conflicts of interest', 0.15);

-- ============================================================================
-- INDICATOR 6: Adaptability & Flexibility
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(6, 'Adaptability & Flexibility', 'Character',
 'Ability to adjust to change, handle uncertainty, and remain effective under pressure. Crucial for emergency situations, changing regulations, new technologies, or shifting business conditions.',
 'Examples of pivots, stress tolerance demonstrations, open-mindedness evidence, change navigation stories',
 'Pulakos et al. (2000): adaptability predicts performance in dynamic environments across industries');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 6), 'Change Management',
 'Navigating and supporting transitions whether new protocols, curriculum changes, or organizational restructuring', 0.30),
((SELECT id FROM indicators WHERE number = 6), 'Resilience',
 'Bouncing back from setbacks, maintaining effectiveness under pressure', 0.25),
((SELECT id FROM indicators WHERE number = 6), 'Open-Mindedness',
 'Willingness to consider new ideas, methods, or perspectives', 0.25),
((SELECT id FROM indicators WHERE number = 6), 'Stress Tolerance',
 'Performing effectively in high-pressure situations without compromising quality', 0.20);

-- ============================================================================
-- INDICATOR 7: Learning Agility & Growth Mindset
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(7, 'Learning Agility & Growth Mindset', 'Cognitive',
 'Speed of learning new skills and openness to feedback and continuous professional development. Essential in every field as practices, technologies, and standards evolve.',
 'Learning examples, skill acquisition speed, feedback receptiveness, professional development activities',
 'De Rue et al. (2012): learning agility r=0.38 with leadership potential and career success');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 7), 'Knowledge Acquisition',
 'Quickly grasping new concepts, procedures, or information relevant to the role', 0.30),
((SELECT id FROM indicators WHERE number = 7), 'Skill Development',
 'Actively building new capabilities through training, practice, or experience', 0.25),
((SELECT id FROM indicators WHERE number = 7), 'Self-Awareness',
 'Understanding personal strengths and areas for improvement', 0.25),
((SELECT id FROM indicators WHERE number = 7), 'Feedback Receptiveness',
 'Seeking, accepting, and acting on constructive feedback from supervisors, peers, or clients', 0.20);

-- ============================================================================
-- INDICATOR 8: Leadership & Initiative
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(8, 'Leadership & Initiative', 'Interpersonal',
 'Ability to inspire, guide others, take ownership, and drive outcomes. Relevant at all levels from charge nurses to lead teachers to shift supervisors to project leads.',
 'Leadership examples, ownership demonstrations, influence stories, initiative-taking evidence',
 'Judge et al. (2002): transformational leadership r=0.44 with effectiveness across contexts');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 8), 'Vision Setting',
 'Articulating direction and inspiring others toward shared goals', 0.25),
((SELECT id FROM indicators WHERE number = 8), 'Team Motivation',
 'Encouraging and supporting colleagues to perform at their best', 0.25),
((SELECT id FROM indicators WHERE number = 8), 'Ownership',
 'Taking responsibility for outcomes and proactively addressing issues without being asked', 0.30),
((SELECT id FROM indicators WHERE number = 8), 'Strategic Thinking',
 'Considering long-term implications and aligning actions with broader objectives', 0.20);

-- ============================================================================
-- INDICATOR 9: Creativity & Innovation
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(9, 'Creativity & Innovation', 'Cognitive',
 'Capacity for original thinking, generating novel ideas, and challenging assumptions. Valuable in developing new teaching methods, improving patient care protocols, enhancing customer experiences, or solving unique problems.',
 'Innovation examples, novel solutions, creative problem-solving demonstrations, improvement initiatives',
 'Tierney & Farmer (2002): creative self-efficacy predicts creative performance across domains');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 9), 'Original Thinking',
 'Approaching problems from unique angles, seeing possibilities others miss', 0.30),
((SELECT id FROM indicators WHERE number = 9), 'Idea Generation',
 'Producing multiple potential solutions or improvements', 0.25),
((SELECT id FROM indicators WHERE number = 9), 'Risk-Taking',
 'Willingness to try new approaches despite uncertainty about outcomes', 0.25),
((SELECT id FROM indicators WHERE number = 9), 'Experimentation',
 'Testing ideas, learning from results, and iterating', 0.20);

-- ============================================================================
-- INDICATOR 10: Motivation & Drive
-- ============================================================================
INSERT INTO indicators (number, name, category, description, measurement_methods, research_support) VALUES
(10, 'Motivation & Drive', 'Character',
 'Internal motivation, persistence in pursuing goals, and commitment to professional excellence. Manifests as dedication to patient outcomes, student success, customer satisfaction, or project completion.',
 'Goal achievement examples, persistence stories, intrinsic motivation signals, long-term commitment evidence',
 'Barrick & Mount (1991): conscientiousness r=0.31 with performance across all job types');

INSERT INTO sub_indicators (indicator_id, name, description, weight) VALUES
((SELECT id FROM indicators WHERE number = 10), 'Goal Orientation',
 'Setting and pursuing meaningful professional objectives', 0.30),
((SELECT id FROM indicators WHERE number = 10), 'Persistence',
 'Continuing effort despite obstacles, setbacks, or slow progress', 0.30),
((SELECT id FROM indicators WHERE number = 10), 'Ambition',
 'Striving for growth, advancement, or excellence in chosen field', 0.20),
((SELECT id FROM indicators WHERE number = 10), 'Work Ethic',
 'Consistent effort and dedication to quality in daily work', 0.20);

-- ============================================================================
-- VERIFY SEEDING
-- ============================================================================
DO $$
DECLARE
  indicator_count INTEGER;
  sub_indicator_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO indicator_count FROM indicators;
  SELECT COUNT(*) INTO sub_indicator_count FROM sub_indicators;

  IF indicator_count != 10 THEN
    RAISE EXCEPTION 'Expected 10 indicators, got %', indicator_count;
  END IF;

  IF sub_indicator_count != 40 THEN
    RAISE EXCEPTION 'Expected 40 sub-indicators, got %', sub_indicator_count;
  END IF;

  RAISE NOTICE 'Successfully seeded % indicators and % sub-indicators', indicator_count, sub_indicator_count;
END $$;
