'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/sites/new', label: 'New Site', icon: '+' }
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">P</span>
          <span><strong>PropertyScope</strong><small>Property Intelligence</small></span>
        </Link>
        <nav className="sidebar-nav">
          {nav.map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'nav-link active' : 'nav-link'}><span>{item.icon}</span>{item.label}</Link>)}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">Builder #2</span>
          <strong>Standalone Workstream</strong>
          <p>NFE-OS remains a separate canonical service boundary.</p>
        </div>
      </aside>
      <main className="main-content">{children}</main>
      <nav className="mobile-nav">
        {nav.map((item) => <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? 'active' : ''}><span>{item.icon}</span><small>{item.label}</small></Link>)}
      </nav>
    </div>
  );
}
