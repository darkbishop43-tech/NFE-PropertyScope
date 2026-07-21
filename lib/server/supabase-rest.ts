const STORAGE_BUCKET = process.env.PROPERTYSCOPE_PRIVATE_STORAGE_BUCKET || 'property-evidence';

export function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}

export function privateStorageIsConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function serviceHeaders(extra?: HeadersInit): HeadersInit {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Secure storage is not configured.');
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    ...extra
  };
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getSupabaseUrl()}${path}`, {
    ...init,
    headers: serviceHeaders(init.headers),
    cache: 'no-store'
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Private storage operation failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function encodeStoragePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export async function uploadPrivateObject(path: string, bytes: ArrayBuffer, mimeType: string): Promise<void> {
  const response = await fetch(`${getSupabaseUrl()}/storage/v1/object/${encodeURIComponent(STORAGE_BUCKET)}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: serviceHeaders({
      'content-type': mimeType,
      'x-upsert': 'false'
    }),
    body: bytes,
    cache: 'no-store'
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Private evidence upload failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
}

export async function createSignedObjectUrl(path: string, expiresIn = 300): Promise<string> {
  const result = await supabaseRest<{ signedURL?: string; signedUrl?: string }>(
    `/storage/v1/object/sign/${encodeURIComponent(STORAGE_BUCKET)}/${encodeStoragePath(path)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn })
    }
  );
  const signed = result.signedURL || result.signedUrl;
  if (!signed) throw new Error('Temporary evidence access could not be created.');
  return signed.startsWith('http') ? signed : `${getSupabaseUrl()}${signed}`;
}

export { STORAGE_BUCKET };
