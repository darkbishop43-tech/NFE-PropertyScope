import 'server-only';
import type { HdpRequest, NfeOsAdapter, RealEstateNfePayload, RrsRequest } from '@/lib/adapters/nfe-os';
import type { Confidence, HdpDiscoveryOutput, NfeAnalysisOutput, NfeProviderMetadata, RrsReviewOutput } from '@/lib/types';

const DEFAULT_SERVICE_URL = 'https://nfe-1-0-sandbox.vercel.app/api/research';

export class RemoteNfeOsRejectedError extends Error {
  constructor(public readonly operation: string, public readonly httpStatus: number, public readonly provenance: Record<string, unknown>) {
    super(`${operation} was rejected by the authoritative PLATFORM validation boundary.`);
  }
}

export class RemoteNfeOsServiceError extends Error {
  constructor(public readonly operation: string, public readonly httpStatus: number, public readonly provenance: Record<string, unknown>, message: string) {
    super(message);
  }
}

function serviceConfig() {
  const url = process.env.NFE_OS_RESEARCH_SERVICE_URL ?? DEFAULT_SERVICE_URL;
  const token = process.env.NFE_OS_RESEARCH_SERVICE_TOKEN ?? '';
  if (!token) throw new RemoteNfeOsServiceError('configuration', 503, {}, 'PropertyScope LIVE RESEARCH service credential is not configured.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new RemoteNfeOsServiceError('configuration', 503, {}, 'PropertyScope LIVE RESEARCH service URL must use HTTPS.');
  return { url: parsed.toString(), token };
}

function safeProvider(provenance: any): NfeProviderMetadata {
  const provider = provenance?.provider && typeof provenance.provider === 'object' ? provenance.provider : {};
  return {
    provider: typeof provider.provider === 'string' ? provider.provider : 'NFE-OS Protected Research Service',
    model: typeof provider.model === 'string' ? provider.model : undefined,
    version: typeof provenance?.componentVersion === 'string' ? provenance.componentVersion : typeof provenance?.serviceVersion === 'string' ? provenance.serviceVersion : undefined,
  };
}

function generatedAt(body: any) {
  return typeof body?.provenance?.executedAt === 'string' ? body.provenance.executedAt : new Date().toISOString();
}

function requestId(body: any) {
  return typeof body?.requestId === 'string' ? body.requestId : crypto.randomUUID();
}

function confidenceFromQualification(body: any): Confidence {
  if (body?.executionStatus === 'accepted_with_qualification') return 'MEDIUM';
  return 'HIGH';
}

function visibleSectionStrings(sections: unknown): string[] {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return [];
  const values: string[] = [];
  for (const value of Object.values(sections as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) values.push(value.trim());
    if (Array.isArray(value)) for (const item of value) if (typeof item === 'string' && item.trim()) values.push(item.trim());
  }
  return [...new Set(values)];
}

function safeProvenance(body: any) {
  return body?.provenance && typeof body.provenance === 'object' ? body.provenance as Record<string, unknown> : {};
}

export class RemoteNfeOsAdapter implements NfeOsAdapter {
  readonly adapterVersion = 'remote-nfe-os-adapter-phase-a-v0.1';
  readonly isMock = false;

  private async post(operation: 'nfe.analysis' | 'hdp.discovery' | 'rrs.review', input: Record<string, unknown>, options: Record<string, unknown>) {
    const { url, token } = serviceConfig();
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operation, requestId: `SCOPE-${crypto.randomUUID()}`, caseId: `SCOPE-CASE-${crypto.randomUUID()}`, input, options }),
        cache: 'no-store',
      });
    } catch {
      throw new RemoteNfeOsServiceError(operation, 502, {}, 'The protected NFE-OS service could not be reached. Property data remains preserved.');
    }

    const body = await response.json().catch(() => null) as any;
    const provenance = safeProvenance(body);
    if (response.status === 422 && body?.executionStatus === 'rejected' && body?.validationStatus === 'rejected' && body?.result === null) {
      throw new RemoteNfeOsRejectedError(operation, 422, provenance);
    }
    if (!response.ok || body?.executionStatus === 'failed') {
      throw new RemoteNfeOsServiceError(operation, response.status || 502, provenance, 'The protected NFE-OS service did not complete an accepted result. Property data remains preserved.');
    }
    if (!['accepted', 'accepted_with_qualification'].includes(body?.executionStatus) || body?.validationStatus !== 'passed' || !body?.result) {
      throw new RemoteNfeOsServiceError(operation, 502, provenance, 'The protected NFE-OS service returned an invalid external response envelope.');
    }
    return body;
  }

  async runNfeAnalysis(input: RealEstateNfePayload): Promise<NfeAnalysisOutput> {
    const body = await this.post('nfe.analysis', { source: input.sourceMaterial }, { runwayMode: 'extended' });
    const answer = typeof body.result.answer === 'string' ? body.result.answer : '';
    if (!answer) throw new RemoteNfeOsServiceError('nfe.analysis', 502, safeProvenance(body), 'Accepted NFE response did not contain visible output.');
    return {
      requestId: requestId(body),
      generatedAt: generatedAt(body),
      confidence: confidenceFromQualification(body),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: safeProvider(body.provenance),
      findings: [{ id: crypto.randomUUID(), category: 'MATTERS_MOST', statement: answer, importance: 'HIGH', confidence: confidenceFromQualification(body) }],
    };
  }

  async runHdp(input: HdpRequest): Promise<HdpDiscoveryOutput> {
    const existingAnswer = input.nfeAnalysis.findings.map((finding) => finding.statement).join('\n\n');
    const body = await this.post('hdp.discovery', { source: input.payload.sourceMaterial, existingAnswer }, { depth: 'Standard Discovery', runwayMode: 'extended' });
    const discoveries = visibleSectionStrings(body.result.sections);
    if (typeof body.result.conclusion === 'string' && body.result.conclusion.trim()) discoveries.push(body.result.conclusion.trim());
    return {
      requestId: requestId(body),
      generatedAt: generatedAt(body),
      confidence: confidenceFromQualification(body),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: safeProvider(body.provenance),
      discoveries: [...new Set(discoveries)],
    };
  }

  async runRrs(input: RrsRequest): Promise<RrsReviewOutput> {
    const nfeOutput = input.nfeAnalysis.findings.map((finding) => finding.statement).join('\n\n');
    const hdpOutput = input.hdpAnalysis.discoveries.join('\n\n');
    const body = await this.post('rrs.review', {
      material: `${nfeOutput}\n\n${hdpOutput}`,
      source: input.payload.sourceMaterial,
      nfeOutput,
      hdpOutput,
      suppliedEvidence: input.payload.evidence.map((item) => `${item.title}: ${item.summary || item.value}`).join('\n'),
    }, {
      targetType: 'NFE + HDP Combined Review',
      includedMaterials: ['Original property source', 'NFE Analysis', 'HDP Discovery'],
      externalVerification: 'Not performed',
      depth: 'Standard Review',
      runwayMode: 'extended',
    });

    const result = body.result as Record<string, unknown>;
    const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' && value.trim() ? [value.trim()] : [];
    return {
      requestId: requestId(body),
      generatedAt: generatedAt(body),
      provenance: 'NFE_OS_ANALYSIS',
      providerMetadata: safeProvider(body.provenance),
      verdict: typeof result.disposition === 'string' ? result.disposition : typeof result.assessment === 'string' ? result.assessment : 'Qualified private research review.',
      strengths: strings(result.strongestSupportedFeature),
      concerns: [...strings(result.mostMaterialWeakness), ...strings(result.systemDisagreement)],
      recommendations: [...strings(result.minimumUsefulRevision), ...strings(result.smallestNextTest)],
    };
  }
}
