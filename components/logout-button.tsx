'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  async function logout() {
    if (working) return;
    setWorking(true);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  }
  return <button type="button" className="nav-link" onClick={logout} disabled={working}><span>↪</span>{working ? 'Signing out…' : 'Sign out'}</button>;
}
