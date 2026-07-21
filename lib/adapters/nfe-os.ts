import type {
  AdapterConnectionState,
  AnalysisFinding,
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
 * Builder #2 integration boundary.
 *
 * NFE PropertyScope owns this interface. The protected NFE-OS Platform does not.
 * This file must never import Platform app.js, DOM state, localStorage keys, browser
 * archive data, or private prompt/lineage internals.
 */

export const ACTIVE_NFE_ADAPTER_VERSION = 'mock-nfe-os-adapter-v0.2';

export function getConfiguredNfeConnectionState(): AdapterConnectionState {
  const mode = process.env.NEXT_PUBLIC_NFE_OS_ADAPTER_MODE?.toLowerCase();
  if (mode === 'live') return 'LIVE';
  if (mode === 'failed') return 'FAILED';
  if (mode === 'disconnected') return 'DISCONNECTED';
  return 'MOCK';
}

export function getNfeConnectionLabel(state = getConfiguredNfeConnectionState()): string {
  if (state === 'LIVE') return 'NFE-OS CONNECTION: LIVE';
  if (state === 'MOCK') return 'NFE-OS CONNECTION: MOCK — TEST OUTPUT ONLY';
  if (state === 'FAILED') return 'NFE-OS CONNECTION: UNAVAILABLE — RETRY';
  return 'NFE-OS CONNECTION: NOT CONNECTED';
}

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

export function buildRealEstateNfePayload(project: SiteProject, evidence: EvidenceItem[]): RealEstateNfePayload {
  const sourceMaterial = [
    `Property: ${project.name}`,
    `Address/location: ${project.address || project.locationDescription || 'Unknown'}`,
    `Question: ${project.primaryQuestion}`,
    `Intended use: ${project.intendedUse || 'Not specified'}`,
    `Apparent current use: ${project.apparentCurrentUse || 'Unknown'}`,
    '',
    'Evidence:',
    ...evidence.map((item) => `- [${item.provenance}] ${item.category}: ${item.title} — ${item.summary || item.value} (confidence: ${item.confidence}; verification required: ${item.verificationRequired ? 'yes' : 'no'})`)
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
      submittedAt: new Date().toISOString()
    }
  };
}

function mockProviderMetadata(): NfeProviderMetadata {
  return { provider: 'DEVELOPMENT / MOCK', model: 'No external model call', version: 'mock-contract-v0.2' };
}

export class MockNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = ACTIVE_NFE_ADAPTER_VERSION;
  readonly isMock = true;

  async runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput> {
    const confidence: Confidence = input.evidence.length >= 4 ? 'MEDIUM' : 'LOW';
    return {
      requestId: `mock-nfe-${crypto.randomUUID()}`,
      generatedAt: new Date().toISOString(),
      confidence,
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
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
    return {
      requestId: `mock-hdp-${crypto.randomUUID()}`,
      generatedAt: new Date().toISOString(),
      confidence: input.nfeAnalysis.confidence,
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
      discoveries: [
        'A highest-value next step may be identifying the first authoritative constraint that can eliminate multiple development scenarios at once.',
        'The hold/no-development option should remain visible until redevelopment economics are supported by evidence rather than assumed from visual opportunity alone.',
        'Site access, circulation, and parking may function as hidden capacity constraints even when the apparent parcel size looks favorable.'
      ]
    };
  }

  async runRrs(input: RrsRequest): Promise<RrsReviewOutput> {
    return {
      requestId: `mock-rrs-${crypto.randomUUID()}`,
      generatedAt: new Date().toISOString(),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: mockProviderMetadata(),
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
  baseUrl: string;
  apiKey?: string;
  paths?: {
    nfe?: string;
    hdp?: string;
    rrs?: string;
  };
}

/**
 * Future approved service implementation. Keep this server-side behind Builder #2's
 * own API routes when credentials are required. It has no default Platform URL and
 * performs no automatic retries. Endpoint changes remain localized here.
 */
export class RemoteNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'remote-nfe-os-adapter-v0.1';
  readonly isMock = false;
  private readonly config: NfeOsServiceConfig;

  constructor(config: NfeOsServiceConfig) {
    if (!config.baseUrl.trim()) throw new Error('An approved NFE-OS service base URL is required.');
    this.config = config;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {})
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`NFE-OS analysis is temporarily unavailable. Property data has been preserved. Service returned ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }

  runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput> {
    return this.post<NfeAnalysisOutput>(this.config.paths?.nfe ?? '/nfe/analyze', input);
  }

  runHdp(input: HdpRequest): Promise<HdpDiscoveryOutput> {
    return this.post<HdpDiscoveryOutput>(this.config.paths?.hdp ?? '/hdp/run', input);
  }

  runRrs(input: RrsRequest): Promise<RrsReviewOutput> {
    return this.post<RrsReviewOutput>(this.config.paths?.rrs ?? '/rrs/review', input);
  }
}

/**
 * Explicit unavailable implementation used when integration is disabled.
 * It deliberately has no default Platform URL and never retries automatically.
 */
export class UnavailableNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'unavailable-nfe-os-adapter-v0.1';
  readonly isMock = false;

  private unavailable(): never {
    throw new Error('NFE-OS analysis is temporarily unavailable. Property data has been preserved.');
  }

  async runNfeAnalysis(): Promise<NfeAnalysisOutput> { return this.unavailable(); }
  async runHdp(): Promise<HdpDiscoveryOutput> { return this.unavailable(); }
  async runRrs(): Promise<RrsReviewOutput> { return this.unavailable(); }
}

export function summarizeIntegrationRun(run: Pick<NfeOsIntegrationRun, 'nfeAnalysis' | 'hdpAnalysis' | 'rrsReview'>): string {
  const nfeCount = run.nfeAnalysis?.findings.length ?? 0;
  const hdpCount = run.hdpAnalysis?.discoveries.length ?? 0;
  const verdict = run.rrsReview?.verdict ?? 'RRS review unavailable.';
  return `NFE produced ${nfeCount} structured findings. HDP surfaced ${hdpCount} additional discovery signals. RRS conclusion: ${verdict}`;
}
