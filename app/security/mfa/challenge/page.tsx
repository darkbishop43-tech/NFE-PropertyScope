'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const identityPortal = process.env.NEXT_PUBLIC_IDENTITY_PORTAL_URL ?? 'https://hdp-discovery-studio.vercel.app';
type Factor = { id: string; status: string; friendlyName: string };

export default function MfaChallengePage() {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('Loading authenticators…');

  useEffect(() => { void (async () => {
    const response = await fetch('/api/auth/mfa/factors', { cache: 'no-store' });
    if (response.status === 401) { router.replace('/login'); return; }
    const data = await response.json();
    const verified = (data.factors ?? []).filter((factor: Factor) => factor.status === 'verified');
    setFactors(verified); setFactorId(verified[0]?.id ?? '');
    setMessage(verified.length ? 'Enter a current code from a verified authenticator.' : 'No verified authenticator is available.');
  })(); }, [router]);

  async function verify() {
    const response = await fetch('/api/auth/mfa/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ factorId, code }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Verification failed.'); return; }
    router.replace(data.nextPath ?? '/dashboard'); router.refresh();
  }

  return <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto' }}><header className="page-header"><div><span className="eyebrow">Private research security</span><h1>Verify your PropertyScope session</h1></div></header><section className="section-block">{factors.length ? <><label className="field"><span>Authenticator</span><select value={factorId} onChange={(e) => setFactorId(e.target.value)}>{factors.map((factor) => <option value={factor.id} key={factor.id}>{factor.friendlyName}</option>)}</select></label><label className="field"><span>6-digit code</span><input inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><button className="button button-primary" onClick={verify} disabled={code.length !== 6}>Verify</button></> : <a className="button button-primary" href="/security/mfa/enroll">Enroll Authenticator</a>}<p role="status">{message}</p><p><a href={`${identityPortal}/recover-mfa`}>I cannot access any authenticator</a></p></section></div>;
}
