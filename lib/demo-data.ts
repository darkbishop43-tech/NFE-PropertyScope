import type { SiteProject } from './types';

const demoScenarios = [
  {
    id: 'scenario-mixed', type: 'MIXED_USE' as const, name: 'Mixed-Use Infill',
    concept: 'Ground-floor neighborhood retail with housing above.',
    whyItMayFit: 'A compact urban parcel can sometimes benefit from stacking complementary uses while activating the street edge.',
    advantages: ['Multiple use types', 'Potential street activation', 'Housing component'],
    constraints: ['Parking strategy unresolved', 'Zoning not verified', 'Construction complexity'],
    criticalUnknowns: ['Permitted density', 'Height/setback limits', 'Utility capacity'],
    complexity: 'HIGH' as const, confidence: 'MEDIUM' as const,
    nextVerificationStep: 'Verify zoning district, dimensional standards, and parking requirements with the relevant planning authority.'
  },
  {
    id: 'scenario-residential', type: 'RESIDENTIAL' as const, name: 'Small Residential Development',
    concept: 'A lower-complexity residential concept sized to verified parcel constraints.',
    whyItMayFit: 'Residential demand may provide a simpler use case than a multi-program commercial concept.',
    advantages: ['Simpler operating model', 'Potential neighborhood fit', 'Phased design options'],
    constraints: ['Density unknown', 'Site access requires review'],
    criticalUnknowns: ['Unit count permitted', 'Stormwater requirements'],
    complexity: 'MEDIUM' as const, confidence: 'LOW' as const,
    nextVerificationStep: 'Confirm residential use permissions and dimensional constraints.'
  },
  {
    id: 'scenario-hold', type: 'HOLD_NO_DEVELOPMENT' as const, name: 'Hold / No Development',
    concept: 'Pause capital deployment while resolving the highest-impact unknowns.',
    whyItMayFit: 'The cost of early verification may be lower than committing to a concept built on uncertain zoning and site assumptions.',
    advantages: ['Reduces premature commitment', 'Creates time for evidence collection'],
    constraints: ['Opportunity cost', 'Carrying costs may continue'],
    criticalUnknowns: ['Carrying cost', 'Market timing'],
    complexity: 'LOW' as const, confidence: 'MEDIUM' as const,
    nextVerificationStep: 'Complete zoning, parcel, access, and flood verification before choosing a capital-intensive scenario.'
  },
  {
    id: 'scenario-commercial', type: 'COMMERCIAL' as const, name: 'Neighborhood Commercial',
    concept: 'Small-format retail, service, or food-and-beverage use subject to access and parking validation.',
    whyItMayFit: 'Visibility and surrounding activity can support commercial consideration if access and permitted use align.',
    advantages: ['Potential visible frontage', 'Flexible tenant concepts'],
    constraints: ['Traffic/access unverified', 'Parking demand'],
    criticalUnknowns: ['Curb-cut approval', 'Market demand', 'Permitted uses'],
    complexity: 'MEDIUM' as const, confidence: 'LOW' as const,
    nextVerificationStep: 'Verify permitted commercial uses, access, traffic context, and parking standards.'
  }
];

export const demoProjects: SiteProject[] = [
  {
    id: 'demo-urban-lot',
    name: 'River Street Opportunity',
    address: '145 River Street, Demo City, MA',
    primaryQuestion: 'What could realistically be done with this underused lot?',
    intendedUse: 'Open to alternatives',
    apparentCurrentUse: 'Underused surface lot — demo observation only',
    stage: 'SCENARIO_REVIEW',
    status: 'Preliminary analysis ready',
    assets: [],
    evidence: [
      { id: 'ev-zoning', category: 'Zoning', title: 'Zoning district', value: 'Needs Verification', summary: 'Demo data does not contain an authoritative zoning determination.', status: 'UNCERTAIN', sourceName: 'Demo Data', retrievedAt: '2026-07-20', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'AI_INFERENCE', notes: 'Verify with the relevant planning authority.' },
      { id: 'ev-access', category: 'Road Access', title: 'Street frontage', value: 'Apparent public-road frontage', summary: 'Visual context suggests direct frontage, but legal access and curb-cut permissions are not confirmed.', status: 'UNCERTAIN', sourceName: 'Demo Observation', retrievedAt: '2026-07-20', confidence: 'LOW', verificationRequired: true, provenance: 'AI_INFERENCE' },
      { id: 'ev-flood', category: 'Flood Risk', title: 'Flood information', value: 'Not Yet Retrieved', summary: 'No live FEMA or local flood data connected in this MVP.', status: 'UNKNOWN', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'PUBLIC_DATA' },
      { id: 'ev-market', category: 'Market Context', title: 'Development context', value: 'Preliminary', summary: 'Several use types may warrant investigation, but no live market study has been performed.', status: 'UNCERTAIN', sourceName: 'Mock NFE Site Intelligence', retrievedAt: '2026-07-20', confidence: 'LOW', verificationRequired: true, provenance: 'NFE_OS_ANALYSIS' }
    ],
    findings: [
      { id: 'f1', category: 'MATTERS_MOST', statement: 'Zoning, parcel dimensions, legal access, and parking requirements are likely to control which concepts survive first review.', importance: 'HIGH', confidence: 'MEDIUM', evidenceIds: ['ev-zoning','ev-access'] },
      { id: 'f2', category: 'HIDDEN_FACTOR', statement: 'A visually attractive concept could fail if required parking or site circulation consumes the usable development area.', importance: 'HIGH', confidence: 'MEDIUM' },
      { id: 'f3', category: 'ASSUMPTION', statement: 'The current concept set assumes redevelopment is economically preferable to holding the property, which has not been established.', importance: 'MEDIUM', confidence: 'MEDIUM' },
      { id: 'f4', category: 'OPPORTUNITY', statement: 'Multiple scenario types can be compared before committing to one use, preserving optionality while evidence is incomplete.', importance: 'MEDIUM', confidence: 'HIGH' },
      { id: 'f5', category: 'MISSING_EVIDENCE', statement: 'Authoritative zoning, parcel boundary, flood, utility, and environmental information is still missing.', importance: 'HIGH', confidence: 'HIGH' },
      { id: 'f6', category: 'CONTROLLING_CONSTRAINT', statement: 'Permitted use and dimensional standards may eliminate otherwise appealing development concepts.', importance: 'HIGH', confidence: 'HIGH' },
      { id: 'f7', category: 'NEXT_QUESTION', statement: 'What is the smallest set of official records needed to eliminate infeasible uses before design spending begins?', importance: 'HIGH', confidence: 'HIGH' },
      { id: 'f8', category: 'CONCLUSION_CHANGER', statement: 'A restrictive zoning designation, flood constraint, inaccessible utility connection, or insufficient legal access could materially change the current scenario ranking.', importance: 'HIGH', confidence: 'MEDIUM' }
    ],
    scenarios: demoScenarios,
    risks: [
      { id: 'r1', category: 'Zoning', title: 'Zoning not verified', description: 'Permitted uses and dimensional standards are unknown in this demo.', severity: 'HIGH', status: 'NEEDS_VERIFICATION', confidence: 'HIGH', verificationRequired: true },
      { id: 'r2', category: 'Evidence Gap', title: 'Parcel and utility data missing', description: 'Concept feasibility could change once parcel geometry and utility capacity are known.', severity: 'MEDIUM', status: 'POTENTIAL_CONCERN', confidence: 'MEDIUM', verificationRequired: true }
    ],
    analysisCompleted: true,
    createdAt: '2026-07-20T04:00:00.000Z',
    updatedAt: '2026-07-20T04:30:00.000Z',
    isDemo: true
  },
  {
    id: 'demo-commercial-shell', name: 'Main Street Commercial Shell', address: '88 Main Street, Demo City, SC',
    primaryQuestion: 'Could adaptive reuse or a commercial concept make sense here?', intendedUse: 'Commercial or adaptive reuse',
    apparentCurrentUse: 'Vacant commercial shell — demo only', stage: 'EVIDENCE_GATHERING', status: 'Evidence gathering', assets: [],
    evidence: [], findings: [], scenarios: demoScenarios.slice(2), risks: [], analysisCompleted: false,
    createdAt: '2026-07-19T16:00:00.000Z', updatedAt: '2026-07-20T01:00:00.000Z', isDemo: true
  },
  {
    id: 'demo-adaptive-reuse', name: 'Old Mill Adaptive Reuse', address: '12 Mill Lane, Demo City, NC',
    primaryQuestion: 'What reuse directions should be investigated before major design work?', intendedUse: 'Adaptive reuse',
    apparentCurrentUse: 'Existing older industrial building — demo only', stage: 'VISUAL_CONCEPT', status: 'Scenario selected', assets: [],
    evidence: [], findings: [], scenarios: demoScenarios, risks: [], selectedScenarioId: 'scenario-mixed', analysisCompleted: true,
    createdAt: '2026-07-18T15:00:00.000Z', updatedAt: '2026-07-19T22:00:00.000Z', isDemo: true
  }
];
