'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Enrollment = { factorId: string; friendlyName: string; qrCode: string; secret: string; requiredFactors: number; currentVerifiedFactors: number };

export default function MfaEnrollPage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [required, setRequired] = useState(1);
  const [verified, setVerified] = useState(0);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('Loading security state…');

  useEffect(() => { void (async () => {
    const response = await fetch('/api/auth/mfa/factors', { cache: 'no-store' });
    if (response.status === 401) { router.replace('/login'); return; }
    const data = await response.json();
    setRequired(data.state?.minVerifiedFactors ?? 1);
    setVerified(data.state?.verifiedFactors ?? 0);
    setMessage('Add authenticators until the protected factor requirement is satisfied.');
  })(); }, [router]);

  async function begin() {
    const response = await fetch('/api/auth/mfa/enroll', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ friendlyName: name }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Unable to enroll.'); return; }
    setEnrollment(data); setRequired(data.requiredFactors); setVerified(data.currentVerifiedFactors); setMessage('Scan the QR code and verify the 6-digit code.');
  }

  async function verify() {
    if (!enrollment) return;
    const response = await fetch('/api/auth/mfa/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ factorId: enrollment.factorId, code }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Verification failed.'); return; }
    if ((data.state?.verifiedFactors ?? 0) < (data.state?.minVerifiedFactors ?? 1)) {
      setEnrollment(null); setCode(''); setName(''); setVerified(data.state?.verifiedFactors ?? 0); setMessage('Authenticator verified. Add the required backup factor.'); return;
    }
    router.replace(data.nextPath ?? '/dashboard'); router.refresh();
  }

  return <div className="page-wrap" style={{ maxWidth: 600, margin: '0 auto' }}><header className="page-header"><div><span className="eyebrow">Private research security</span><h1>Set up PropertyScope MFA</h1><p>Verified authenticators: {verified} of {required} required.</p></div></header><section className="section-block">{!enrollment ? <><label className="field"><span>Authenticator name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder={verified ? 'Backup authenticator' : 'Primary phone'} /></label><button className="button button-primary" onClick={begin}>Add Authenticator</button></> : <><p><strong>{enrollment.friendlyName}</strong></p><img src={enrollment.qrCode} alt="Authenticator enrollment QR code" style={{ width: 220, maxWidth: '100%', background: 'white', padding: 8, borderRadius: 8 }} /><p>Manual setup secret: <code>{enrollment.secret}</code></p><label className="field"><span>6-digit code</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><button className="button button-primary" onClick={verify} disabled={code.length !== 6}>Verify Authenticator</button></>}<p role="status">{message}</p></section></div>;
}
