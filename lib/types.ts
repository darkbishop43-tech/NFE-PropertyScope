export type ProjectStage =
  | 'CAPTURED'
  | 'EVIDENCE_GATHERING'
  | 'READY_FOR_ANALYSIS'
  | 'ANALYZED'
  | 'SCENARIO_REVIEW'
  | 'SCENARIO_SELECTED'
  | 'VISUAL_CONCEPT'
  | 'PROJECT_PLANNING'
  | 'ARCHIVED';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type EvidenceTone = 'SUPPORTED' | 'UNCERTAIN' | 'RISK' | 'UNKNOWN';
export type ProvenanceType =
  | 'USER_PROVIDED'
  | 'PUBLIC_DATA'
  | 'AI_INFERENCE'
  | 'NFE_OS_ANALYSIS'
  | 'PROFESSIONALLY_VERIFIED';

export interface PropertyAsset {
  id: string;
  type: 'PHOTO' | 'DOCUMENT' | 'GENERATED_VISUAL';
  dataUrl?: string;
  filename: string;
  mimeType: string;
  isPrimary: boolean;
  provenance: ProvenanceType;
}

export interface EvidenceItem {
  id: string;
  category: string;
  title: string;
  value: string;
  summary?: string;
  status: EvidenceTone;
  sourceName?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  confidence: Confidence;
  verificationRequired: boolean;
  provenance: ProvenanceType;
  notes?: string;
}

export interface AnalysisFinding {
  id: string;
  category:
    | 'MATTERS_MOST'
    | 'HIDDEN_FACTOR'
    | 'ASSUMPTION'
    | 'OPPORTUNITY'
    | 'FAILURE_POINT'
    | 'MISSING_EVIDENCE'
    | 'CONTROLLING_CONSTRAINT'
    | 'NEXT_QUESTION'
    | 'CONCLUSION_CHANGER';
  statement: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: Confidence;
  evidenceIds?: string[];
}

export interface DevelopmentScenario {
  id: string;
  type: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE' | 'ADAPTIVE_REUSE' | 'HOLD_NO_DEVELOPMENT' | 'CUSTOM';
  name: string;
  concept: string;
  whyItMayFit: string;
  advantages: string[];
  constraints: string[];
  criticalUnknowns: string[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: Confidence;
  nextVerificationStep: string;
}

export interface RiskItem {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'SUPPORTED_CONCERN' | 'POTENTIAL_CONCERN' | 'NEEDS_VERIFICATION' | 'UNKNOWN' | 'RESOLVED';
  confidence: Confidence;
  verificationRequired: boolean;
}

export interface NfeProviderMetadata {
  provider?: string;
  model?: string;
  version?: string;
}

export interface NfeAnalysisOutput {
  requestId: string;
  findings: AnalysisFinding[];
  confidence: Confidence;
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
}

export interface HdpDiscoveryOutput {
  requestId: string;
  discoveries: string[];
  confidence: Confidence;
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
}

export interface RrsReviewOutput {
  requestId: string;
  verdict: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
}

export interface NfeOsIntegrationRun {
  id: string;
  realEstateCaseId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  adapterVersion: string;
  isMock: boolean;
  startedAt: string;
  completedAt?: string;
  nfeRequestId?: string;
  hdpRequestId?: string;
  rrsRequestId?: string;
  nfeAnalysis?: NfeAnalysisOutput;
  hdpAnalysis?: HdpDiscoveryOutput;
  rrsReview?: RrsReviewOutput;
  overallSummary?: string;
  providerMetadata?: NfeProviderMetadata;
  errorMessage?: string;
}

export interface SiteProject {
  id: string;
  name: string;
  address: string;
  locationDescription?: string;
  parcelId?: string;
  listingUrl?: string;
  primaryQuestion: string;
  intendedUse?: string;
  apparentCurrentUse?: string;
  stage: ProjectStage;
  status: string;
  assets: PropertyAsset[];
  evidence: EvidenceItem[];
  findings: AnalysisFinding[];
  scenarios: DevelopmentScenario[];
  risks: RiskItem[];
  selectedScenarioId?: string;
  analysisCompleted: boolean;
  nfeOsRuns?: NfeOsIntegrationRun[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}
