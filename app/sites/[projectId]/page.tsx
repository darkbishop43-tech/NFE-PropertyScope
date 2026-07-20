'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { demoProjects } from '@/lib/demo-data';
import { loadProject, saveProject } from '@/lib/storage';
import type { AnalysisFinding, DevelopmentScenario, EvidenceItem, SiteProject } from '@/lib/types';
import { ConfidenceBadge, ProvenanceBadge, StatusBadge } from '@/components/status-badge';
import { MockPropertyDataAdapter } from '@/lib/adapters/property-data';
import { MockNfeOsAdapter } from '@/lib/adapters/nfe-os';

const tabs = ['Overview', 'Evidence', 'Site Analysis', 'Scenarios', 'Risks', 'Visualize', 'Project Plan'];
const findingLabels: Record<AnalysisFinding['category'], string> = {
  MATTERS_MOST: 'What Appears to Matter Most', HIDDEN_FACTOR: 'Hidden or Subtle Factors', ASSUMPTION: 'Key Assumptions', OPPORTUNITY: 'Potential Opportunities', FAILURE_POINT: 'Potential Failure Points', MISSING_EVIDENCE: 'Missing Evidence', CONTROLLING_CONSTRAINT: 'Controlling Constraints', NEXT_QUESTION: 'Questions to Answer Next', CONCLUSION_CHANGER: 'What Could Change the Conclusion'
};

export default function SiteWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const [project, setProject] = useState<SiteProject | null>(null);
  const [tab, setTab] = useState('Overview');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const demo = demoProjects.find((p) => p.id === params.projectId);
    setProject(demo ?? loadProject(params.projectId) ?? null);
  }, [params.projectId]);

  const selectedScenario = useMemo(() => project?.scenarios.find((s) => s.id === project.selectedScenarioId), [project]);
  if (!project) return <div className="page-wrap"><div className="empty-state"><h1>Project not found</h1><p>The project may exist in another browser or device. Local MVP projects are device-local.</p><Link href="/dashboard" className="button button-primary">Back to Dashboard</Link></div></div>;

  function persist(next: SiteProject) { setProject(next); if (!next.isDemo) saveProject(next); }

  async function refreshEvidence() {
    setWorking(true); setMessage('');
    const evidence = await new MockPropertyDataAdapter().getEvidence(project.address || project.locationDescription || 'Unknown location');
    const next = { ...project, evidence, stage: 'EVIDENCE_GATHERING' as const, status: 'Mock evidence refreshed', updatedAt: new Date().toISOString() };
    persist(next); setWorking(false); setMessage('Mock evidence loaded. Live authoritative sources are not connected.'); setTab('Evidence');
  }

  async function runAnalysis() {
    setWorking(true); setMessage('');
    let evidence: EvidenceItem[] = project.evidence;
    if (evidence.length === 0) evidence = await new MockPropertyDataAdapter().getEvidence(project.address || project.locationDescription || 'Unknown location');
    const response = await new MockNfeOsAdapter().analyzeSite({ project, evidence });
    const scenarios: DevelopmentScenario[] = demoProjects[0].scenarios.map((s) => ({ ...s, id: `${s.id}-${project.id.slice(0, 6)}` }));
    const next = { ...project, evidence, findings: response.findings, scenarios, analysisCompleted: true, stage: 'SCENARIO_REVIEW' as const, status: 'Preliminary analysis ready', updatedAt: new Date().toISOString() };
    persist(next); setWorking(false); setMessage(`Analysis completed through ${response.adapterVersion}. This is a mock structured response, not authoritative property advice.`); setTab('Site Analysis');
  }

  function selectScenario(id: string) {
    const next = { ...project, selectedScenarioId: id, stage: 'SCENARIO_SELECTED' as const, status: 'Scenario selected by human', updatedAt: new Date().toISOString() };
    persist(next); setMessage('Scenario selected by human. Selection is not a regulatory, legal, financial, or feasibility approval.');
  }

  const hero = project.assets.find((a) => a.isPrimary && a.dataUrl)?.dataUrl;

  return (
    <div className="workspace-page">
      <section className="property-hero" style={hero ? { backgroundImage: `linear-gradient(180deg, rgba(8,15,25,.12), rgba(8,15,25,.82)), url(${hero})` } : undefined}>
        <div className="property-hero-overlay"><div className="hero-topline">{project.isDemo && <span className="demo-pill">DEMO DATA</span>}<span className="stage-pill light">{project.stage.replaceAll('_', ' ')}</span></div><div><span className="eyebrow light-text">Property Workspace</span><h1>{project.name}</h1><p>{project.address || project.locationDescription || 'Location not yet confirmed'}</p></div><div className="hero-question"><small>Primary question</small><strong>{project.primaryQuestion}</strong></div></div>
      </section>

      <div className="workspace-commandbar"><button onClick={refreshEvidence} disabled={working}>↻ Refresh Evidence</button><button onClick={runAnalysis} disabled={working}>✦ Run Site Analysis</button><button onClick={() => setTab('Visualize')}>▣ Visualize</button><span>{working ? 'Working…' : 'Human final authority'}</span></div>
      {message && <div className="workspace-message">{message}</div>}
      <div className="workspace-tabs">{tabs.map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div>

      <main className="workspace-content">
        {tab === 'Overview' && <Overview project={project} />}
        {tab === 'Evidence' && <EvidenceView project={project} />}
        {tab === 'Site Analysis' && <AnalysisView project={project} onRun={runAnalysis} working={working} />}
        {tab === 'Scenarios' && <ScenarioView project={project} onSelect={selectScenario} />}
        {tab === 'Risks' && <RiskView project={project} />}
        {tab === 'Visualize' && <VisualView project={project} selectedScenario={selectedScenario} />}
        {tab === 'Project Plan' && <ProjectPlanView project={project} selectedScenario={selectedScenario} />}
      </main>
    </div>
  );
}

function Overview({ project }: { project: SiteProject }) {
  return <div className="content-grid"><section className="content-main"><div className="section-heading"><div><span className="eyebrow">Overview</span><h2>What we know so far</h2></div></div><div className="info-grid"><Info label="Address" value={project.address || 'Unknown'} /><Info label="Parcel ID" value={project.parcelId || 'Not Yet Retrieved'} /><Info label="Apparent current use" value={project.apparentCurrentUse || 'Unknown'} /><Info label="Intended use" value={project.intendedUse || 'Open / not specified'} /></div><div className="map-placeholder"><div><span>⌖</span><strong>Map & parcel boundary area</strong><small>Map provider not connected in this MVP.</small></div></div></section><aside className="content-aside"><div className="alert-card"><span className="eyebrow">Key Alert</span><h3>Low information ≠ high certainty</h3><p>Official property, zoning, environmental, engineering, and financial information must be verified through appropriate sources and professionals.</p></div><div className="timeline-card"><span className="eyebrow">Investigation Stage</span><strong>{project.stage.replaceAll('_', ' ')}</strong><p>{project.status}</p></div></aside></div>;
}

function EvidenceView({ project }: { project: SiteProject }) {
  return <section><div className="section-heading"><div><span className="eyebrow">Evidence</span><h2>Sources stay visible.</h2><p>Preliminary findings never silently become verified facts.</p></div></div>{project.evidence.length === 0 ? <Empty title="No evidence loaded yet" text="Use Refresh Evidence to load the MVP mock evidence structure. Live public-record integrations are not connected." /> : <div className="evidence-grid">{project.evidence.map((item) => <article className="evidence-card" key={item.id}><div className="card-label-row"><span className="eyebrow">{item.category}</span><StatusBadge tone={item.status} label={item.value} /></div><h3>{item.title}</h3><p>{item.summary || item.value}</p><div className="badge-row"><ConfidenceBadge confidence={item.confidence} /><ProvenanceBadge provenance={item.provenance} />{item.verificationRequired && <span className="badge badge-uncertain">Needs Verification</span>}</div><div className="source-row"><span>Source: {item.sourceName || 'Source not yet confirmed'}</span><span>{item.retrievedAt ? `Retrieved ${item.retrievedAt}` : 'Date not available'}</span></div></article>)}</div>}</section>;
}

function AnalysisView({ project, onRun, working }: { project: SiteProject; onRun: () => void; working: boolean }) {
  const groups = Object.entries(findingLabels);
  return <section><div className="section-heading"><div><span className="eyebrow">NFE-OS Site Analysis</span><h2>Structured reasoning, visible uncertainty.</h2><p>The current MVP uses a mocked NFE-OS adapter. No private NFE-OS architecture is duplicated in this app.</p></div>{!project.analysisCompleted && <button className="button button-primary" onClick={onRun} disabled={working}>Run Mock Analysis</button>}</div>{project.findings.length === 0 ? <Empty title="Analysis has not been run" text="Load available evidence and run the structured mock analysis." /> : <div className="analysis-stack">{groups.map(([category, label]) => { const items = project.findings.filter((f) => f.category === category); if (!items.length) return null; return <article className="analysis-section" key={category}><div className="analysis-section-title"><span>{label}</span><small>{items.length} finding{items.length === 1 ? '' : 's'}</small></div>{items.map((item) => <div className="finding-row" key={item.id}><div className={`importance-dot importance-${item.importance.toLowerCase()}`} /><div><p>{item.statement}</p><small>Importance {item.importance} · Confidence {item.confidence}</small></div></div>)}</article>; })}</div>}</section>;
}

function ScenarioView({ project, onSelect }: { project: SiteProject; onSelect: (id: string) => void }) {
  return <section><div className="section-heading"><div><span className="eyebrow">Development Scenarios</span><h2>Compare directions. The human chooses.</h2><p>No scenario is automatically declared the winner.</p></div></div>{project.scenarios.length === 0 ? <Empty title="No scenarios yet" text="Run Site Analysis first to create the mock scenario comparison set." /> : <div className="scenario-grid">{project.scenarios.map((scenario) => { const selected = project.selectedScenarioId === scenario.id; return <article className={selected ? 'scenario-card selected' : 'scenario-card'} key={scenario.id}><div className="card-label-row"><span className="stage-pill">{scenario.type.replaceAll('_', ' ')}</span><ConfidenceBadge confidence={scenario.confidence} /></div><h3>{scenario.name}</h3><p className="scenario-concept">{scenario.concept}</p><h4>Why it may fit</h4><p>{scenario.whyItMayFit}</p><div className="scenario-columns"><div><h4>Advantages</h4><ul>{scenario.advantages.map((x) => <li key={x}>{x}</li>)}</ul></div><div><h4>Constraints</h4><ul>{scenario.constraints.map((x) => <li key={x}>{x}</li>)}</ul></div></div><div className="unknown-box"><strong>Critical unknowns</strong><p>{scenario.criticalUnknowns.join(' · ')}</p></div><div className="next-step"><small>Next verification step</small><p>{scenario.nextVerificationStep}</p></div><button className={selected ? 'button button-selected' : 'button button-secondary'} onClick={() => onSelect(scenario.id)}>{selected ? '✓ Selected by Human' : 'Select This Scenario'}</button></article>; })}</div>}</section>;
}

function RiskView({ project }: { project: SiteProject }) {
  const risks = project.risks.length ? project.risks : [{ id: 'default-risk', category: 'Evidence Gap', title: 'Evidence remains incomplete', description: 'Live zoning, parcel, flood, utility, environmental, engineering, and market sources are not connected in this MVP.', severity: 'HIGH' as const, status: 'NEEDS_VERIFICATION' as const, confidence: 'HIGH' as const, verificationRequired: true }];
  return <section><div className="section-heading"><div><span className="eyebrow">Risks</span><h2>Make uncertainty hard to ignore.</h2></div></div><div className="risk-grid">{risks.map((risk) => <article className="risk-card" key={risk.id}><span className={`risk-severity severity-${risk.severity.toLowerCase()}`}>{risk.severity}</span><span className="eyebrow">{risk.category}</span><h3>{risk.title}</h3><p>{risk.description}</p><div className="badge-row"><span className="badge badge-uncertain">{risk.status.replaceAll('_', ' ')}</span><ConfidenceBadge confidence={risk.confidence} /></div></article>)}</div></section>;
}

function VisualView({ project, selectedScenario }: { project: SiteProject; selectedScenario?: DevelopmentScenario }) {
  const hero = project.assets.find((a) => a.isPrimary && a.dataUrl)?.dataUrl;
  return <section><div className="section-heading"><div><span className="eyebrow">Visual Concept Workspace</span><h2>Raw property → visualized future.</h2><p>The original property image is preserved. Generated imagery will always be stored separately.</p></div></div><div className="before-after"><div className="visual-panel">{hero ? <img src={hero} alt="Original property" /> : <div className="visual-placeholder"><span>BEFORE</span><strong>No source image uploaded</strong></div>}<small>Original property context</small></div><div className="visual-arrow">→</div><div className="visual-panel"><div className="visual-placeholder proposed"><span>PROPOSED CONCEPT</span><strong>Image-generation provider not connected</strong><p>{selectedScenario ? selectedScenario.concept : 'Select a scenario to define the starting concept.'}</p></div><small>Future generated concept</small></div></div><div className="concept-form"><label>Concept description<textarea defaultValue={selectedScenario?.concept || ''} placeholder="Describe the concept to visualize…" /></label><div className="form-two-col"><label>Architectural style<input placeholder="Modern, industrial adaptive reuse…" /></label><label>Number of floors<input type="number" min="1" placeholder="3" /></label></div><div className="form-two-col"><label>Possible use<input defaultValue={selectedScenario?.name || ''} /></label><label>Parking concept<input placeholder="Surface, structured, reduced parking…" /></label></div><label>Site layout / landscaping notes<textarea placeholder="Describe access, setbacks, open space, landscaping…" /></label><button className="button button-disabled" disabled>Generate Visual Concept — Provider Coming Later</button></div></section>;
}

function ProjectPlanView({ project, selectedScenario }: { project: SiteProject; selectedScenario?: DevelopmentScenario }) {
  return <section><div className="section-heading"><div><span className="eyebrow">Project Plan</span><h2>Turn a selected direction into decision gates.</h2><p>This is a preliminary planning shell, not a construction approval or financial commitment.</p></div></div><div className="plan-grid"><Plan title="Project Overview" text={selectedScenario ? `${selectedScenario.name}: ${selectedScenario.concept}` : 'No scenario selected yet. Compare scenarios and select one before treating this as a preferred direction.'} /><Plan title="Major Requirements" text="Verified parcel and zoning data; access and parking review; utility capacity; site/environmental review; preliminary design definition." /><Plan title="Dependencies" text="Authoritative public records, relevant planning authority, professional engineering/environmental review where applicable, and human capital decision." /><Plan title="Implementation Phases" text="1. Evidence verification · 2. Feasibility screen · 3. Concept refinement · 4. Professional review · 5. Cost/material analysis · 6. Decision." /><Plan title="Professional Reviews Needed" text="Planning/zoning authority, survey, civil/site engineering, environmental review, architecture, legal and financial review as the project requires." /><Plan title="Decision Gates" text="Gate 1: permitted use · Gate 2: physical feasibility · Gate 3: infrastructure/access · Gate 4: economics · Gate 5: human go/no-go." /><Plan title="Next Best Action" text={selectedScenario?.nextVerificationStep || 'Run the site analysis and select a scenario, then verify the highest-impact controlling constraint.'} /></div><div className="integration-banner"><div><span className="eyebrow">Future Integration Boundary</span><h3>Send to Cost & Materials Analysis</h3><p>Selected development concept → preliminary project definition → future TrueTakeoff integration.</p></div><button className="button button-disabled" disabled>COMING LATER</button></div></section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="info-card"><small>{label}</small><strong>{value}</strong></div>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty-state compact"><h3>{title}</h3><p>{text}</p></div>; }
function Plan({ title, text }: { title: string; text: string }) { return <article className="plan-card"><span className="eyebrow">{title}</span><p>{text}</p></article>; }
