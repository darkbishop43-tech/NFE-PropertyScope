import type {
  HdpDiscoveryOutput,
  NfeAnalysisOutput,
  NfeProviderMetadata,
  ProtectedServiceProvenance,
  RrsReviewOutput
} from '../types';
import type { RealEstateNfePayload } from '../adapters/nfe-os';

export type ProtectedResearchOperation = 'nfe.analysis' | 'hdp.discovery' | 'rrs.review';

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
  provenance?: PlatformProvenance;
}

export class ProtectedResearchError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, status = 502, code = 'PROTECTED_RESEARCH_FAILURE', retryable = false) {
    super(message);
    this.name = 'ProtectedResearchError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
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

function requestIdFor(payload: RealEstateNfePayload, operation: ProtectedResearchOperation) {
  const prefix = payload.metadata.runCorrelationId || crypto.randomUUID();
  const suffix = operation === 'nfe.analysis' ? 'nfe' : operation === 'hdp.discovery' ? 'hdp' : 'rrs';
  return `PS-${prefix}-${suffix}-${crypto.randomUUID()}`;
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

function buildPlatformBody(request: PropertyScopeProtectedRequest) {
  const caseId = request.payload.realEstateCaseId;
  const requestId = requestIdFor(request.payload, request.operation);

  if (request.operation === 'nfe.analysis') {
    return {
      operation: 'nfe.analysis',
      requestId,
      caseId,
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
      operation: 'hdp.discovery',
      requestId,
      caseId,
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
    operation: 'rrs.review',
    requestId,
    caseId,
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

function validatePlatformCorrelation(body: PlatformEnvelope, expectedCaseId: string, operation: ProtectedResearchOperation) {
  if (!body.requestId || body.caseId !== expectedCaseId || body.module !== operation) {
    throw new ProtectedResearchError(
      'Protected service response correlation did not match the active PropertyScope case.',
      502,
      'PLATFORM_CORRELATION_MISMATCH'
    );
  }
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

function mapNfe(body: PlatformEnvelope): NfeAnalysisOutput {
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
    executionStatus: body.executionStatus,
    validationStatus: body.validationStatus
  };
}

function mapHdp(body: PlatformEnvelope): HdpDiscoveryOutput {
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
      executionStatus: 'rejected',
      validationStatus: 'rejected',
      rejected: true,
      rejectionCode: body.error?.code || 'VALIDATOR_REJECTED',
      rejectionReason: body.error?.message || 'The HDP result was rejected by the authoritative validator.'
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

function mapRrs(body: PlatformEnvelope): RrsReviewOutput {
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
  const platformBody = buildPlatformBody(request);

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

  validatePlatformCorrelation(data, request.payload.realEstateCaseId, request.operation);

  if (response.status === 422 && request.operation === 'hdp.discovery') {
    return { status: 422, body: mapHdp(data) };
  }

  if (!response.ok) {
    throw new ProtectedResearchError(
      data.error?.message || 'Protected research service could not complete the request.',
      response.status,
      data.error?.code || 'PROTECTED_SERVICE_FAILURE',
      Boolean(data.error?.retryable)
    );
  }

  if (request.operation === 'nfe.analysis') return { status: 200, body: mapNfe(data) };
  if (request.operation === 'hdp.discovery') return { status: 200, body: mapHdp(data) };
  return { status: 200, body: mapRrs(data) };
}
