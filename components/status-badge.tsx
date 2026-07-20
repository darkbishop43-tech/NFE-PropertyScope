import type { Confidence, EvidenceTone, ProvenanceType } from '@/lib/types';

export function StatusBadge({ tone, label }: { tone: EvidenceTone; label: string }) {
  return <span className={`badge badge-${tone.toLowerCase()}`}>{label}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className="badge badge-neutral">Confidence: {confidence}</span>;
}

export function ProvenanceBadge({ provenance }: { provenance: ProvenanceType }) {
  return <span className="badge badge-outline">{provenance.replaceAll('_', ' ')}</span>;
}
