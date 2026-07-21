import type { NextRequest } from 'next/server';

export interface BetaTester {
  id: string;
  name: string;
}

interface BetaTesterConfig {
  id: string;
  name?: string;
}

function readTesterMap(): Record<string, BetaTesterConfig> {
  const raw = process.env.PROPERTYSCOPE_BETA_TESTERS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string | BetaTesterConfig>;
    return Object.fromEntries(Object.entries(parsed).map(([code, value]) => [
      code,
      typeof value === 'string' ? { id: value } : value
    ]));
  } catch {
    return {};
  }
}

export function controlledBetaIsConfigured(): boolean {
  return Object.keys(readTesterMap()).length > 0;
}

export function getBetaTester(request: NextRequest): BetaTester | null {
  const code = request.headers.get('x-propertyscope-beta-code')?.trim();
  if (!code) return null;
  const match = readTesterMap()[code];
  if (!match?.id) return null;
  return { id: match.id, name: match.name || 'Controlled beta tester' };
}
