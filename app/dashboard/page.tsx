'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import PropertyCard from '@/components/property-card';
import { demoProjects } from '@/lib/demo-data';
import { loadProjects } from '@/lib/storage';
import type { SiteProject } from '@/lib/types';

export default function DashboardPage() {
  const [saved, setSaved] = useState<SiteProject[]>([]);
  useEffect(() => setSaved(loadProjects()), []);
  const projects = useMemo(() => [...saved, ...demoProjects], [saved]);

  return (
    <div className="page-wrap">
      <header className="page-header dashboard-header">
        <div><span className="eyebrow">Property Intelligence Workspace</span><h1>Turn a property into a structured investigation.</h1><p>Capture the site, organize evidence, expose uncertainty, compare development scenarios, and keep the human in control.</p></div>
        <Link href="/sites/new" className="button button-primary button-large">+ New Site Analysis</Link>
      </header>

      <section className="metric-grid">
        <div className="metric-card"><span>Projects</span><strong>{projects.length}</strong><small>Saved + demo workspaces</small></div>
        <div className="metric-card"><span>Needs Verification</span><strong>{projects.filter((p) => p.evidence.some((e) => e.verificationRequired)).length}</strong><small>Projects with open evidence gaps</small></div>
        <div className="metric-card"><span>Scenario Review</span><strong>{projects.filter((p) => p.stage === 'SCENARIO_REVIEW').length}</strong><small>Awaiting human selection</small></div>
        <div className="metric-card"><span>Visual Concepts</span><strong>{projects.filter((p) => p.stage === 'VISUAL_CONCEPT').length}</strong><small>Concept workspace stage</small></div>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">Recent Projects</span><h2>Property investigations</h2></div><span className="subtle-callout">Mock external intelligence is clearly labeled in this MVP.</span></div>
        <div className="property-grid">{projects.map((project) => <PropertyCard key={project.id} project={project} />)}</div>
      </section>

      <section className="start-panel">
        <div><span className="eyebrow">Field-first workflow</span><h2>See something worth investigating?</h2><p>Start with a photo, an address, or a simple location description. You do not need an expert prompt.</p></div>
        <Link href="/sites/new" className="button button-secondary">Start in under a minute →</Link>
      </section>
    </div>
  );
}
