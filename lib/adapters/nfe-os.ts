import type { AnalysisFinding, EvidenceItem, SiteProject } from '../types';

export interface SiteAnalysisRequest {
  project: Pick<SiteProject, 'id' | 'name' | 'address' | 'primaryQuestion' | 'intendedUse' | 'apparentCurrentUse'>;
  evidence: EvidenceItem[];
}

export interface SiteAnalysisResponse {
  findings: AnalysisFinding[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  adapterVersion: string;
  generatedAt: string;
}

export interface NfeOsAdapter {
  analyzeSite(request: SiteAnalysisRequest): Promise<SiteAnalysisResponse>;
}

export class MockNfeOsAdapter implements NfeOsAdapter {
  async analyzeSite(request: SiteAnalysisRequest): Promise<SiteAnalysisResponse> {
    return {
      adapterVersion: 'mock-nfe-os-adapter-v0.1',
      generatedAt: new Date().toISOString(),
      confidence: request.evidence.length >= 4 ? 'MEDIUM' : 'LOW',
      findings: [
        { id: crypto.randomUUID(), category: 'MATTERS_MOST', statement: 'Official zoning, parcel geometry, access, utilities, and environmental constraints should be verified before a preferred development direction is treated as feasible.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'HIDDEN_FACTOR', statement: 'The most attractive visible use may not be the highest-value question; the smallest constraint that removes entire classes of options may deserve attention first.', importance: 'HIGH', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'ASSUMPTION', statement: `The question “${request.project.primaryQuestion}” currently assumes the available site information is sufficient to compare uses. That assumption is preliminary.`, importance: 'MEDIUM', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'OPPORTUNITY', statement: 'Preserve multiple scenario paths until high-impact evidence can eliminate infeasible options.', importance: 'MEDIUM', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'FAILURE_POINT', statement: 'A scenario could appear compelling while depending on unverified zoning, access, parking, utility, or site-capacity assumptions.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'MISSING_EVIDENCE', statement: 'Live authoritative property records are not connected in this MVP. Missing items must remain visibly unverified.', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'CONTROLLING_CONSTRAINT', statement: 'The first verified constraint capable of eliminating a use should control the next research step.', importance: 'HIGH', confidence: 'MEDIUM' },
        { id: crypto.randomUUID(), category: 'NEXT_QUESTION', statement: 'Which single official record or professional review would eliminate the greatest number of unsupported assumptions?', importance: 'HIGH', confidence: 'HIGH' },
        { id: crypto.randomUUID(), category: 'CONCLUSION_CHANGER', statement: 'A conflicting zoning rule, flood constraint, legal-access issue, environmental concern, or infeasible infrastructure requirement could materially change the conclusion.', importance: 'HIGH', confidence: 'HIGH' }
      ]
    };
  }
}
