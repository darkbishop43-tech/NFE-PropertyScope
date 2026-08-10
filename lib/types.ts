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

export type ProtectedExecutionStatus = 'accepted' | 'accepted_with_qualification' | 'rejected' | 'failed';
export type ProtectedValidationStatus = 'passed' | 'rejected' | 'not_completed';

export interface ProtectedServiceProvenance {
  requestId?: string;
  caseId?: string;
  module?: string;
  executedAt?: string;
  service?: string;
  serviceVersion?: string;
  platformVersion?: string;
  build?: string;
  componentVersion?: string;
  promptVersion?: string;
  contractVersion?: string;
  provider?: {
    provider?: string;
    model?: string;
    finishReason?: string;
  };
}

export interface ProtectedServiceCorrelation {
  contractVersion: 'nfe-safe-correlation-contract-1.0';
  callerRequestId: string;
  requestId: string;
  caseId: string;
  furthestExecutionReceipt?: string;
  safeResponseGenerated: true;
  failureStage?: string;
  retryable?: boolean;
}

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
  service?: string;
  serviceVersion?: string;
  platformVersion?: string;
  build?: string;
  componentVersion?: string;
  promptVersion?: string;
  contractVersion?: string;
  finishReason?: string;
}

export interface NfeAnalysisOutput {
  requestId: string;
  caseId?: string;
  findings: AnalysisFinding[];
  answer?: string;
  confidence: Confidence;
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
  serviceProvenance?: ProtectedServiceProvenance;
  serviceCorrelation?: ProtectedServiceCorrelation;
  executionStatus?: ProtectedExecutionStatus;
  validationStatus?: ProtectedValidationStatus;
}

export interface HdpRejectionDiagnostics {
  rejectionCode?: 'CONTENT_INTEGRITY' | 'HDP_UNSUPPORTED_CAPABILITY' | 'HDP_SOLUTION_RESTRAINT' | 'HDP_RESULT_STATE_CONTRACT' | 'VALIDATION_REJECTED';
  firstFailureCode?: 'CONTENT_INTEGRITY' | 'HDP_UNSUPPORTED_CAPABILITY' | 'HDP_SOLUTION_RESTRAINT' | 'HDP_RESULT_STATE_CONTRACT' | 'VALIDATION_REJECTED';
  firstFinishReason?: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'NOT_SUPPLIED' | 'OTHER';
  correctionEligible?: boolean;
  correctionAttempted?: boolean;
  correctionIneligibilityReason?: 'NONE' | 'MAX_TOKENS' | 'CONTENT_INTEGRITY';
  correctionResult?: 'REJECTED' | 'NOT_ATTEMPTED';
}

export interface HdpDiscoveryOutput {
  requestId: string;
  caseId?: string;
  discoveries: string[];
  confidence: Confidence;
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
  serviceProvenance?: ProtectedServiceProvenance;
  serviceCorrelation?: ProtectedServiceCorrelation;
  executionStatus?: ProtectedExecutionStatus;
  validationStatus?: ProtectedValidationStatus;
  resultState?: string;
  discoveryClassification?: string | null;
  mechanismOrigin?: string | null;
  conclusion?: string;
  rejected?: boolean;
  rejectionCode?: string;
  rejectionReason?: string;
  rejectionDiagnostics?: HdpRejectionDiagnostics;
}

export interface RrsReviewOutput {
  requestId: string;
  caseId?: string;
  verdict: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  generatedAt: string;
  provenance: 'NFE_OS_ANALYSIS';
  providerMetadata?: NfeProviderMetadata;
  serviceProvenance?: ProtectedServiceProvenance;
  serviceCorrelation?: ProtectedServiceCorrelation;
  executionStatus?: ProtectedExecutionStatus;
  validationStatus?: ProtectedValidationStatus;
  assessment?: string;
  crossSystemAssessment?: string;
  hdpAssessment?: string;
  humanDecision?: string;
}

export interface NfeOsIntegrationRun {
  id: string;
  realEstateCaseId: string;
  correlationId?: string;
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
