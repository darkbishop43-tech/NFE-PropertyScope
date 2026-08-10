import type {
  Confidence,
  EvidenceItem,
  HdpDiscoveryOutput,
  NfeAnalysisOutput,
  NfeOsIntegrationRun,
  NfeProviderMetadata,
  RrsReviewOutput,
  SiteProject
} from '../types';

/**
 * PropertyScope integration boundary.
 *
 * This module owns only PropertyScope request/response mapping. It must never
 * import PLATFORM source, prompts, validators, DOM state, browser archives, or
 * protected NFE/HDP/RRS implementation details.
 */
export interface RealEstateNfePayload {
  domain: 'real-estate';
  realEstateCaseId: string;
  caseTitle: string;
  question: string;
  sourceMaterial: string;
  evidence: EvidenceItem[];
  metadata: {
    address?: string;
    intendedUse?: string;
    apparentCurrentUse?: string;
    submittedAt: string;
    runCorrelationId?: string;
  };
}

export interface HdpRequest {
  payload: RealEstateNfePayload;
  nfeAnalysis: NfeAnalysisOutput;
}

export interface RrsRequest {
  payload: RealEstateNfePayload;
  nfeAnalysis: NfeAnalysisOutput;
  hdpAnalysis: HdpDiscoveryOutput;
}

export interface NfeOsAdapter {
  readonly adapterVersion: string;
  readonly isMock: boolean;
  runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput>;
  runHdp(input: HdpRequest): Promise<HdpDiscoveryOutput>;
  runRrs(input: RrsRequest): Promise<RrsReviewOutput>;
}

export function buildRealEstateNfePayload(
  project: SiteProject,
  evidence: EvidenceItem[],
  runCorrelationId?: string
): RealEstateNfePayload {
  const sourceMaterial = [
    `Property: ${project.name}`,
    `PropertyScope case ID: ${project.id}`,
    `Address/location: ${project.address || project.locationDescription || 'Unknown'}`,
    `Question: ${project.primaryQuestion}`,
    `Parcel/listing reference: ${project.parcelId || project.listingUrl || 'Not supplied'}`,
    `Intended use: ${project.intendedUse || 'Not specified'}`,
    `Apparent current use: ${project.apparentCurrentUse || 'Unknown'}`,
    '',
    'Evidence supplied to PropertyScope:',
    ...(evidence.length
      ? evidence.map((item) => `- [${item.provenance}] ${item.category}: ${item.title} — ${item.summary || item.value} (confidence: ${item.confidence}; verification required: ${item.verificationRequired ? 'yes' : 'no'})`)
      : ['- No structured evidence items are currently attached.'])
  ].join('\n');

  return {
    domain: 'real-estate',
    realEstateCaseId: project.id,
    caseTitle: project.name,
    question: project.primaryQuestion,
    sourceMaterial,
    evidence,
    metadata: {
      address: project.address || project.locationDescription,
      intendedUse: project.intendedUse,
      apparentCurrentUse: project.apparentCurrentUse,
      submittedAt: new Date().toISOString(),
      runCorrelationId
    }
  };
}

function mockProviderMetadata(): NfeProviderMetadata {
  return {
    provider: 'DEVELOPMENT / MOCK',
    model: 'No external model call',
    version: 'mock-contract-v0.3',
    service: 'PropertyScope MockNfeOsAdapter'
  };
}

export class MockNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'mock-nfe-os-adapter-v0.3';
  readonly isMock = true;

  async runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput> {
    const confidence: Confidence = input.evidence.length >= 4 ? 'MEDIUM' : 'LOW';
    return {
      requestId: `mock-nfe-${crypto.randomUUID()}`,
      caseId: input.realEstateCaseId,
      generatedAt: new Date().toISOString(),
      confidence,
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
      executionStatus: 'accepted',
      validationStatus: 'passed',
      findings: [
        { id: crypto.randomUUID(), category: 'MATTERS_MOST', statement: 'Official zoning, parcel geometry, access, utilities, and environmental constraints should be verified before a preferred development direction is treated as feasible.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'HIDDEN_FACTOR', statement: 'The most attractive visible use may not be the highest-value question; the smallest constraint that removes entire classes of options may deserve attention first.', importance: 'HIGH', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'ASSUMPTION', statement: `The question “${input.question}” currently assumes the available site information is sufficient to compare uses. That assumption is preliminary.`, importance: 'MEDIUM', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'OPPORTUNITY', statement: 'Preserve multiple scenario paths until high-impact evidence can eliminate infeasible options.', importance: 'MEDIUM', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'FAILURE_POINT', statement: 'A scenario could appear compelling while depending on unverified zoning, access, parking, utility, or site-capacity assumptions.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'MISSING_EVIDENCE', statement: 'Live authoritative property records are not connected in this MVP. Missing items must remain visibly unverified.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'CONTROLLING_CONSTRAINT', statement: 'The first verified constraint capable of eliminating a use should control the next research step.', importance: 'HIGH', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'NEXT_QUESTION', statement: 'Which single official record or professional review would eliminate the greatest number of unsupported assumptions?', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'CONCLUSION_CHANGER', statement: 'A conflicting zoning rule, flood constraint, legal-access issue, environmental concern, or infeasible infrastructure requirement could materially change the conclusion.', importance: 'HIGH', confidence: 'HIGH' }
      ]
    };
  }

  async runHdp(input: HdpRequest): Promise<HdpDiscoveryOutput> {
    if (input.nfeAnalysis.caseId && input.nfeAnalysis.caseId !== input.payload.realEstateCaseId) {
      throw new Error('PropertyScope case correlation failed before HDP. No request was sent.');
    }
    return {
      requestId: `mock-hdp-${crypto.randomUUID()}`,
      caseId: input.payload.realEstateCaseId,
      generatedAt: new Date().toISOString(),
      confidence: input.nfeAnalysis.confidence,
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
      executionStatus: 'accepted',
      validationStatus: 'passed',
      resultState: 'mock_discovery',
      discoveries: [
        'A highest-value next step may be identifying the first authoritative constraint that can eliminate multiple development scenarios at once.',
        'The hold/no-development option should remain visible until redevelopment economics are supported by evidence rather than assumed from visual opportunity alone.',
        'Site access, circulation, and parking may function as hidden capacity constraints even when the apparent parcel size looks favorable.'
      ]
    };
  }

  async runRrs(input: RrsRequest): Promise<RrsReviewOutput> {
    if (input.nfeAnalysis.caseId && input.nfeAnalysis.caseId !== input.payload.realEstateCaseId) {
      throw new Error('PropertyScope case correlation failed before RRS. No request was sent.');
    }
    if (input.hdpAnalysis.caseId && input.hdpAnalysis.caseId !== input.payload.realEstateCaseId) {
      throw new Error('PropertyScope case correlation failed before RRS. No request was sent.');
    }
    if (input.hdpAnalysis.rejected || input.hdpAnalysis.validationStatus === 'rejected') {
      throw new Error('RRS was not run because the HDP result was rejected.');
    }
    return {
      requestId: `mock-rrs-${crypto.randomUUID()}`,
      caseId: input.payload.realEstateCaseId,
      generatedAt: new Date().toISOString(),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
      executionStatus: 'accepted',
      validationStatus: 'passed',
      verdict: 'Structured preliminary decision support; material verification gaps remain.',
      strengths: [
        'The analysis keeps uncertainty visible instead of converting missing property data into assumed facts.',
        'Multiple development scenarios remain open for human comparison rather than being collapsed into an automatic winner.'
      ],
      concerns: [
        'Authoritative zoning, parcel, access, utility, environmental, and market evidence are not connected in the current MVP.',
        'No financial, appraisal, underwriting, legal, engineering, or regulatory conclusion can be supported from the mock evidence set.'
      ],
      recommendations: [
        'Verify the highest-impact controlling constraint before increasing design or diligence spending.',
        'Treat all current NFE/HDP/RRS outputs as DEVELOPMENT / MOCK until an approved external NFE-OS service contract is connected.'
      ]
    };
  }
}

export interface NfeOsServiceConfig {
  propertyScopeRoute?: string;
}

type ProtectedClientOperation = 'nfe.analysis' | 'hdp.discovery' | 'rrs.review';

/**
 * Browser-safe remote adapter. This class never holds a PLATFORM credential and
 * never calls PLATFORM directly. It calls PropertyScope's own trusted server
 * route, which owns the approved server-to-server bearer boundary.
 */
export class RemoteNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'remote-nfe-os-adapter-protected-v0.1';
  readonly isMock = false;
  private readonly route: string;

  constructor(config: NfeOsServiceConfig = {}) {
    this.route = config.propertyScopeRoute || '/api/nfe-os/research';
  }

  private async post<T extends { caseId?: string }>(
    operation: ProtectedClientOperation,
    body: Record<string, unknown>,
    expectedCaseId: string,
    allowRejected = false
  ): Promise<T> {
    const response = await fetch(this.route, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ operation, ...body })
    });

    const data = await response.json().catch(() => null) as (T & { error?: { message?: string } }) | null;
    const rejected = response.status === 422 && allowRejected && data;

    if (!response.ok && !rejected) {
      throw new Error(
        data?.error?.message
          || `NFE-OS analysis is temporarily unavailable. Property data has been preserved. Service returned ${response.status}.`
      );
    }

    if (!data) {
      throw new Error('NFE-OS returned no usable response. Property data has been preserved.');
    }

    if (data.caseId !== expectedCaseId) {
      throw new Error('Protected analysis case correlation mismatch. Property data has been preserved and the result was not accepted.');
    }

    return data;
  }

  runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput> {
    return this.post<NfeAnalysisOutput>('nfe.analysis', { payload: input }, input.realEstateCaseId);
  }

  runHdp(input: HdpRequest): Promise<HdpDiscoveryOutput> {
    return this.post<HdpDiscoveryOutput>(
      'hdp.discovery',
      { payload: input.payload, nfeAnalysis: input.nfeAnalysis },
      input.payload.realEstateCaseId,
      true
    );
  }

  runRrs(input: RrsRequest): Promise<RrsReviewOutput> {
    return this.post<RrsReviewOutput>(
      'rrs.review',
      { payload: input.payload, nfeAnalysis: input.nfeAnalysis, hdpAnalysis: input.hdpAnalysis },
      input.payload.realEstateCaseId
    );
  }
}

/** Explicit unavailable implementation used when integration is disabled. */
export class UnavailableNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'unavailable-nfe-os-adapter-v0.2';
  readonly isMock = false;

  private unavailable(): never {
    throw new Error('NFE-OS analysis is temporarily unavailable. Property data has been preserved.');
  }

  async runNfeAnalysis(): Promise<NfeAnalysisOutput> { return this.unavailable(); }
  async runHdp(): Promise<HdpDiscoveryOutput> { return this.unavailable(); }
  async runRrs(): Promise<RrsReviewOutput> { return this.unavailable(); }
}

export function summarizeIntegrationRun(
  run: Pick<NfeOsIntegrationRun, 'nfeAnalysis' | 'hdpAnalysis' | 'rrsReview'>
): string {
  const nfe = run.nfeAnalysis?.answer
    ? 'NFE returned a protected visible analysis.'
    : `NFE produced ${run.nfeAnalysis?.findings.length ?? 0} structured findings.`;
  const hdp = run.hdpAnalysis?.resultState
    ? `HDP result state: ${run.hdpAnalysis.resultState}.`
    : `HDP surfaced ${run.hdpAnalysis?.discoveries.length ?? 0} discovery signals.`;
  const rrs = run.rrsReview?.verdict ?? 'RRS review unavailable.';
  return `${nfe} ${hdp} RRS conclusion: ${rrs}`;
}
