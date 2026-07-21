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

export type EvidenceSourceCategory =
  | 'User photo'
  | 'User document'
  | 'Listing material'
  | 'Government record'
  | 'Survey or parcel material'
  | 'Business/project plan'
  | 'County or municipal correspondence'
  | 'Third-party report'
  | 'Conceptual material'
  | 'Unclassified evidence';

export type VerificationState =
  | 'Unreviewed'
  | 'Needs verification'
  | 'Partially verified'
  | 'Verified against source'
  | 'Conflicting source'
  | 'Superseded';

export type EvidenceTruthClass =
  | 'FACT'
  | 'USER-PROVIDED CLAIM'
  | 'LISTING CLAIM'
  | 'PUBLIC-RECORD EVIDENCE'
  | 'ASSUMPTION'
  | 'AI-GENERATED ANALYSIS'
  | 'CONCEPTUAL PROJECTION'
  | 'HUMAN DECISION';

export type EvidenceUploadStatus =
  | 'READY'
  | 'LOCAL_PREVIEW_ONLY'
  | 'QUEUED'
  | 'UPLOADING'
  | 'SAVED_PRIVATE'
  | 'FAILED'
  | 'REJECTED'
  | 'SECURE_STORAGE_REQUIRED';

export type AdapterConnectionState = 'LIVE' | 'MOCK' | 'DISCONNECTED' | 'FAILED';

export interface PropertyAsset {
  id: string;
  evidenceItemId?: string;
  type: 'PHOTO' | 'DOCUMENT' | 'GENERATED_VISUAL';
  /** Demo imagery only. User-uploaded file contents must never be persisted in localStorage. */
  dataUrl?: string;
  filename: string;
  originalFilename?: string;
  sanitizedFilename?: string;
  mimeType: string;
  sizeBytes?: number;
  uploadedAt?: string;
  isPrimary: boolean;
  provenance: ProvenanceType;
  sourceCategory?: EvidenceSourceCategory;
  sourceDescription?: string;
  truthClass?: EvidenceTruthClass;
  verificationStatus?: VerificationState;
  uploadStatus?: EvidenceUploadStatus;
  storageObjectRef?: string;
  errorMessage?: string;
  localPreviewAvailable?: boolean;
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
  verificationStatus?: VerificationState;
  provenance: ProvenanceType;
  truthClass?: EvidenceTruthClass;
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
  status: 'PENDING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  adapterVersion: string;
  connectionState?: AdapterConnectionState;
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

export interface AnalysisConnectionStatus {
  nfe: AdapterConnectionState;
  hdp: AdapterConnectionState;
  rrs: AdapterConnectionState;
  adapterVersion: string;
  label: string;
}

export interface SiteProject {
  id: string;
  ownerId?: string;
  name: string;
  investigationType?: 'Known Property' | 'Observed Property' | 'Listing Review' | 'Other';
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
  missingInformation?: string[];
  analysisConnection?: AnalysisConnectionStatus;
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

export interface PublicSystemStatus {
  version: string;
  buildId: string;
  storageMode: 'SUPABASE_PRIVATE' | 'LOCAL_PREVIEW_ONLY';
  secureUploadsEnabled: boolean;
  controlledBetaGate: boolean;
  nfe: AdapterConnectionState;
  hdp: AdapterConnectionState;
  rrs: AdapterConnectionState;
  adapterVersion: string;
}
