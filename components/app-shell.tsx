'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import LogoutButton from '@/components/logout-button';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/sites/new', label: 'New Site', icon: '+' },
  { href: '/security/mfa/challenge', label: 'Security', icon: '⌾' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicAuth = pathname === '/login' || pathname.startsWith('/auth/');
  if (publicAuth) return <main className="main-content" style={{ margin: 0 }}>{children}</main>;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">P</span>
          <span><strong>PropertyScope</strong><small>Private Research</small></span>
        </Link>
        <nav className="sidebar-nav">
          {nav.map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'nav-link active' : 'nav-link'}><span>{item.icon}</span>{item.label}</Link>)}
          <LogoutButton />
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">Private research</span>
          <strong>Shared NFE-OS Identity</strong>
          <p>LIVE access requires protected authorization and the separate server-held PLATFORM credential.</p>
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="mobile-nav">
        {nav.slice(0, 3).map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'active' : ''}><span>{item.icon}</span><small>{item.label}</small></Link>)}
      </nav>
    </div>
  );
}
