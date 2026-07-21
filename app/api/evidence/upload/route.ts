import { NextRequest, NextResponse } from 'next/server';
import {
  extensionOf,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  sanitizeFilename
} from '@/lib/evidence-config';
import { getBetaTester } from '@/lib/server/beta-access';
import { privateStorageIsConfigured, supabaseRest, uploadPrivateObject } from '@/lib/server/supabase-rest';
import { checkRateLimit } from '@/lib/server/rate-limit';
import type { EvidenceSourceCategory, EvidenceTruthClass, PropertyAsset, VerificationState } from '@/lib/types';

const allowed = new Map<string, string[]>([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['application/pdf', ['.pdf']],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['.docx']],
  ['text/plain', ['.txt']],
  ['text/csv', ['.csv']]
]);

function validUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mimeAndExtensionAllowed(file: File): boolean {
  const extension = extensionOf(file.name);
  if (!allowed.has(file.type)) return false;
  return allowed.get(file.type)?.includes(extension) ?? false;
}

function magicMatches(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === 'image/png') return bytes.slice(0, 8).every((value, index) => value === [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a][index]);
  if (mimeType === 'image/webp') return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (mimeType === 'application/pdf') return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
  if (mimeType.includes('wordprocessingml')) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  if (mimeType === 'text/plain' || mimeType === 'text/csv') return !bytes.slice(0, 2048).some((value) => value === 0);
  return false;
}

export async function POST(request: NextRequest) {
  if (!privateStorageIsConfigured()) return NextResponse.json({ error: 'Secure private storage is not configured.' }, { status: 503 });
  const tester = getBetaTester(request);
  if (!tester) return NextResponse.json({ error: 'Controlled beta access is required for permanent file storage.' }, { status: 401 });
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rate = checkRateLimit(`${tester.id}:${forwarded}:evidence`, 30, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Upload rate limit reached. Retry later.' },
      { status: 429, headers: { 'retry-after': String(rate.retryAfterSeconds) } }
    );
  }

  const form = await request.formData();
  const file = form.get('file');
  const propertyCaseId = String(form.get('propertyCaseId') || '');
  const evidenceItemId = String(form.get('evidenceItemId') || '');
  if (!(file instanceof File) || !validUuid(propertyCaseId) || !validUuid(evidenceItemId)) {
    return NextResponse.json({ error: 'Invalid evidence upload request.' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'The file is empty or exceeds the 20 MB maximum.' }, { status: 413 });
  }
  if (!mimeAndExtensionAllowed(file)) {
    return NextResponse.json({ error: 'Unsupported or mismatched evidence file type.' }, { status: 415 });
  }

  const projectRows = await supabaseRest<Array<{ id: string; owner_id: string }>>(
    `/rest/v1/site_projects?id=eq.${encodeURIComponent(propertyCaseId)}&select=id,owner_id&limit=1`
  );
  if (!projectRows[0] || projectRows[0].owner_id !== tester.id) {
    return NextResponse.json({ error: 'This tester does not own the requested investigation.' }, { status: 403 });
  }
  const existingAssets = await supabaseRest<Array<{ id: string }>>(
    `/rest/v1/property_assets?project_id=eq.${encodeURIComponent(propertyCaseId)}&select=id`
  );
  if (existingAssets.length >= 12) {
    return NextResponse.json({ error: 'Maximum 12 evidence files per investigation.' }, { status: 409 });
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 4096)));
  if (!magicMatches(file.type, bytes)) {
    return NextResponse.json({ error: 'File content does not match the declared file type.' }, { status: 415 });
  }

  const sanitized = sanitizeFilename(file.name);
  const objectId = crypto.randomUUID();
  const storagePath = `${tester.id}/${propertyCaseId}/${objectId}-${sanitized}`;
  await uploadPrivateObject(storagePath, buffer, file.type);

  const sourceCategory = String(form.get('sourceCategory') || 'Unclassified evidence') as EvidenceSourceCategory;
  const sourceDescription = String(form.get('sourceDescription') || '');
  const verificationStatus = String(form.get('verificationStatus') || 'Unreviewed') as VerificationState;
  const truthClass = String(form.get('truthClass') || 'USER-PROVIDED CLAIM') as EvidenceTruthClass;
  const uploadedAt = new Date().toISOString();

  await supabaseRest('/rest/v1/property_assets', {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify({
      id: evidenceItemId,
      project_id: propertyCaseId,
      asset_type: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
      file_url: storagePath,
      storage_object_reference: storagePath,
      original_filename: file.name,
      sanitized_filename: sanitized,
      mime_type: file.type,
      byte_size: file.size,
      upload_timestamp: uploadedAt,
      uploader_id: tester.id,
      source_category: sourceCategory,
      source_description: sourceDescription || null,
      upload_status: 'SAVED_PRIVATE',
      verification_status: verificationStatus,
      provenance_label: sourceCategory,
      truth_class: truthClass,
      is_primary: false,
      provenance: 'USER_PROVIDED'
    })
  });

  const asset: PropertyAsset = {
    id: evidenceItemId,
    evidenceItemId,
    type: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
    filename: file.name,
    originalFilename: file.name,
    sanitizedFilename: sanitized,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedAt,
    isPrimary: false,
    provenance: 'USER_PROVIDED',
    sourceCategory,
    sourceDescription,
    truthClass,
    verificationStatus,
    uploadStatus: 'SAVED_PRIVATE',
    storageObjectRef: storagePath,
    localPreviewAvailable: false
  };
  return NextResponse.json({ asset });
}
