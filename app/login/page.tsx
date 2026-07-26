'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const identityPortal = process.env.NEXT_PUBLIC_IDENTITY_PORTAL_URL ?? 'https://hdp-discovery-studio.vercel.app';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  async function login() {
    if (working) return;
    setWorking(true);
    setMessage('Signing in…');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to sign in.');
      router.replace(data.nextPath ?? '/dashboard');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign in.');
      setWorking(false);
    }
  }

  return (
    <div className="page-wrap" style={{ maxWidth: 560, margin: '0 auto' }}>
      <header className="page-header"><div><span className="eyebrow">Private research identity</span><h1>Sign in to PropertyScope</h1><p>Invitation-only access. LIVE NFE-OS research also requires protected authorization and multi-factor verification.</p></div></header>
      <section className="section-block">
        <label className="field"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className="action-row"><button className="button button-primary" onClick={login} disabled={working || !email.includes('@') || password.length < 8}>{working ? 'Signing in…' : 'Sign In'}</button></div>
        <p><a href={`${identityPortal}/forgot-password`}>Forgot password?</a></p>
        {message && <p role="status">{message}</p>}
      </section>
    </div>
  );
}
