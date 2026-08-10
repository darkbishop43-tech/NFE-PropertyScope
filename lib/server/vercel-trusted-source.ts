export const VERCEL_OIDC_REQUEST_HEADER = 'x-vercel-oidc-token' as const;
export const VERCEL_TRUSTED_SOURCE_HEADER = 'x-vercel-trusted-oidc-idp-token' as const;

export class TrustedSourceAuthError extends Error {
  readonly code = 'TRUSTED_SOURCE_AUTH_UNAVAILABLE' as const;

  constructor() {
    super('Trusted-source authentication is unavailable for this protected request.');
    this.name = 'TrustedSourceAuthError';
  }
}

export function requireVercelOidcToken(headers: Pick<Headers, 'get'>) {
  const token = String(headers.get(VERCEL_OIDC_REQUEST_HEADER) || '').trim();
  if (!token) throw new TrustedSourceAuthError();
  return token;
}

export function createVercelTrustedSourceFetch(
  oidcToken: string,
  fetchImpl: typeof fetch = fetch
): typeof fetch {
  const token = String(oidcToken || '').trim();
  if (!token) throw new TrustedSourceAuthError();

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    headers.set(VERCEL_TRUSTED_SOURCE_HEADER, token);
    return fetchImpl(input, { ...init, headers });
  };
}
