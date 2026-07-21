import type { EvidenceSourceCategory, EvidenceTruthClass } from './types';

export const MAX_EVIDENCE_FILES = 12;
export const MAX_EVIDENCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_EVIDENCE_FILE_SIZE_LABEL = '20 MB';

export const ACCEPTED_EVIDENCE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
} as const;

export const ACCEPT_ATTRIBUTE = Object.entries(ACCEPTED_EVIDENCE_TYPES)
  .flatMap(([mime, extensions]) => [mime, ...extensions])
  .join(',');

export const IMAGE_ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
export const DOCUMENT_ACCEPT_ATTRIBUTE = 'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,.pdf,.docx,.txt,.csv';

export const EVIDENCE_SOURCE_CATEGORIES: EvidenceSourceCategory[] = [
  'User photo',
  'User document',
  'Listing material',
  'Government record',
  'Survey or parcel material',
  'Business/project plan',
  'County or municipal correspondence',
  'Third-party report',
  'Conceptual material',
  'Unclassified evidence'
];

export const EVIDENCE_TRUTH_CLASSES: EvidenceTruthClass[] = [
  'FACT',
  'USER-PROVIDED CLAIM',
  'LISTING CLAIM',
  'PUBLIC-RECORD EVIDENCE',
  'ASSUMPTION',
  'AI-GENERATED ANALYSIS',
  'CONCEPTUAL PROJECTION',
  'HUMAN DECISION'
];

export function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/\.[a-z0-9]+$/);
  return match?.[0] ?? '';
}

export function isAllowedEvidenceFile(file: Pick<File, 'name' | 'type'>): boolean {
  const extension = extensionOf(file.name);
  const allowedExtensions = Object.values(ACCEPTED_EVIDENCE_TYPES).flat();
  if (!allowedExtensions.includes(extension as never)) return false;
  if (!file.type) return true;
  const expected = ACCEPTED_EVIDENCE_TYPES[file.type as keyof typeof ACCEPTED_EVIDENCE_TYPES];
  return Boolean(expected?.includes(extension as never));
}

export function defaultEvidenceCategory(file: Pick<File, 'type'>): EvidenceSourceCategory {
  return file.type.startsWith('image/') ? 'User photo' : 'User document';
}

export function defaultTruthClass(category: EvidenceSourceCategory): EvidenceTruthClass {
  if (category === 'Listing material') return 'LISTING CLAIM';
  if (category === 'Government record' || category === 'Survey or parcel material') return 'PUBLIC-RECORD EVIDENCE';
  if (category === 'Conceptual material') return 'CONCEPTUAL PROJECTION';
  return 'USER-PROVIDED CLAIM';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function sanitizeFilename(filename: string): string {
  const extension = extensionOf(filename);
  const base = filename.slice(0, extension ? -extension.length : undefined)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'evidence';
  return `${base}${extension}`;
}
