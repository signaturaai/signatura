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
-- INSERT ALL 10 INDICATORS
-- ============================================================================

INSERT INTO indicators (number, name, description, measurement_methods, research_support) VALUES
(1, 'Job Knowledge & Technical Skills',
 'Depth of expertise in relevant domain, professional competencies, and tool proficiency. This includes field-specific knowledge whether medical procedures, teaching methods, financial modeling, or any other professional discipline.',
 'Skills assessments, work samples, certifications, demonstrated expertise, professional credentials',
 'Schmidt & Hunter (1998): job knowledge r=0.48 with performance across all job types'),

(2, 'Problem-Solving & Critical Thinking',
 'Ability to analyze complex situations, identify root causes, and develop effective solutions. Applies across all fields from diagnosing patient conditions to resolving customer complaints to debugging systems.',
 'Case studies, situational questions, past problem resolution examples, decision-making scenarios',
 'Kuncel et al. (2004): GMA/reasoning r=0.51 with job performance across occupations'),

(3, 'Communication & Articulation',
 'Clarity and effectiveness in verbal and written communication across diverse audiences. Essential whether explaining medical procedures to patients, teaching concepts to students, or presenting to stakeholders.',
 'Presentation skills, writing samples, interview clarity, stakeholder feedback, documentation quality',
 'Barrick & Mount (1991): communication skills predict team effectiveness across all industries'),

(4, 'Social Skills & Interpersonal Ability',
 'Effectiveness in building relationships, collaborating with others, and navigating social dynamics. Critical for patient care, classroom management, customer service, team collaboration, and leadership.',
 'Behavioral questions, peer feedback, teamwork examples, conflict resolution scenarios, customer/client interactions',
 'Van Scotter & Motowidlo (1996): interpersonal facilitation r=0.37 with contextual performance'),

(5, 'Integrity & Ethical Standards',
 'Adherence to ethical principles, honesty, and accountability in professional conduct. Essential for maintaining trust whether in healthcare, education, finance, or any field with professional responsibilities.',
 'Reference checks, ethical dilemma scenarios, past conduct examples, value alignment assessments',
 'Ones et al. (1993): integrity tests r=0.41 with counterproductive behavior prevention'),

(6, 'Adaptability & Flexibility',
 'Ability to adjust to change, handle uncertainty, and remain effective under pressure. Crucial for emergency situations, changing regulations, new technologies, or shifting business conditions.',
 'Examples of pivots, stress tolerance demonstrations, open-mindedness evidence, change navigation stories',
 'Pulakos et al. (2000): adaptability predicts performance in dynamic environments across industries'),

(7, 'Learning Agility & Growth Mindset',
 'Speed of learning new skills and openness to feedback and continuous professional development. Essential in every field as practices, technologies, and standards evolve.',
 'Learning examples, skill acquisition speed, feedback receptiveness, professional development activities',
 'De Rue et al. (2012): learning agility r=0.38 with leadership potential and career success'),

(8, 'Leadership & Initiative',
 'Ability to inspire, guide others, take ownership, and drive outcomes. Relevant at all levels from charge nurses to lead teachers to shift supervisors to project leads.',
 'Leadership examples, ownership demonstrations, influence stories, initiative-taking evidence',
 'Judge et al. (2002): transformational leadership r=0.44 with effectiveness across contexts'),

(9, 'Creativity & Innovation',
 'Capacity for original thinking, generating novel ideas, and challenging assumptions. Valuable in developing new teaching methods, improving patient care protocols, enhancing customer experiences, or solving unique problems.',
 'Innovation examples, novel solutions, creative problem-solving demonstrations, improvement initiatives',
 'Tierney & Farmer (2002): creative self-efficacy predicts creative performance across domains'),

(10, 'Motivation & Drive',
 'Internal motivation, persistence in pursuing goals, and commitment to professional excellence. Manifests as dedication to patient outcomes, student success, customer satisfaction, or project completion.',
 'Goal achievement examples, persistence stories, intrinsic motivation signals, long-term commitment evidence',
 'Barrick & Mount (1991): conscientiousness r=0.31 with performance across all job types');

-- ============================================================================
-- INSERT SUB-INDICATORS
-- ============================================================================

-- Indicator 1: Job Knowledge & Technical Skills
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(1, 'Domain Expertise', 'Deep knowledge of field-specific concepts, practices, and standards'),
(1, 'Professional Proficiency', 'Mastery of core competencies required for the role'),
(1, 'Tool/System Mastery', 'Proficiency with relevant tools, systems, or technologies'),
(1, 'Industry Knowledge', 'Understanding of industry trends, regulations, and context');

-- Indicator 2: Problem-Solving & Critical Thinking
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(2, 'Analytical Reasoning', 'Ability to break down complex problems systematically'),
(2, 'Creative Solutions', 'Generating innovative approaches to challenges'),
(2, 'Decision Quality', 'Making sound judgments with available information'),
(2, 'Root Cause Analysis', 'Identifying underlying issues rather than just symptoms');

-- Indicator 3: Communication & Articulation
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(3, 'Verbal Clarity', 'Speaking clearly and effectively in various settings'),
(3, 'Written Communication', 'Writing clearly, concisely, and professionally'),
(3, 'Active Listening', 'Understanding others and asking clarifying questions'),
(3, 'Presentation Skills', 'Engaging audiences and conveying information effectively');

-- Indicator 4: Social Skills & Interpersonal Ability
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(4, 'Team Collaboration', 'Working effectively with colleagues in any setting'),
(4, 'Conflict Resolution', 'Addressing disagreements constructively'),
(4, 'Empathy', 'Understanding and responding to others emotions appropriately'),
(4, 'Relationship Building', 'Establishing trust and rapport with diverse stakeholders');

-- Indicator 5: Integrity & Ethical Standards
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(5, 'Honesty', 'Truthfulness in all professional interactions'),
(5, 'Accountability', 'Taking responsibility for actions and outcomes'),
(5, 'Ethical Decision-Making', 'Making choices aligned with professional ethics'),
(5, 'Transparency', 'Being open about processes and decisions');

-- Indicator 6: Adaptability & Flexibility
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(6, 'Change Management', 'Navigating transitions and organizational changes'),
(6, 'Resilience', 'Bouncing back from setbacks, maintaining effectiveness'),
(6, 'Open-Mindedness', 'Willingness to consider new ideas and perspectives'),
(6, 'Stress Tolerance', 'Performing effectively in high-pressure situations');

-- Indicator 7: Learning Agility & Growth Mindset
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(7, 'Knowledge Acquisition', 'Quickly grasping new concepts and procedures'),
(7, 'Skill Development', 'Actively building new capabilities'),
(7, 'Self-Awareness', 'Understanding personal strengths and areas for improvement'),
(7, 'Feedback Receptiveness', 'Seeking and acting on constructive feedback');

-- Indicator 8: Leadership & Initiative
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(8, 'Vision Setting', 'Articulating direction and inspiring others'),
(8, 'Team Motivation', 'Encouraging colleagues to perform at their best'),
(8, 'Ownership', 'Taking responsibility and proactively addressing issues'),
(8, 'Strategic Thinking', 'Considering long-term implications of actions');

-- Indicator 9: Creativity & Innovation
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(9, 'Original Thinking', 'Approaching problems from unique angles'),
(9, 'Idea Generation', 'Producing multiple potential solutions'),
(9, 'Risk-Taking', 'Willingness to try new approaches'),
(9, 'Experimentation', 'Testing ideas and learning from results');

-- Indicator 10: Motivation & Drive
INSERT INTO sub_indicators (indicator_number, number, description) VALUES
(10, 'Goal Orientation', 'Setting and pursuing meaningful objectives'),
(10, 'Persistence', 'Continuing effort despite obstacles'),
(10, 'Ambition', 'Striving for growth and excellence'),
(10, 'Work Ethic', 'Consistent effort and dedication to quality');

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT 'Indicators: ' || COUNT(*) FROM indicators;
SELECT 'Sub-indicators: ' || COUNT(*) FROM sub_indicators;
