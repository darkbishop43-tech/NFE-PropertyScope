import { randomUUID } from 'node:crypto';
import type {
  HdpDiscoveryOutput,
  HdpRejectionDiagnostics,
  NfeAnalysisOutput,
  NfeProviderMetadata,
  ProtectedServiceCorrelation,
  ProtectedServiceProvenance,
  RrsReviewOutput
} from '../types';
import type { RealEstateNfePayload } from '../adapters/nfe-os';

export type ProtectedResearchOperation = 'nfe.analysis' | 'hdp.discovery' | 'rrs.review';
export const SAFE_CORRELATION_CONTRACT_VERSION = 'nfe-safe-correlation-contract-1.0' as const;

const CALLER_REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{18,78}[A-Za-z0-9]$/;

export type CorrelationFailureCode =
  | 'CASE_ID_MISMATCH'
  | 'MODULE_MISMATCH'
  | 'CALLER_REQUEST_ID_MISMATCH'
  | 'MISSING_PLATFORM_REQUEST_ID'
  | 'SAFE_CORRELATION_MISSING_OR_INVALID';


export type CorrelationComparison = 'MATCH' | 'MISMATCH' | 'ABSENT';
export type CorrelationPresence = 'PRESENT' | 'ABSENT';
export type CorrelationPassFail = 'PASS' | 'FAIL';

export interface CorrelationDiagnostic {
  classification: CorrelationFailureCode;
  operation: ProtectedResearchOperation;
  httpClass: string;
  topLevelCaseId: CorrelationComparison;
  safeCorrelationCaseId: CorrelationComparison;
  module: CorrelationComparison;
  callerRequestId: CorrelationComparison;
  platformRequestId: CorrelationPresence;
  safeCorrelationRequestId: CorrelationComparison;
  correlationObject: CorrelationPresence;
  contractVersion: CorrelationPassFail;
  safeResponseGenerated: CorrelationPassFail;
  safeFailureStage?: string;
  safeExecutionReceipt?: string;
  detail?: 'CORRELATION_OBJECT_MISSING' | 'CONTRACT_VERSION_MISMATCH' | 'SAFE_RESPONSE_GENERATED_NOT_TRUE' | 'CORRELATION_REQUEST_ID_MISSING' | 'CORRELATION_REQUEST_ID_MISMATCH';
}

export interface PropertyScopeProtectedRequest {
  operation: ProtectedResearchOperation;
  payload: RealEstateNfePayload;
  nfeAnalysis?: NfeAnalysisOutput;
  hdpAnalysis?: HdpDiscoveryOutput;
}

interface PlatformProvenance {
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

interface PlatformCorrelationEnvelope {
  contractVersion?: string;
  callerRequestId?: string;
  requestId?: string;
  caseId?: string | null;
  furthestExecutionReceipt?: string;
  safeResponseGenerated?: boolean;
  failureStage?: string;
  retryable?: boolean;
}

interface PlatformEnvelope {
  requestId?: string;
  caseId?: string;
  module?: string;
  executionStatus?: 'accepted' | 'accepted_with_qualification' | 'rejected' | 'failed';
  validationStatus?: 'passed' | 'rejected' | 'not_completed';
  outcome?: string;
  qualification?: string;
  result?: Record<string, unknown> | null;
  error?: {
    category?: string;
    code?: string;
    message?: string;
    retryable?: boolean;
    retryAfterSeconds?: number;
  };
  correlation?: PlatformCorrelationEnvelope;
  provenance?: PlatformProvenance;
  rejectionDiagnostics?: Record<string, unknown>;
}

export class ProtectedResearchError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly diagnostic?: CorrelationDiagnostic;

  constructor(
    message: string,
    status = 502,
    code = 'PROTECTED_RESEARCH_FAILURE',
    retryable = false,
    diagnostic?: CorrelationDiagnostic
  ) {
    super(message);
    this.name = 'ProtectedResearchError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.diagnostic = diagnostic;
  }
}

function requireConfiguredService() {
  const serviceUrl = String(process.env.NFE_RESEARCH_SERVICE_URL || '').trim();
  const token = String(process.env.NFE_RESEARCH_SERVICE_TOKEN || '').trim();
  const enabled = String(process.env.PROPERTYSCOPE_PRIVATE_LIVE_RESEARCH || '').toLowerCase() === 'true';

  if (process.env.VERCEL_ENV === 'production') {
    throw new ProtectedResearchError('PRIVATE LIVE RESEARCH is preview-only in this bounded release.', 503, 'LIVE_RESEARCH_PREVIEW_ONLY');
  }
  if (!enabled) {
    throw new ProtectedResearchError('PRIVATE LIVE RESEARCH is not enabled for this PropertyScope deployment.', 503, 'LIVE_RESEARCH_DISABLED');
  }
  if (!serviceUrl || !token) {
    throw new ProtectedResearchError('Protected research service configuration is incomplete.', 503, 'PROTECTED_SERVICE_NOT_CONFIGURED');
  }
  if (!/^https:\/\//i.test(serviceUrl)) {
    throw new ProtectedResearchError('Protected research service URL must use HTTPS.', 503, 'INVALID_PROTECTED_SERVICE_URL');
  }
  return { serviceUrl, token };
}

function assertCaseContinuity(request: PropertyScopeProtectedRequest) {
  const caseId = request.payload?.realEstateCaseId;
  if (!caseId) throw new ProtectedResearchError('PropertyScope case identity is required.', 400, 'MISSING_PROPERTY_CASE');

  if (request.nfeAnalysis?.caseId && request.nfeAnalysis.caseId !== caseId) {
    throw new ProtectedResearchError('NFE result belongs to a different PropertyScope case.', 409, 'CASE_CORRELATION_MISMATCH');
  }
  if (request.hdpAnalysis?.caseId && request.hdpAnalysis.caseId !== caseId) {
    throw new ProtectedResearchError('HDP result belongs to a different PropertyScope case.', 409, 'CASE_CORRELATION_MISMATCH');
  }
  if (request.operation === 'rrs.review' && (request.hdpAnalysis?.rejected || request.hdpAnalysis?.validationStatus === 'rejected')) {
    throw new ProtectedResearchError('RRS cannot consume a validator-rejected HDP result.', 409, 'HDP_REJECTED');
  }
}

function providerMetadata(provenance?: PlatformProvenance): NfeProviderMetadata | undefined {
  if (!provenance) return undefined;
  return {
    provider: provenance.provider?.provider,
    model: provenance.provider?.model,
    service: provenance.service,
    serviceVersion: provenance.serviceVersion,
    platformVersion: provenance.platformVersion,
    build: provenance.build,
    componentVersion: provenance.componentVersion,
    promptVersion: provenance.promptVersion,
    contractVersion: provenance.contractVersion,
    finishReason: provenance.provider?.finishReason
  };
}

function safeProvenance(provenance?: PlatformProvenance): ProtectedServiceProvenance | undefined {
  if (!provenance) return undefined;
  return {
    requestId: provenance.requestId,
    caseId: provenance.caseId,
    module: provenance.module,
    executedAt: provenance.executedAt,
    service: provenance.service,
    serviceVersion: provenance.serviceVersion,
    platformVersion: provenance.platformVersion,
    build: provenance.build,
    componentVersion: provenance.componentVersion,
    promptVersion: provenance.promptVersion,
    contractVersion: provenance.contractVersion,
    provider: provenance.provider ? {
      provider: provenance.provider.provider,
      model: provenance.provider.model,
      finishReason: provenance.provider.finishReason
    } : undefined
  };
}

export function isValidCallerRequestId(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 20
    && value.length <= 80
    && CALLER_REQUEST_ID_PATTERN.test(value);
}

export function generateCallerRequestId() {
  return `PS-${randomUUID()}`;
}

function nfeVisibleText(output?: NfeAnalysisOutput) {
  if (output?.answer?.trim()) return output.answer.trim();
  return output?.findings.map((finding) => finding.statement).join('\n') || '';
}

function hdpVisibleText(output?: HdpDiscoveryOutput) {
  return [
    output?.resultState ? `Result state: ${output.resultState}` : '',
    output?.conclusion || '',
    ...(output?.discoveries || [])
  ].filter(Boolean).join('\n');
}

function evidenceText(payload: RealEstateNfePayload) {
  return payload.evidence.map((item) =>
    `[${item.provenance}] ${item.category}: ${item.title} — ${item.summary || item.value}; confidence=${item.confidence}; verificationRequired=${item.verificationRequired ? 'yes' : 'no'}`
  ).join('\n');
}

export function buildPlatformBody(request: PropertyScopeProtectedRequest, callerRequestId: string) {
  const caseId = request.payload.realEstateCaseId;
  if (!isValidCallerRequestId(callerRequestId)) {
    throw new ProtectedResearchError('PropertyScope caller request identity is invalid.', 500, 'INVALID_CALLER_REQUEST_ID');
  }

  const correlation = {
    contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
    callerRequestId
  };

  if (request.operation === 'nfe.analysis') {
    return {
      operation: 'nfe.analysis' as const,
      caseId,
      correlation,
      input: { source: request.payload.sourceMaterial },
      options: { runwayMode: 'standard' }
    };
  }

  if (request.operation === 'hdp.discovery') {
    const existingAnswer = nfeVisibleText(request.nfeAnalysis);
    if (!existingAnswer) {
      throw new ProtectedResearchError('Accepted NFE visible output is required before HDP.', 409, 'NFE_REQUIRED');
    }
    return {
      operation: 'hdp.discovery' as const,
      caseId,
      correlation,
      input: {
        source: request.payload.sourceMaterial,
        existingAnswer
      },
      options: { depth: 'Standard Discovery', runwayMode: 'standard' }
    };
  }

  const nfeOutput = nfeVisibleText(request.nfeAnalysis);
  const hdpOutput = hdpVisibleText(request.hdpAnalysis);
  if (!nfeOutput || !hdpOutput) {
    throw new ProtectedResearchError('Accepted NFE and HDP visible outputs are required before RRS.', 409, 'PRIOR_MODULE_REQUIRED');
  }

  return {
    operation: 'rrs.review' as const,
    caseId,
    correlation,
    input: {
      material: `NFE Analysis:\n${nfeOutput}\n\nHDP Discovery:\n${hdpOutput}`,
      source: request.payload.sourceMaterial,
      nfeOutput,
      hdpOutput,
      suppliedEvidence: evidenceText(request.payload)
    },
    options: {
      targetType: 'Supplied Completed Output',
      includedMaterials: ['PropertyScope source material', 'NFE Analysis', 'HDP Discovery', 'PropertyScope evidence metadata'],
      externalVerification: 'Not performed',
      depth: 'Standard Review',
      runwayMode: 'standard'
    }
  };
}

const SAFE_RECEIPTS = new Set([
  'PLATFORM_ROUTE_REACHED',
  'PROTECTED_BEARER_ACCEPTED',
  'PROTECTED_OPERATION_STARTED',
  'PROVIDER_INVOCATION_STARTED'
]);
const SAFE_FAILURE_STAGES = new Set([
  'NONE',
  'PLATFORM_ROUTE_FAILURE',
  'PROTECTED_AUTHORIZATION_FAILURE',
  'PROTECTED_SERVICE_FAILURE',
  'UPSTREAM_PROVIDER_FAILURE',
  'VALIDATOR_REJECTION'
]);

function httpClass(status?: number) {
  if (!status || !Number.isFinite(status)) return 'UNVERIFIABLE';
  if (status >= 200 && status <= 299) return '2XX';
  if ([400, 401, 403, 408, 422, 429, 500, 502, 503, 504].includes(status)) return String(status);
  if (status >= 400 && status <= 499) return 'OTHER_4XX';
  if (status >= 500 && status <= 599) return 'OTHER_5XX';
  return 'OTHER';
}

function comparison(value: unknown, expected: string): CorrelationComparison {
  if (typeof value !== 'string' || !value) return 'ABSENT';
  return value === expected ? 'MATCH' : 'MISMATCH';
}

function buildCorrelationDiagnostic(
  body: PlatformEnvelope,
  expectedCaseId: string,
  operation: ProtectedResearchOperation,
  expectedCallerRequestId: string,
  classification: CorrelationFailureCode,
  status?: number,
  detail?: CorrelationDiagnostic['detail']
): CorrelationDiagnostic {
  const correlation = body.correlation;
  const topRequestPresent = typeof body.requestId === 'string' && Boolean(body.requestId);
  const correlationRequestPresent = typeof correlation?.requestId === 'string' && Boolean(correlation.requestId);
  const safeFailureStage = typeof correlation?.failureStage === 'string' && SAFE_FAILURE_STAGES.has(correlation.failureStage)
    ? correlation.failureStage
    : undefined;
  const safeExecutionReceipt = typeof correlation?.furthestExecutionReceipt === 'string' && SAFE_RECEIPTS.has(correlation.furthestExecutionReceipt)
    ? correlation.furthestExecutionReceipt
    : undefined;
  return {
    classification,
    operation,
    httpClass: httpClass(status),
    topLevelCaseId: comparison(body.caseId, expectedCaseId),
    safeCorrelationCaseId: correlation ? comparison(correlation.caseId, expectedCaseId) : 'ABSENT',
    module: comparison(body.module, operation),
    callerRequestId: correlation ? comparison(correlation.callerRequestId, expectedCallerRequestId) : 'ABSENT',
    platformRequestId: topRequestPresent ? 'PRESENT' : 'ABSENT',
    safeCorrelationRequestId: !correlationRequestPresent
      ? 'ABSENT'
      : topRequestPresent && correlation?.requestId === body.requestId
        ? 'MATCH'
        : 'MISMATCH',
    correlationObject: correlation ? 'PRESENT' : 'ABSENT',
    contractVersion: correlation?.contractVersion === SAFE_CORRELATION_CONTRACT_VERSION ? 'PASS' : 'FAIL',
    safeResponseGenerated: correlation?.safeResponseGenerated === true ? 'PASS' : 'FAIL',
    ...(safeFailureStage ? { safeFailureStage } : {}),
    ...(safeExecutionReceipt ? { safeExecutionReceipt } : {}),
    ...(detail ? { detail } : {})
  };
}

function diagnosticMessage(diagnostic: CorrelationDiagnostic) {
  return [
    'Protected service response correlation did not match the active PropertyScope case.',
    `Diagnostic ${diagnostic.classification}`,
    `case(top=${diagnostic.topLevelCaseId},safe=${diagnostic.safeCorrelationCaseId})`,
    `module=${diagnostic.module}`,
    `caller=${diagnostic.callerRequestId}`,
    `platformRequestId=${diagnostic.platformRequestId}`,
    `correlationRequestId=${diagnostic.safeCorrelationRequestId}`,
    `contract=${diagnostic.contractVersion}`,
    `safeResponseGenerated=${diagnostic.safeResponseGenerated}`,
    diagnostic.detail ? `detail=${diagnostic.detail}` : ''
  ].filter(Boolean).join('; ');
}

function correlationFailure(code: CorrelationFailureCode, diagnostic: CorrelationDiagnostic): never {
  throw new ProtectedResearchError(diagnosticMessage(diagnostic), 502, code, false, diagnostic);
}

export function validatePlatformCorrelation(
  body: PlatformEnvelope,
  expectedCaseId: string,
  operation: ProtectedResearchOperation,
  expectedCallerRequestId: string,
  status?: number
): ProtectedServiceCorrelation {
  if (!body.requestId || typeof body.requestId !== 'string') {
    correlationFailure('MISSING_PLATFORM_REQUEST_ID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'MISSING_PLATFORM_REQUEST_ID', status));
  }
  if (body.caseId !== expectedCaseId) {
    correlationFailure('CASE_ID_MISMATCH', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'CASE_ID_MISMATCH', status));
  }
  if (body.module !== operation) {
    correlationFailure('MODULE_MISMATCH', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'MODULE_MISMATCH', status));
  }
  const correlation = body.correlation;
  if (!correlation) {
    correlationFailure('SAFE_CORRELATION_MISSING_OR_INVALID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'SAFE_CORRELATION_MISSING_OR_INVALID', status, 'CORRELATION_OBJECT_MISSING'));
  }
  if (correlation.contractVersion !== SAFE_CORRELATION_CONTRACT_VERSION) {
    correlationFailure('SAFE_CORRELATION_MISSING_OR_INVALID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'SAFE_CORRELATION_MISSING_OR_INVALID', status, 'CONTRACT_VERSION_MISMATCH'));
  }
  if (correlation.safeResponseGenerated !== true) {
    correlationFailure('SAFE_CORRELATION_MISSING_OR_INVALID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'SAFE_CORRELATION_MISSING_OR_INVALID', status, 'SAFE_RESPONSE_GENERATED_NOT_TRUE'));
  }
  if (correlation.caseId !== expectedCaseId) {
    correlationFailure('CASE_ID_MISMATCH', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'CASE_ID_MISMATCH', status));
  }
  if (!isValidCallerRequestId(correlation.callerRequestId) || correlation.callerRequestId !== expectedCallerRequestId) {
    correlationFailure('CALLER_REQUEST_ID_MISMATCH', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'CALLER_REQUEST_ID_MISMATCH', status));
  }
  if (!correlation.requestId) {
    correlationFailure('SAFE_CORRELATION_MISSING_OR_INVALID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'SAFE_CORRELATION_MISSING_OR_INVALID', status, 'CORRELATION_REQUEST_ID_MISSING'));
  }
  if (correlation.requestId !== body.requestId) {
    correlationFailure('SAFE_CORRELATION_MISSING_OR_INVALID', buildCorrelationDiagnostic(body, expectedCaseId, operation, expectedCallerRequestId, 'SAFE_CORRELATION_MISSING_OR_INVALID', status, 'CORRELATION_REQUEST_ID_MISMATCH'));
  }
  return {
    contractVersion: SAFE_CORRELATION_CONTRACT_VERSION,
    callerRequestId: correlation.callerRequestId,
    requestId: body.requestId,
    caseId: expectedCaseId,
    furthestExecutionReceipt: correlation.furthestExecutionReceipt,
    safeResponseGenerated: true,
    failureStage: correlation.failureStage,
    retryable: correlation.retryable
  };
}

type HdpRejectionCode = NonNullable<HdpRejectionDiagnostics['rejectionCode']>;
type HdpFirstFailureCode = NonNullable<HdpRejectionDiagnostics['firstFailureCode']>;
type HdpFinishReason = NonNullable<HdpRejectionDiagnostics['firstFinishReason']>;
type HdpCorrectionIneligibilityReason = NonNullable<HdpRejectionDiagnostics['correctionIneligibilityReason']>;
type HdpCorrectionResult = NonNullable<HdpRejectionDiagnostics['correctionResult']>;

const HDP_REJECTION_CODES = new Set<HdpRejectionCode>([
  'CONTENT_INTEGRITY',
  'HDP_UNSUPPORTED_CAPABILITY',
  'HDP_SOLUTION_RESTRAINT',
  'HDP_RESULT_STATE_CONTRACT',
  'VALIDATION_REJECTED'
]);
const HDP_FIRST_FAILURE_CODES = new Set<HdpFirstFailureCode>([
  'CONTENT_INTEGRITY',
  'HDP_UNSUPPORTED_CAPABILITY',
  'HDP_SOLUTION_RESTRAINT',
  'HDP_RESULT_STATE_CONTRACT',
  'VALIDATION_REJECTED'
]);
const HDP_FINISH_REASONS = new Set<HdpFinishReason>(['STOP', 'MAX_TOKENS', 'SAFETY', 'RECITATION', 'NOT_SUPPLIED', 'OTHER']);
const HDP_CORRECTION_INELIGIBILITY = new Set<HdpCorrectionIneligibilityReason>(['NONE', 'MAX_TOKENS', 'CONTENT_INTEGRITY']);
const HDP_CORRECTION_RESULTS = new Set<HdpCorrectionResult>(['REJECTED', 'NOT_ATTEMPTED']);

function allowlistedValue<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase() as T;
  return allowed.has(normalized) ? normalized : undefined;
}

export function sanitizeHdpRejectionDiagnostics(
  rejectionCode: unknown,
  raw: unknown
): HdpRejectionDiagnostics | undefined {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const safe: HdpRejectionDiagnostics = {
    rejectionCode: allowlistedValue(rejectionCode, HDP_REJECTION_CODES),
    firstFailureCode: allowlistedValue(source.firstFailureCode, HDP_FIRST_FAILURE_CODES),
    firstFinishReason: allowlistedValue(source.firstFinishReason, HDP_FINISH_REASONS),
    correctionEligible: typeof source.correctionEligible === 'boolean' ? source.correctionEligible : undefined,
    correctionAttempted: typeof source.correctionAttempted === 'boolean' ? source.correctionAttempted : undefined,
    correctionIneligibilityReason: allowlistedValue(source.correctionIneligibilityReason, HDP_CORRECTION_INELIGIBILITY),
    correctionResult: allowlistedValue(source.correctionResult, HDP_CORRECTION_RESULTS)
  };
  return Object.values(safe).some((value) => value !== undefined) ? safe : undefined;
}

function stringsFromSections(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, section]) => {
    if (typeof section === 'string' && section.trim()) return [`${key}: ${section.trim()}`];
    if (Array.isArray(section)) {
      return section.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => `${key}: ${item.trim()}`);
    }
    return [];
  });
}

function mapNfe(body: PlatformEnvelope, serviceCorrelation: ProtectedServiceCorrelation): NfeAnalysisOutput {
  const answer = typeof body.result?.answer === 'string' ? body.result.answer.trim() : '';
  if (!answer || body.validationStatus !== 'passed') {
    throw new ProtectedResearchError('Protected NFE did not return an accepted visible analysis.', 502, 'INVALID_NFE_RESULT');
  }
  return {
    requestId: body.requestId!,
    caseId: body.caseId,
    findings: [],
    answer,
    confidence: 'UNKNOWN',
    generatedAt: body.provenance?.executedAt || new Date().toISOString(),
    provenance: 'NFE_OS_ANALYSIS',
    providerMetadata: providerMetadata(body.provenance),
    serviceProvenance: safeProvenance(body.provenance),
    serviceCorrelation,
    executionStatus: body.executionStatus,
    validationStatus: body.validationStatus
  };
}

function mapHdp(body: PlatformEnvelope, serviceCorrelation: ProtectedServiceCorrelation): HdpDiscoveryOutput {
  if (body.executionStatus === 'rejected' && body.validationStatus === 'rejected' && body.outcome === 'validator_rejected' && body.result === null) {
    return {
      requestId: body.requestId!,
      caseId: body.caseId,
      discoveries: [],
      confidence: 'UNKNOWN',
      generatedAt: body.provenance?.executedAt || new Date().toISOString(),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: providerMetadata(body.provenance),
      serviceProvenance: safeProvenance(body.provenance),
      serviceCorrelation,
      executionStatus: 'rejected',
      validationStatus: 'rejected',
      rejected: true,
      rejectionCode: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)?.rejectionCode,
      rejectionReason: 'The HDP result was rejected by the authoritative validator.',
      rejectionDiagnostics: sanitizeHdpRejectionDiagnostics(body.error?.code, body.rejectionDiagnostics)
    };
  }

  if (!body.result || body.validationStatus !== 'passed') {
    throw new ProtectedResearchError('Protected HDP did not return an accepted discovery result.', 502, 'INVALID_HDP_RESULT');
  }

  const resultState = typeof body.result.resultState === 'string' ? body.result.resultState : undefined;
  const conclusion = typeof body.result.conclusion === 'string' ? body.result.conclusion : undefined;
  const sectionItems = stringsFromSections(body.result.sections);
  const discoveries = [...sectionItems];
  if (conclusion && !discoveries.includes(conclusion)) discoveries.push(conclusion);

  return {
    requestId: body.requestId!,
    caseId: body.caseId,
    discoveries,
    confidence: 'UNKNOWN',
    generatedAt: body.provenance?.executedAt || new Date().toISOString(),
    provenance: 'NFE_OS_ANALYSIS',
    providerMetadata: providerMetadata(body.provenance),
    serviceProvenance: safeProvenance(body.provenance),
    serviceCorrelation,
    executionStatus: body.executionStatus,
    validationStatus: body.validationStatus,
    resultState,
    discoveryClassification: typeof body.result.discoveryClassification === 'string' ? body.result.discoveryClassification : null,
    mechanismOrigin: typeof body.result.mechanismOrigin === 'string' ? body.result.mechanismOrigin : null,
    conclusion
  };
}

function readString(result: Record<string, unknown>, key: string) {
  const value = result[key];
  return typeof value === 'string' ? value.trim() : '';
}

function mapRrs(body: PlatformEnvelope, serviceCorrelation: ProtectedServiceCorrelation): RrsReviewOutput {
  if (!body.result || body.validationStatus !== 'passed') {
    throw new ProtectedResearchError('Protected RRS did not return an accepted review.', 502, 'INVALID_RRS_RESULT');
  }
  const result = body.result;
  const disposition = readString(result, 'disposition') || 'Review completed';
  const strongest = readString(result, 'strongestSupportedFeature');
  const weakness = readString(result, 'mostMaterialWeakness');
  const assessment = readString(result, 'assessment');
  const cross = readString(result, 'crossSystemAssessment');
  const hdpAssessment = readString(result, 'hdpAssessment');
  const disagreement = readString(result, 'systemDisagreement');
  const revision = readString(result, 'minimumUsefulRevision');
  const nextTest = readString(result, 'smallestNextTest');
  const humanDecision = readString(result, 'humanDecision') || 'Pending';

  return {
    requestId: body.requestId!,
    caseId: body.caseId,
    verdict: disposition,
    strengths: strongest ? [strongest] : [],
    concerns: [weakness, disagreement].filter(Boolean),
    recommendations: [revision, nextTest].filter(Boolean),
    assessment,
    crossSystemAssessment: cross,
    hdpAssessment,
    humanDecision,
    generatedAt: body.provenance?.executedAt || new Date().toISOString(),
    provenance: 'NFE_OS_ANALYSIS',
    providerMetadata: providerMetadata(body.provenance),
    serviceProvenance: safeProvenance(body.provenance),
    serviceCorrelation,
    executionStatus: body.executionStatus,
    validationStatus: body.validationStatus
  };
}

export async function executeProtectedResearch(
  request: PropertyScopeProtectedRequest,
  fetchImpl: typeof fetch = fetch
): Promise<{ status: number; body: NfeAnalysisOutput | HdpDiscoveryOutput | RrsReviewOutput }> {
  assertCaseContinuity(request);
  const { serviceUrl, token } = requireConfiguredService();
  const callerRequestId = generateCallerRequestId();
  const platformBody = buildPlatformBody(request, callerRequestId);

  let response: Response;
  try {
    response = await fetchImpl(serviceUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify(platformBody),
      cache: 'no-store'
    });
  } catch {
    throw new ProtectedResearchError('Protected research service could not be reached. Property data has been preserved.', 502, 'PROTECTED_SERVICE_NETWORK_FAILURE', true);
  }

  const data = await response.json().catch(() => null) as PlatformEnvelope | null;
  if (!data) {
    throw new ProtectedResearchError('Protected research service returned no usable response.', 502, 'INVALID_PROTECTED_SERVICE_RESPONSE', response.status >= 500);
  }

  const serviceCorrelation = validatePlatformCorrelation(
    data,
    request.payload.realEstateCaseId,
    request.operation,
    callerRequestId,
    response.status
  );

  if (response.status === 422 && request.operation === 'hdp.discovery') {
    return { status: 422, body: mapHdp(data, serviceCorrelation) };
  }

  if (!response.ok) {
    throw new ProtectedResearchError(
      data.error?.message || 'Protected research service could not complete the request.',
      response.status,
      data.error?.code || 'PROTECTED_SERVICE_FAILURE',
      Boolean(data.error?.retryable)
    );
  }

  if (request.operation === 'nfe.analysis') return { status: 200, body: mapNfe(data, serviceCorrelation) };
  if (request.operation === 'hdp.discovery') return { status: 200, body: mapHdp(data, serviceCorrelation) };
  return { status: 200, body: mapRrs(data, serviceCorrelation) };
}
