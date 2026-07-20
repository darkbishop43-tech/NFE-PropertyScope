import type { EvidenceItem } from '../types';

export interface PropertyDataAdapter {
  getEvidence(address: string): Promise<EvidenceItem[]>;
}

export class MockPropertyDataAdapter implements PropertyDataAdapter {
  async getEvidence(address: string): Promise<EvidenceItem[]> {
    const date = new Date().toISOString().slice(0, 10);
    return [
      { id: crypto.randomUUID(), category: 'Zoning', title: 'Zoning', value: 'Not Yet Retrieved', summary: `No authoritative zoning source is connected for ${address || 'this location'}.`, status: 'UNKNOWN', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'PUBLIC_DATA', retrievedAt: date },
      { id: crypto.randomUUID(), category: 'Parcel / Assessor', title: 'Parcel information', value: 'Not Yet Retrieved', summary: 'Parcel and assessor integrations are pending.', status: 'UNKNOWN', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'PUBLIC_DATA', retrievedAt: date },
      { id: crypto.randomUUID(), category: 'Flood Risk', title: 'Flood information', value: 'Not Yet Retrieved', summary: 'Flood data integration is pending.', status: 'UNKNOWN', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'PUBLIC_DATA', retrievedAt: date },
      { id: crypto.randomUUID(), category: 'Utilities', title: 'Utility capacity', value: 'Needs Verification', summary: 'Utility availability and capacity require source confirmation and may require provider contact.', status: 'UNCERTAIN', confidence: 'UNKNOWN', verificationRequired: true, provenance: 'AI_INFERENCE', retrievedAt: date }
    ];
  }
}
