/**
 * Test Data for 10-Indicator Framework
 *
 * Diverse CV examples from various industries to validate
 * that the scoring system works universally.
 */

// ============================================================================
// HEALTHCARE: Registered Nurse CV
// ============================================================================
export const nurseCV = `
SARAH MARTINEZ, RN, BSN
Registered Nurse | Emergency Medicine | 6 Years Experience

PROFESSIONAL SUMMARY
Dedicated emergency room nurse with 6 years of experience at County General Hospital's Level 1 Trauma Center. Proven track record of delivering exceptional patient care in high-pressure environments while maintaining composure and clinical excellence. Passionate about patient advocacy and continuous professional development.

PROFESSIONAL EXPERIENCE

Emergency Department Nurse | County General Hospital | 2018-Present
• Manage patient care for 15-20 patients per shift in high-acuity ER environment, prioritizing care based on triage protocols and clinical assessment
• Trained 8 new graduate nurses on triage protocols, medication administration, IV insertion techniques, and patient safety procedures
• Implemented improved documentation system that reduced medication errors by 30% and improved handoff communication between shifts
• Collaborate daily with multidisciplinary teams including physicians, pharmacists, social workers, respiratory therapists, and case managers
• Recognized for calm demeanor and clear communication with anxious patients and families during critical situations, receiving 12 patient commendations
• Adapted quickly to new Cerner electronic health record system transition, became departmental super-user and trained 25+ colleagues
• Respond to Code Blue emergencies, successfully participating in 40+ resuscitations with 85% ROSC rate
• Precept nursing students from local university, mentoring 15 students through their ER clinical rotations

CERTIFICATIONS
• ACLS (Advanced Cardiac Life Support)
• PALS (Pediatric Advanced Life Support)
• TNCC (Trauma Nursing Core Course)
• ENPC (Emergency Nursing Pediatric Course)
• CEN (Certified Emergency Nurse) - In Progress

EDUCATION
Bachelor of Science in Nursing | State University | 2017
Graduated Magna Cum Laude

SKILLS
Patient Assessment | Critical Care | Triage | Medication Administration | IV Therapy | Wound Care | Patient Education | EHR Documentation | Team Leadership | Crisis Management
`;

// Expected scores for nurse:
// High: Social Skills (4), Adaptability (6), Integrity (5), Job Knowledge (1)
// Medium-High: Communication (3), Leadership (8), Learning Agility (7)
export const nurseExpectedHighIndicators = [1, 3, 4, 5, 6, 8];

// ============================================================================
// EDUCATION: High School Teacher CV
// ============================================================================
export const teacherCV = `
JENNIFER CHEN, M.Ed
High School English Teacher | 8 Years Experience | Curriculum Developer

PROFESSIONAL SUMMARY
Innovative high school English teacher with 8 years of experience creating engaging, student-centered learning environments. Expert in differentiated instruction, project-based learning, and integrating technology to enhance student engagement. Committed to fostering critical thinking and a love of literature in diverse learners.

PROFESSIONAL EXPERIENCE

English Teacher (Grades 9-12) | Lincoln High School | 2016-Present
• Developed innovative curriculum incorporating multimedia, technology, and project-based learning that improved student engagement by 40% based on annual surveys
• Increased AP Literature pass rates from 65% to 85% over 4 years through targeted skill development, practice exams, and individualized feedback
• Mentored 5 student teachers through their practicum experiences, providing daily feedback, modeling best practices, and guiding lesson planning
• Served on school improvement committee, leading initiative to integrate more diverse authors into curriculum across all grade levels
• Adapted teaching methods for diverse learning styles, ELL students, and students with IEPs, creating individualized accommodation plans
• Created safe, inclusive classroom environment where students feel comfortable expressing diverse viewpoints, resulting in 95% positive climate survey results
• Designed and implemented new creative writing elective, growing enrollment from 15 to 45 students in 3 years
• Sponsor of Creative Writing Club and Debate Team, leading students to 3 regional competition wins

Professional Development & Training
• Completed workshop on trauma-informed teaching practices (2023)
• Google Certified Educator Level 2
• Trained in Restorative Justice practices for classroom management
• Regular presenter at state English Teachers Association conferences

EDUCATION
Master of Education, Curriculum & Instruction | State University | 2020
Bachelor of Arts, English Literature | Liberal Arts College | 2015
Summa Cum Laude

SKILLS
Curriculum Design | Differentiated Instruction | Classroom Management | Student Assessment | Project-Based Learning | Educational Technology | Parent Communication | IEP Accommodation | Public Speaking | Mentorship
`;

// Expected scores for teacher:
// High: Communication (3), Learning Agility (7), Creativity (9), Social Skills (4)
// Medium-High: Leadership (8), Adaptability (6), Motivation (10)
export const teacherExpectedHighIndicators = [3, 4, 6, 7, 8, 9];

// ============================================================================
// RETAIL: Store Manager CV
// ============================================================================
export const retailManagerCV = `
MARCUS JOHNSON
Store Manager | Retail Operations | 10 Years Experience

PROFESSIONAL SUMMARY
Results-driven retail store manager with 10 years of progressive experience leading teams of 20-35 employees. Proven ability to drive revenue growth, reduce turnover, and create positive team cultures. Expert in operations management, customer service excellence, and sales coaching.

PROFESSIONAL EXPERIENCE

Store Manager | Regional Retail Chain | 2017-Present
• Lead store operations for flagship location with $4.5M annual revenue and team of 35 employees across 5 departments
• Increased store revenue by 45% over 3 years through improved customer service training, strategic merchandising, and data-driven sales coaching
• Reduced employee turnover from 60% to 25% through mentorship programs, clear communication, recognition initiatives, and career development paths
• Handle all aspects of store operations including inventory management ($800K+ stock), scheduling, hiring, performance reviews, and full P&L responsibility
• Recognized as "Manager of the Year" twice for exceeding sales targets by 20%+ while maintaining 4.8/5 customer satisfaction scores
• Successfully opened 2 new store locations from ground up, including hiring, training management teams, and establishing operational procedures
• Built positive team culture emphasizing accountability, recognition, and growth, resulting in highest employee engagement scores in region
• Resolve escalated customer complaints, maintaining 98% resolution satisfaction rate through empathetic listening and creative problem-solving

Assistant Store Manager | Retail Chain | 2014-2017
• Managed daily operations, supervised 15 employees, and oversaw inventory receiving and merchandising
• Trained new employees on POS systems, loss prevention protocols, and customer service standards
• Adapted quickly to new inventory management software and trained entire staff within 2 weeks

ACHIEVEMENTS
• Manager of the Year 2021, 2023
• Consistently top 5% in regional performance metrics
• Led store through successful COVID-19 operational pivot (curbside, safety protocols)

EDUCATION
Associate Degree, Business Administration | Community College | 2014

SKILLS
Team Leadership | Sales Coaching | P&L Management | Inventory Control | Customer Service | Merchandising | Employee Development | Conflict Resolution | POS Systems | Scheduling
`;

// Expected scores for retail manager:
// High: Leadership (8), Social Skills (4), Motivation (10), Adaptability (6)
// Medium-High: Communication (3), Problem-Solving (2), Job Knowledge (1)
export const retailManagerExpectedHighIndicators = [3, 4, 6, 8, 10];

// ============================================================================
// TECHNOLOGY: Software Engineer CV
// ============================================================================
export const softwareEngineerCV = `
ALEX KUMAR
Senior Software Engineer | Full-Stack Development | 7 Years Experience

PROFESSIONAL SUMMARY
Senior software engineer with 7 years of experience building scalable web applications and distributed systems. Expert in React, Node.js, and cloud architecture. Passionate about clean code, mentoring junior developers, and driving technical excellence.

PROFESSIONAL EXPERIENCE

Senior Software Engineer | Tech Startup | 2020-Present
• Architect and lead development of customer-facing platform serving 2M+ monthly active users with 99.9% uptime
• Designed and implemented microservices architecture that improved system scalability by 300% and reduced deployment time from days to hours
• Mentor 4 junior engineers through code reviews, pair programming sessions, and career development discussions
• Reduced API response times by 60% through database optimization, caching strategies, and code profiling
• Led migration from monolithic architecture to microservices, coordinating across 3 teams and delivering on time
• Implemented comprehensive testing strategy (unit, integration, e2e) increasing code coverage from 45% to 92%
• Collaborate with product managers and designers to translate business requirements into technical specifications
• Present technical proposals and architecture decisions to leadership team, successfully advocating for tech debt reduction initiative

Software Engineer | Enterprise Software Company | 2017-2020
• Developed features for enterprise CRM platform used by 500+ Fortune 500 clients
• Built RESTful APIs and React components, following best practices for accessibility and performance
• Participated in on-call rotation, resolving production incidents with minimal customer impact
• Contributed to open-source projects and internal developer tooling improvements

TECHNICAL SKILLS
Languages: JavaScript/TypeScript, Python, Go, SQL
Frontend: React, Next.js, Redux, Tailwind CSS
Backend: Node.js, Express, FastAPI, GraphQL
Cloud/DevOps: AWS, GCP, Docker, Kubernetes, Terraform, CI/CD
Databases: PostgreSQL, MongoDB, Redis, Elasticsearch

EDUCATION
Bachelor of Science, Computer Science | State University | 2017

CERTIFICATIONS
• AWS Solutions Architect Associate
• Google Cloud Professional Developer
`;

// Expected scores for software engineer:
// High: Job Knowledge (1), Problem-Solving (2), Learning Agility (7)
// Medium-High: Leadership (8), Communication (3), Creativity (9)
export const softwareEngineerExpectedHighIndicators = [1, 2, 7, 8];

// ============================================================================
// FINANCE: Financial Analyst CV
// ============================================================================
export const financialAnalystCV = `
RACHEL THOMPSON, CFA
Financial Analyst | Investment Banking | 5 Years Experience

PROFESSIONAL SUMMARY
Detail-oriented financial analyst with 5 years of experience in investment banking and corporate finance. CFA charterholder with expertise in financial modeling, valuation, and strategic analysis. Known for rigorous analytical approach and clear communication with stakeholders.

PROFESSIONAL EXPERIENCE

Financial Analyst | Major Investment Bank | 2020-Present
• Build and maintain complex financial models for M&A transactions ranging from $50M to $2B deal value
• Conduct comprehensive due diligence and valuation analysis for private equity clients, identifying key risks and opportunities
• Prepare board-ready presentations and investment memoranda for senior leadership review
• Maintain strict confidentiality on all deals, adhering to regulatory requirements and firm compliance policies
• Identified $15M in cost synergies through detailed analysis of acquisition target, directly influencing deal terms
• Collaborate with cross-functional teams including legal, tax, and operations to ensure deal execution
• Train and mentor 2 junior analysts on modeling best practices, Excel efficiency, and presentation skills

Associate Analyst | Corporate Finance Firm | 2019-2020
• Supported senior analysts in preparing quarterly earnings reports and investor presentations
• Developed automated reporting tools in Excel/VBA that reduced monthly close time by 40%
• Participated in annual audit preparation, ensuring accuracy of financial statements

CERTIFICATIONS & EDUCATION
CFA (Chartered Financial Analyst) Charterholder
Bachelor of Science, Finance | Business School | 2019
Summa Cum Laude | Beta Gamma Sigma Honor Society

TECHNICAL SKILLS
Financial Modeling | DCF Valuation | Comparable Company Analysis | M&A Analysis | Excel/VBA | Bloomberg Terminal | Capital IQ | PowerPoint | SQL

ACHIEVEMENTS
• Recognized for exceptional attention to detail - zero errors in 50+ client deliverables
• Published internal research paper on ESG valuation frameworks
• Volunteer financial literacy instructor for local nonprofit
`;

// Expected scores for financial analyst:
// High: Integrity (5), Problem-Solving (2), Job Knowledge (1)
// Medium-High: Communication (3), Learning Agility (7), Motivation (10)
export const financialAnalystExpectedHighIndicators = [1, 2, 3, 5, 7, 10];

// ============================================================================
// TEST UTILITIES
// ============================================================================

export interface TestCase {
  name: string;
  industry: string;
  cv: string;
  expectedHighIndicators: number[];
  minOverallScore: number;
  maxOverallScore: number;
}

export const testCases: TestCase[] = [
  {
    name: 'Healthcare - Registered Nurse',
    industry: 'healthcare',
    cv: nurseCV,
    expectedHighIndicators: nurseExpectedHighIndicators,
    minOverallScore: 6.0,
    maxOverallScore: 9.0,
  },
  {
    name: 'Education - High School Teacher',
    industry: 'education',
    cv: teacherCV,
    expectedHighIndicators: teacherExpectedHighIndicators,
    minOverallScore: 6.5,
    maxOverallScore: 9.0,
  },
  {
    name: 'Retail - Store Manager',
    industry: 'retail',
    cv: retailManagerCV,
    expectedHighIndicators: retailManagerExpectedHighIndicators,
    minOverallScore: 6.0,
    maxOverallScore: 9.0,
  },
  {
    name: 'Technology - Software Engineer',
    industry: 'technology',
    cv: softwareEngineerCV,
    expectedHighIndicators: softwareEngineerExpectedHighIndicators,
    minOverallScore: 6.5,
    maxOverallScore: 9.0,
  },
  {
    name: 'Finance - Financial Analyst',
    industry: 'finance',
    cv: financialAnalystCV,
    expectedHighIndicators: financialAnalystExpectedHighIndicators,
    minOverallScore: 6.5,
    maxOverallScore: 9.0,
  },
];

// Short texts for error handling tests
export const invalidTexts = {
  empty: '',
  tooShort: 'Manager with experience.',
  minimal: 'I am a skilled professional with experience in my field and strong work ethic.',
};

// Marketing CV for additional diversity
export const marketingManagerCV = `
Marketing Manager with 5 years experience in B2B tech marketing.
Led team of 3 to increase brand awareness by 50% through strategic campaigns.
Strong communication skills, managed client relationships across 15 accounts.
Organized successful product launch campaign generating $2M in pipeline.
Developed content strategy that increased organic traffic by 200%.
Collaborated with sales team to create targeted messaging for enterprise accounts.
Adapted quickly to remote work, maintained team productivity and morale.
`;
