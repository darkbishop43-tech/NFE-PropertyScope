'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { PROPERTY_SCOPE_VERSION } from '@/lib/version';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/sites/new', label: 'New Investigation', icon: '+' }
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand" aria-label="NFE PropertyScope dashboard">
          <span className="brand-mark">P</span>
          <span><strong>NFE PropertyScope</strong><small>Real Estate Development Intelligence</small></span>
        </Link>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {nav.map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'nav-link active' : 'nav-link'}><span>{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">Builder #2 · Phase {PROPERTY_SCOPE_VERSION}</span>
          <strong>Standalone Workstream</strong>
          <p>NFE-OS remains a separate canonical service boundary. Final governance remains human.</p>
        </div>
        <div className="sidebar-disclosure">
          Early-stage investigation tool. Information may be incomplete and must be independently verified.
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'active' : ''}><span>{item.icon}</span><small>{item.label}</small></Link>)}
      </nav>
    </div>
  );
}
