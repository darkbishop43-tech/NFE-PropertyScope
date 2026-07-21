'use client';

import type { PropertyAsset, PublicSystemStatus, SiteProject } from '../types';

export async function getPublicSystemStatus(): Promise<PublicSystemStatus> {
  const response = await fetch('/api/system/status', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to read PropertyScope system status.');
  return response.json() as Promise<PublicSystemStatus>;
}

export async function createPrivateProjectRecord(project: SiteProject, betaCode: string): Promise<void> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-propertyscope-beta-code': betaCode
    },
    body: JSON.stringify(project)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'The secure project record could not be created.');
  }
}

export async function uploadPrivateEvidence(
  projectId: string,
  asset: PropertyAsset,
  file: File,
  betaCode: string
): Promise<PropertyAsset> {
  const form = new FormData();
  form.set('propertyCaseId', projectId);
  form.set('evidenceItemId', asset.evidenceItemId || asset.id);
  form.set('sourceCategory', asset.sourceCategory || 'Unclassified evidence');
  form.set('sourceDescription', asset.sourceDescription || '');
  form.set('verificationStatus', asset.verificationStatus || 'Unreviewed');
  form.set('truthClass', asset.truthClass || 'USER-PROVIDED CLAIM');
  form.set('file', file);

  const response = await fetch('/api/evidence/upload', {
    method: 'POST',
    headers: { 'x-propertyscope-beta-code': betaCode },
    body: form
  });
  const body = await response.json().catch(() => ({})) as { asset?: PropertyAsset; error?: string };
  if (!response.ok || !body.asset) throw new Error(body.error || 'Evidence upload failed.');
  return body.asset;
}
