'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ConfidenceBadge, ProvenanceBadge, StatusBadge } from '@/components/status-badge';
import {
  ACTIVE_NFE_ADAPTER_VERSION,
  buildRealEstateNfePayload,
  getConfiguredNfeConnectionState,
  getNfeConnectionLabel,
  MockNfeOsAdapter,
  summarizeIntegrationRun
} from '@/lib/adapters/nfe-os';
import { demoProjects } from '@/lib/demo-data';
import {
  ACCEPT_ATTRIBUTE,
  defaultEvidenceCategory,
  defaultTruthClass,
  formatBytes,
  isAllowedEvidenceFile,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  MAX_EVIDENCE_FILE_SIZE_LABEL,
  sanitizeFilename
} from '@/lib/evidence-config';
import { createPrivateProjectRecord, getPublicSystemStatus, uploadPrivateEvidence } from '@/lib/client/propertyscope-api';
import { loadProject, saveProject } from '@/lib/storage';
import { PROPERTY_SCOPE_BUILD_ID, PROPERTY_SCOPE_VERSION } from '@/lib/version';
import type {
  AdapterConnectionState,
  AnalysisFinding,
  DevelopmentScenario,
  HdpDiscoveryOutput,
  NfeAnalysisOutput,
  NfeOsIntegrationRun,
  PropertyAsset,
  PublicSystemStatus,
  RrsReviewOutput,
  SiteProject
} from '@/lib/types';

const stages = [
  'Property Intake',
  'Evidence Collection',
  'NFE Analysis',
  'HDP Discovery',
  'RRS Review',
  'Development Scenarios',
  'Visual Concepts',
  'Overall Summary',
  'Human Decision'
] as const;
type WorkspaceStage = (typeof stages)[number];

const findingLabels: Record<AnalysisFinding['category'], string> = {
  MATTERS_MOST: 'What Appears to Matter Most',
  HIDDEN_FACTOR: 'Hidden or Subtle Factors',
  ASSUMPTION: 'Key Assumptions',
  OPPORTUNITY: 'Potential Opportunities',
  FAILURE_POINT: 'Potential Failure Points',
  MISSING_EVIDENCE: 'Missing Evidence',
  CONTROLLING_CONSTRAINT: 'Controlling Constraints',
  NEXT_QUESTION: 'Questions to Answer Next',
  CONCLUSION_CHANGER: 'What Could Change the Conclusion'
};

const defaultMissingInformation = [
  'Official parcel number or parcel numbers',
  'Official ownership record',
  'Official zoning jurisdiction and permitted uses',
  'Floodplain, wetlands, creek buffers, and setbacks',
  'Buildable acreage and soil suitability',
  'Road-access approval and emergency access',
  'Water, sewer, electric, broadband, and drainage capacity',
  'Environmental restrictions, title restrictions, easements, and survey accuracy',
  'Traffic conditions and development approval process'
];

export default function PropertyWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const [project, setProject] = useState<SiteProject | null>(null);
  const [stage, setStage] = useState<WorkspaceStage>('Property Intake');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  const [showNfeReview, setShowNfeReview] = useState(false);
  const [systemStatus, setSystemStatus] = useState<PublicSystemStatus | null>(null);
  const [betaCode, setBetaCode] = useState('');
  const workspaceFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPublicSystemStatus().then(setSystemStatus).catch(() => setSystemStatus(null));
  }, []);

  useEffect(() => {
    const demo = demoProjects.find((item) => item.id === params.projectId);
    const loaded = demo ?? loadProject(params.projectId) ?? null;
    if (loaded) {
      const connectionState = getConfiguredNfeConnectionState();
      setProject({
        ...loaded,
        missingInformation: loaded.missingInformation?.length
          ? loaded.missingInformation
          : defaultMissingInformation,
        analysisConnection: loaded.analysisConnection ?? {
          nfe: connectionState,
          hdp: connectionState,
          rrs: connectionState,
          adapterVersion: ACTIVE_NFE_ADAPTER_VERSION,
          label: getNfeConnectionLabel(connectionState)
        }
      });
    } else {
      setProject(null);
    }
  }, [params.projectId]);

  const latestRun = project?.nfeOsRuns?.[0];
  const selectedScenario = useMemo(
    () => project?.scenarios.find((scenario) => scenario.id === project.selectedScenarioId),
    [project]
  );

  if (!project) {
    return (
      <div className="page-wrap">
        <div className="empty-state">
          <h1>Investigation not found</h1>
          <p>This investigation may belong to another browser or tester. PropertyScope does not expose another tester&apos;s evidence.</p>
          <Link href="/dashboard" className="button button-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  function persist(next: SiteProject) {
    setProject(next);
    if (!next.isDemo) saveProject(next);
  }

  function connectionState(): AdapterConnectionState {
    return project?.analysisConnection?.nfe ?? getConfiguredNfeConnectionState();
  }

  async function runNfeAnalysis() {
    if (!project || working) return;
    const state = connectionState();
    if (state === 'DISCONNECTED' || state === 'FAILED') {
      setMessage(`${getNfeConnectionLabel(state)}. The investigation and evidence remain preserved.`);
      return;
    }

    const current = project;
    const adapter = new MockNfeOsAdapter();
    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const pending: NfeOsIntegrationRun = {
      id: runId,
      realEstateCaseId: current.id,
      status: 'PENDING',
      connectionState: state,
      adapterVersion: adapter.adapterVersion,
      isMock: adapter.isMock,
      startedAt
    };

    setShowNfeReview(false);
    setWorking(true);
    setMessage('');
    persist({
      ...current,
      nfeOsRuns: [pending, ...(current.nfeOsRuns ?? [])],
      status: 'NFE analysis requested by human',
      updatedAt: new Date().toISOString()
    });

    try {
      const payload = buildRealEstateNfePayload(current, current.evidence);
      const nfeAnalysis = await adapter.runNfeAnalysis(payload);
      const scenarios: DevelopmentScenario[] = demoProjects[0].scenarios.map((scenario) => ({
        ...scenario,
        id: `${scenario.id}-${current.id.slice(0, 8)}`
      }));
      const completed: NfeOsIntegrationRun = {
        ...pending,
        status: 'PARTIAL',
        nfeRequestId: nfeAnalysis.requestId,
        nfeAnalysis,
        providerMetadata: nfeAnalysis.providerMetadata,
        completedAt: new Date().toISOString()
      };
      persist({
        ...current,
        findings: nfeAnalysis.findings,
        scenarios: current.scenarios.length ? current.scenarios : scenarios,
        analysisCompleted: true,
        nfeOsRuns: [completed, ...(current.nfeOsRuns ?? [])],
        stage: 'ANALYZED',
        status: adapter.isMock ? 'NFE mock analysis ready — test output only' : 'NFE analysis ready',
        updatedAt: new Date().toISOString()
      });
      setMessage(`${getNfeConnectionLabel(state)}. NFE output was requested by the human and remains separate from HDP and RRS.`);
      setStage('NFE Analysis');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'NFE-OS analysis is unavailable.';
      persist({
        ...current,
        nfeOsRuns: [{ ...pending, status: 'FAILED', errorMessage, completedAt: new Date().toISOString() }, ...(current.nfeOsRuns ?? [])],
        status: 'NFE-OS unavailable — property data preserved',
        updatedAt: new Date().toISOString()
      });
      setMessage(`${errorMessage} No automatic retry was started.`);
    } finally {
      setWorking(false);
    }
  }

  async function runHdp() {
    if (!project || working || !latestRun?.nfeAnalysis) return;
    const current = project;
    const adapter = new MockNfeOsAdapter();
    setWorking(true);
    setMessage('');
    try {
      const payload = buildRealEstateNfePayload(current, current.evidence);
      const hdpAnalysis = await adapter.runHdp({ payload, nfeAnalysis: latestRun.nfeAnalysis });
      const nextRun: NfeOsIntegrationRun = {
        ...latestRun,
        status: 'PARTIAL',
        hdpRequestId: hdpAnalysis.requestId,
        hdpAnalysis,
        completedAt: new Date().toISOString()
      };
      persist({ ...current, nfeOsRuns: [nextRun, ...(current.nfeOsRuns ?? []).slice(1)], status: 'HDP mock discovery ready — test output only', updatedAt: new Date().toISOString() });
      setMessage('HDP Discovery completed as DEVELOPMENT / MOCK and remains visibly separate from NFE Analysis.');
      setStage('HDP Discovery');
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : 'HDP is unavailable.'} The investigation remains preserved.`);
    } finally {
      setWorking(false);
    }
  }

  async function runRrs() {
    if (!project || working || !latestRun?.nfeAnalysis || !latestRun.hdpAnalysis) return;
    const current = project;
    const adapter = new MockNfeOsAdapter();
    setWorking(true);
    setMessage('');
    try {
      const payload = buildRealEstateNfePayload(current, current.evidence);
      const rrsReview = await adapter.runRrs({ payload, nfeAnalysis: latestRun.nfeAnalysis, hdpAnalysis: latestRun.hdpAnalysis });
      const nextRun: NfeOsIntegrationRun = {
        ...latestRun,
        status: 'COMPLETED',
        rrsRequestId: rrsReview.requestId,
        rrsReview,
        overallSummary: summarizeIntegrationRun({ nfeAnalysis: latestRun.nfeAnalysis, hdpAnalysis: latestRun.hdpAnalysis, rrsReview }),
        completedAt: new Date().toISOString()
      };
      persist({ ...current, nfeOsRuns: [nextRun, ...(current.nfeOsRuns ?? []).slice(1)], status: 'RRS mock review ready — test output only', updatedAt: new Date().toISOString() });
      setMessage('RRS Review completed as DEVELOPMENT / MOCK. Final authority remains human.');
      setStage('RRS Review');
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : 'RRS is unavailable.'} The investigation remains preserved.`);
    } finally {
      setWorking(false);
    }
  }

  async function addOrRetryEvidence(event: ChangeEvent<HTMLInputElement>) {
    if (!project) return;
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    setWorking(true);
    setMessage('');
    let next = project;

    try {
      if (systemStatus?.secureUploadsEnabled && betaCode.trim()) {
        await createPrivateProjectRecord(next, betaCode.trim());
      }

      for (const file of files) {
        if (next.assets.length >= MAX_EVIDENCE_FILES && !next.assets.some((asset) => asset.originalFilename === file.name && ['FAILED', 'REJECTED', 'SECURE_STORAGE_REQUIRED'].includes(asset.uploadStatus || ''))) {
          setMessage(`Maximum ${MAX_EVIDENCE_FILES} evidence files per investigation.`);
          break;
        }
        const prior = next.assets.find((asset) => asset.originalFilename === file.name && ['FAILED', 'REJECTED', 'SECURE_STORAGE_REQUIRED'].includes(asset.uploadStatus || ''));
        const sourceCategory = prior?.sourceCategory || defaultEvidenceCategory(file);
        const baseAsset: PropertyAsset = {
          id: prior?.id || crypto.randomUUID(),
          evidenceItemId: prior?.evidenceItemId || prior?.id || crypto.randomUUID(),
          type: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
          filename: file.name,
          originalFilename: file.name,
          sanitizedFilename: sanitizeFilename(file.name),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
          isPrimary: prior?.isPrimary || false,
          provenance: 'USER_PROVIDED',
          sourceCategory,
          sourceDescription: prior?.sourceDescription || '',
          truthClass: prior?.truthClass || defaultTruthClass(sourceCategory),
          verificationStatus: prior?.verificationStatus || 'Unreviewed',
          uploadStatus: 'QUEUED',
          localPreviewAvailable: false
        };
        baseAsset.evidenceItemId = baseAsset.id;

        let finalAsset: PropertyAsset;
        if (!isAllowedEvidenceFile(file)) {
          finalAsset = { ...baseAsset, uploadStatus: 'REJECTED', errorMessage: 'Unsupported file type. Accepted: JPG, JPEG, PNG, WEBP, PDF, DOCX, TXT and CSV.' };
        } else if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
          finalAsset = { ...baseAsset, uploadStatus: 'REJECTED', errorMessage: `Oversized file. Maximum size is ${MAX_EVIDENCE_FILE_SIZE_LABEL}.` };
        } else if (systemStatus?.secureUploadsEnabled && betaCode.trim()) {
          try {
            finalAsset = await uploadPrivateEvidence(next.id, baseAsset, file, betaCode.trim());
          } catch (error) {
            finalAsset = { ...baseAsset, uploadStatus: 'FAILED', errorMessage: error instanceof Error ? error.message : 'Upload failed. Reselect the file to retry.' };
          }
        } else {
          finalAsset = { ...baseAsset, uploadStatus: 'SECURE_STORAGE_REQUIRED', errorMessage: 'Local preview only — this file has not been securely saved.' };
        }

        const hadPrior = next.assets.some((asset) => asset.id === finalAsset.id);
        next = {
          ...next,
          assets: hadPrior ? next.assets.map((asset) => asset.id === finalAsset.id ? finalAsset : asset) : [...next.assets, finalAsset],
          stage: 'EVIDENCE_GATHERING',
          status: finalAsset.uploadStatus === 'SAVED_PRIVATE' ? 'Private evidence saved' : 'Evidence metadata preserved',
          updatedAt: new Date().toISOString()
        };
        persist(next);
      }
      setMessage(systemStatus?.secureUploadsEnabled && betaCode.trim()
        ? 'Evidence processing completed. Failed items remain visible and can be retried by reselecting the file.'
        : 'Evidence metadata preserved. Secure private storage must be configured before file contents can persist.');
    } finally {
      setWorking(false);
    }
  }

  function selectScenario(id: string) {
    if (!project) return;
    persist({
      ...project,
      selectedScenarioId: id,
      stage: 'SCENARIO_SELECTED',
      status: 'Scenario selected by human',
      updatedAt: new Date().toISOString()
    });
    setMessage('Scenario selected by human. This is not an approval, appraisal, legal conclusion, or feasibility certification.');
    setStage('Human Decision');
  }

  const hero = project.assets.find((asset) => asset.isPrimary && asset.dataUrl)?.dataUrl;
  const state = project.analysisConnection?.nfe ?? getConfiguredNfeConnectionState();

  return (
    <div className="workspace-page">
      <section
        className="property-hero"
        style={hero ? { backgroundImage: `linear-gradient(180deg, rgba(8,15,25,.12), rgba(8,15,25,.82)), url(${hero})` } : undefined}
      >
        <div className="property-hero-overlay">
          <div className="hero-topline">
            {project.isDemo && <span className="demo-pill">DEMO DATA</span>}
            <span className="stage-pill light">{project.stage.replaceAll('_', ' ')}</span>
          </div>
          <div>
            <span className="eyebrow light-text">Property Investigation Workspace</span>
            <h1>{project.name}</h1>
            <p>{project.address || project.locationDescription || 'Location not yet confirmed'}</p>
          </div>
          <div className="hero-question">
            <small>Main question</small>
            <strong>{project.primaryQuestion}</strong>
          </div>
        </div>
      </section>

      <div className="workspace-commandbar">
        <button onClick={() => setStage('Evidence Collection')}>＋ Add Property Evidence</button>
        <button onClick={() => setShowNfeReview(true)} disabled={working || state === 'DISCONNECTED' || state === 'FAILED'}>✦ Run NFE Analysis</button>
        <button onClick={() => setStage('Visual Concepts')}>▣ Visual Concepts</button>
        <span>{working ? 'Working…' : 'Human final authority'}</span>
      </div>

      <ConnectionBanner state={state} adapterVersion={project.analysisConnection?.adapterVersion ?? ACTIVE_NFE_ADAPTER_VERSION} />
      {message && <div className="workspace-message">{message}</div>}

      <nav className="workspace-stage-nav" aria-label="Property investigation stages">
        {stages.map((item, index) => (
          <button key={item} className={stage === item ? 'active' : ''} onClick={() => setStage(item)}>
            <span>{index + 1}</span>{item}
          </button>
        ))}
      </nav>

      <main className="workspace-content">
        {stage === 'Property Intake' && <PropertyIntake project={project} />}
        {stage === 'Evidence Collection' && <EvidenceCollection project={project} systemStatus={systemStatus} betaCode={betaCode} setBetaCode={setBetaCode} inputRef={workspaceFileRef} onFiles={addOrRetryEvidence} working={working} />}
        {stage === 'NFE Analysis' && <NfeStage project={project} run={latestRun} onReview={() => setShowNfeReview(true)} working={working} />}
        {stage === 'HDP Discovery' && <HdpStage output={latestRun?.hdpAnalysis} canRun={Boolean(latestRun?.nfeAnalysis)} onRun={runHdp} working={working} />}
        {stage === 'RRS Review' && <RrsStage output={latestRun?.rrsReview} canRun={Boolean(latestRun?.nfeAnalysis && latestRun?.hdpAnalysis)} onRun={runRrs} working={working} />}
        {stage === 'Development Scenarios' && <ScenarioStage project={project} onSelect={selectScenario} />}
        {stage === 'Visual Concepts' && <VisualConceptStage project={project} selectedScenario={selectedScenario} />}
        {stage === 'Overall Summary' && <OverallSummary run={latestRun} project={project} />}
        {stage === 'Human Decision' && <HumanDecision project={project} selectedScenario={selectedScenario} />}
      </main>

      {showNfeReview && (
        <AnalysisReview
          project={project}
          state={state}
          onCancel={() => setShowNfeReview(false)}
          onConfirm={runNfeAnalysis}
          working={working}
        />
      )}
    </div>
  );
}

function ConnectionBanner({ state, adapterVersion }: { state: AdapterConnectionState; adapterVersion: string }) {
  return (
    <div className={`connection-banner connection-${state.toLowerCase()}`}>
      <div>
        <strong>{getNfeConnectionLabel(state)}</strong>
        <span>Adapter: {adapterVersion}</span>
      </div>
      <small>{state === 'MOCK' ? 'Development test output only. No live NFE-OS service call is made.' : 'PropertyScope preserves the investigation if the external service is unavailable.'}</small>
    </div>
  );
}

function PropertyIntake({ project }: { project: SiteProject }) {
  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="section-heading"><span className="eyebrow">Property Intake</span><h2>Known investigation information</h2></div>
        <div className="detail-grid">
          <Detail label="Property case ID" value={project.id} />
          <Detail label="Investigation type" value={project.investigationType || 'Not specified'} />
          <Detail label="Project title" value={project.name} />
          <Detail label="Address / location" value={project.address || project.locationDescription || 'Unknown'} />
          <Detail label="Parcel ID" value={project.parcelId || 'Unknown — needs verification'} />
          <Detail label="Listing URL" value={project.listingUrl || 'Not provided'} />
          <Detail label="Intended use" value={project.intendedUse || 'Open to investigation'} />
          <Detail label="Apparent current use" value={project.apparentCurrentUse || 'Unknown'} />
        </div>
      </section>
      <section className="panel span-2">
        <span className="eyebrow">Main Question</span>
        <h2>{project.primaryQuestion}</h2>
        <p className="governance-note">This question begins an investigation. It is not a request for automatic approval or guaranteed feasibility.</p>
      </section>
      <Disclosure />
    </div>
  );
}

function EvidenceCollection({ project, systemStatus, betaCode, setBetaCode, inputRef, onFiles, working }: {
  project: SiteProject;
  systemStatus: PublicSystemStatus | null;
  betaCode: string;
  setBetaCode: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  working: boolean;
}) {
  return (
    <div className="content-grid">
      <section className="panel span-2">
        <div className="section-heading">
          <span className="eyebrow">Evidence Collection</span>
          <h2>Uploaded evidence inventory</h2>
          <p>Facts, claims, assumptions, and conceptual materials remain visibly distinct.</p>
        </div>
        <div className="workspace-evidence-actions">
          <input ref={inputRef} className="visually-hidden" type="file" accept={ACCEPT_ATTRIBUTE} multiple onChange={onFiles} />
          <button className="button button-primary" type="button" disabled={working} onClick={() => inputRef.current?.click()}>Add or Retry Evidence</button>
          <span>Reselect a failed file to retry. Maximum {MAX_EVIDENCE_FILES} files, {MAX_EVIDENCE_FILE_SIZE_LABEL} each.</span>
        </div>
        {systemStatus?.secureUploadsEnabled && systemStatus.controlledBetaGate ? (
          <label className="workspace-beta-code">Controlled beta access code<input type="password" value={betaCode} onChange={(event) => setBetaCode(event.target.value)} autoComplete="off" /></label>
        ) : (
          <div className="storage-truth-banner"><strong>INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD</strong><span>Evidence metadata is preserved, but file contents are not persisted until private storage and tester access are configured.</span></div>
        )}
        {project.assets.length === 0 ? (
          <div className="empty-state compact">
            <h3>No property files are attached</h3>
            <p>Add evidence from a new investigation intake. Uploading a file never starts analysis automatically.</p>
            <Link className="button button-secondary" href="/sites/new">Start another investigation</Link>
          </div>
        ) : (
          <div className="evidence-inventory">
            {project.assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        )}
      </section>

      <section className="panel">
        <span className="eyebrow">Missing Information</span>
        <h2>Still unresolved</h2>
        <ul className="check-list warning-list">
          {(project.missingInformation?.length ? project.missingInformation : defaultMissingInformation).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="panel">
        <span className="eyebrow">Structured Evidence</span>
        <h2>Property evidence records</h2>
        {project.evidence.length === 0 ? <p>No public-record or professional evidence has been retrieved.</p> : (
          <div className="evidence-stack">
            {project.evidence.map((item) => (
              <article className="evidence-card" key={item.id}>
                <div className="card-row"><StatusBadge tone={item.status} label={item.value} /><ConfidenceBadge confidence={item.confidence} /></div>
                <h3>{item.title}</h3>
                <p>{item.summary || item.value}</p>
                <div className="card-row"><ProvenanceBadge provenance={item.provenance} /><span className="verification-label">{item.verificationStatus || (item.verificationRequired ? 'Needs verification' : 'Unreviewed')}</span></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AssetCard({ asset }: { asset: PropertyAsset }) {
  return (
    <article className="asset-card">
      <div className="asset-icon" aria-hidden="true">{asset.type === 'PHOTO' ? '▧' : '▤'}</div>
      <div className="asset-main">
        <strong>{asset.originalFilename || asset.filename}</strong>
        <span>{asset.mimeType || 'Unknown type'} · {formatBytes(asset.sizeBytes || 0)}</span>
        <p>{asset.sourceDescription || 'No source description provided.'}</p>
        <div className="asset-tags">
          <span>{asset.sourceCategory || 'Unclassified evidence'}</span>
          <span>{asset.verificationStatus || 'Unreviewed'}</span>
          <span>{asset.truthClass || 'USER-PROVIDED CLAIM'}</span>
          <span className={`upload-state upload-${(asset.uploadStatus || 'SECURE_STORAGE_REQUIRED').toLowerCase().replaceAll('_', '-')}`}>{asset.uploadStatus || 'SECURE_STORAGE_REQUIRED'}</span>
        </div>
      </div>
      <div className="asset-security">
        {asset.uploadStatus === 'SAVED_PRIVATE' ? 'Private object stored' : 'File content not persisted'}
      </div>
    </article>
  );
}

function NfeStage({ project, run, onReview, working }: { project: SiteProject; run?: NfeOsIntegrationRun; onReview: () => void; working: boolean }) {
  const output = run?.nfeAnalysis;
  return (
    <div className="content-grid">
      <section className="panel span-2">
        <span className="eyebrow">NFE Analysis</span>
        <h2>Structured property analysis</h2>
        <p>NFE Analysis runs only after a human reviews the request and confirms which evidence will be included.</p>
        <button className="button button-primary" onClick={onReview} disabled={working}>{output ? 'Review and rerun NFE Analysis' : 'Review NFE Analysis Request'}</button>
      </section>
      {!output ? <StageEmpty text="No NFE Analysis has been requested for this investigation." /> : (
        <section className="analysis-grid span-2">
          {Object.entries(findingLabels).map(([category, label]) => {
            const items = output.findings.filter((finding) => finding.category === category);
            if (!items.length) return null;
            return <article className="analysis-group" key={category}><h3>{label}</h3>{items.map((finding) => <div className="finding-card" key={finding.id}><strong>{finding.statement}</strong><div className="card-row"><span>Importance: {finding.importance}</span><ConfidenceBadge confidence={finding.confidence} /></div></div>)}</article>;
          })}
        </section>
      )}
      <Disclosure />
    </div>
  );
}

function HdpStage({ output, canRun, onRun, working }: { output?: HdpDiscoveryOutput; canRun: boolean; onRun: () => void; working: boolean }) {
  return (
    <div className="content-grid">
      <section className="panel span-2"><span className="eyebrow">HDP Discovery</span><h2>Hidden discovery remains separate</h2><p>HDP does not run automatically with NFE Analysis.</p><button className="button button-primary" disabled={!canRun || working} onClick={onRun}>{output ? 'Run HDP Again' : 'Run HDP Discovery'}</button></section>
      {!output ? <StageEmpty text={canRun ? 'NFE Analysis is available. HDP awaits a separate human request.' : 'Run NFE Analysis before HDP Discovery.'} /> : <section className="panel span-2"><div className="analysis-governance-banner"><strong>DEVELOPMENT / MOCK</strong><span>Test output only</span></div><ul className="check-list">{output.discoveries.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
  );
}

function RrsStage({ output, canRun, onRun, working }: { output?: RrsReviewOutput; canRun: boolean; onRun: () => void; working: boolean }) {
  return (
    <div className="content-grid">
      <section className="panel span-2"><span className="eyebrow">RRS Review</span><h2>Independent review stage</h2><p>RRS remains separate from NFE and HDP and requires a separate human request.</p><button className="button button-primary" disabled={!canRun || working} onClick={onRun}>{output ? 'Run RRS Again' : 'Run RRS Review'}</button></section>
      {!output ? <StageEmpty text={canRun ? 'NFE and HDP are ready. RRS awaits a separate human request.' : 'Complete NFE Analysis and HDP Discovery before RRS Review.'} /> : <section className="panel span-2"><div className="analysis-governance-banner"><strong>DEVELOPMENT / MOCK</strong><span>Test output only</span></div><h3>{output.verdict}</h3><h4>Strengths</h4><ul className="check-list">{output.strengths.map((item) => <li key={item}>{item}</li>)}</ul><h4>Concerns</h4><ul className="check-list warning-list">{output.concerns.map((item) => <li key={item}>{item}</li>)}</ul><h4>Recommendations</h4><ul className="check-list">{output.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </div>
  );
}

function ScenarioStage({ project, onSelect }: { project: SiteProject; onSelect: (id: string) => void }) {
  return (
    <div className="scenario-grid">
      {project.scenarios.length === 0 ? <StageEmpty text="No development scenarios exist yet. Run NFE Analysis first; the system will not declare an automatic winner." /> : project.scenarios.map((scenario) => (
        <article className={`scenario-card ${project.selectedScenarioId === scenario.id ? 'selected' : ''}`} key={scenario.id}>
          <span className="eyebrow">{scenario.type.replaceAll('_', ' ')}</span><h2>{scenario.name}</h2><p>{scenario.concept}</p><h4>Why it may fit</h4><p>{scenario.whyItMayFit}</p><h4>Major advantages</h4><ul>{scenario.advantages.map((item) => <li key={item}>{item}</li>)}</ul><h4>Major constraints</h4><ul>{scenario.constraints.map((item) => <li key={item}>{item}</li>)}</ul><h4>Critical unknowns</h4><ul>{scenario.criticalUnknowns.map((item) => <li key={item}>{item}</li>)}</ul><div className="card-row"><ConfidenceBadge confidence={scenario.confidence} /><span>Complexity: {scenario.complexity}</span></div><p><strong>Next verification:</strong> {scenario.nextVerificationStep}</p><button className="button button-primary" onClick={() => onSelect(scenario.id)}>{project.selectedScenarioId === scenario.id ? 'Selected by Human' : 'Select for Further Investigation'}</button>
        </article>
      ))}
    </div>
  );
}

function VisualConceptStage({ project, selectedScenario }: { project: SiteProject; selectedScenario?: DevelopmentScenario }) {
  return (
    <div className="content-grid">
      <section className="panel span-2"><span className="eyebrow">Visual Concepts</span><h2>Before and proposed concept workspace</h2><p>{selectedScenario ? `Selected human direction: ${selectedScenario.name}` : 'Select a development scenario before creating a visual concept.'}</p><div className="before-after"><div><span>BEFORE</span><div className="visual-placeholder">{project.assets.some((asset) => asset.type === 'PHOTO') ? 'Property photograph preserved as source evidence' : 'Add a property photograph'}</div></div><div><span>PROPOSED CONCEPT</span><div className="visual-placeholder">Image-generation adapter not connected</div></div></div></section>
    </div>
  );
}

function OverallSummary({ run, project }: { run?: NfeOsIntegrationRun; project: SiteProject }) {
  return (
    <div className="content-grid">
      <section className="panel span-2"><span className="eyebrow">Overall Summary</span><h2>{run?.overallSummary || 'Overall summary is not yet available.'}</h2><p>{run?.overallSummary ? 'This summary combines separately identified NFE, HDP, and RRS outputs. It remains decision support, not a professional determination.' : 'Complete NFE Analysis, HDP Discovery, and RRS Review first.'}</p></section>
      <section className="panel"><h3>Evidence inventory</h3><p>{project.assets.length} uploaded file record(s); {project.evidence.length} structured evidence record(s).</p></section>
      <section className="panel"><h3>Unresolved information</h3><p>{project.missingInformation?.length || defaultMissingInformation.length} verification item(s) remain visible.</p></section>
    </div>
  );
}

function HumanDecision({ project, selectedScenario }: { project: SiteProject; selectedScenario?: DevelopmentScenario }) {
  return (
    <div className="content-grid">
      <section className="panel span-2"><span className="eyebrow">Human Decision</span><h2>{selectedScenario ? selectedScenario.name : 'No scenario selected'}</h2><p>{selectedScenario ? 'This direction was selected by the human for further investigation.' : 'PropertyScope does not automatically declare a winner.'}</p><div className="human-authority-card"><strong>KEEP FINAL GOVERNANCE HUMAN</strong><span>No output is an appraisal, underwriting approval, legal conclusion, zoning approval, investment approval, or feasibility certification.</span></div></section>
      <section className="panel"><h3>Decision gates</h3><ul className="check-list warning-list"><li>Verify controlling public records</li><li>Resolve professional-review requirements</li><li>Confirm access, utilities, and environmental constraints</li><li>Review economics independently</li></ul></section>
      <section className="panel"><h3>Future cost boundary</h3><p>Send to Cost &amp; Materials Analysis</p><span className="stage-pill">COMING LATER</span></section>
    </div>
  );
}

function AnalysisReview({ project, state, onCancel, onConfirm, working }: { project: SiteProject; state: AdapterConnectionState; onCancel: () => void; onConfirm: () => void; working: boolean }) {
  const included = project.assets.filter((asset) => asset.uploadStatus !== 'REJECTED' && asset.uploadStatus !== 'FAILED');
  const excluded = project.assets.filter((asset) => asset.uploadStatus === 'REJECTED' || asset.uploadStatus === 'FAILED');
  const unverified = project.assets.filter((asset) => !asset.verificationStatus || ['Unreviewed', 'Needs verification'].includes(asset.verificationStatus));
  const disabled = working || state === 'DISCONNECTED' || state === 'FAILED';
  return (
    <div className="review-overlay" role="dialog" aria-modal="true" aria-labelledby="analysis-review-title">
      <section className="analysis-review-panel">
        <div className="section-heading"><span className="eyebrow">Human-Controlled Request</span><h2 id="analysis-review-title">Review NFE Analysis Request</h2></div>
        <div className="review-grid"><Detail label="Property" value={project.name} /><Detail label="Location" value={project.address || project.locationDescription || 'Unknown'} /><Detail label="Main question" value={project.primaryQuestion} /><Detail label="Connection" value={getNfeConnectionLabel(state)} /><Detail label="Analysis version" value={`${ACTIVE_NFE_ADAPTER_VERSION} · PropertyScope ${PROPERTY_SCOPE_VERSION}`} /><Detail label="Build" value={PROPERTY_SCOPE_BUILD_ID} /></div>
        <div className="review-columns"><div><h3>Included evidence ({included.length})</h3><ul>{included.length ? included.map((asset) => <li key={asset.id}>{asset.originalFilename || asset.filename} — {asset.sourceCategory || 'Unclassified evidence'}</li>) : <li>No file evidence included</li>}</ul></div><div><h3>Excluded / failed ({excluded.length})</h3><ul>{excluded.length ? excluded.map((asset) => <li key={asset.id}>{asset.originalFilename || asset.filename} — {asset.errorMessage || asset.uploadStatus}</li>) : <li>None</li>}</ul></div></div>
        <div className="review-columns"><div><h3>Unresolved missing information</h3><ul>{(project.missingInformation || defaultMissingInformation).map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Unverified claims ({unverified.length})</h3><ul>{unverified.length ? unverified.map((asset) => <li key={asset.id}>{asset.originalFilename || asset.filename} — {asset.truthClass || 'USER-PROVIDED CLAIM'}</li>) : <li>No uploaded item is currently flagged as unverified</li>}</ul></div></div>
        {state === 'MOCK' && <div className="analysis-governance-banner"><strong>MOCK — TEST OUTPUT ONLY</strong><span>No live NFE-OS service call will occur.</span></div>}
        <div className="review-actions"><button className="button button-secondary" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={disabled} onClick={onConfirm}>{working ? 'Working…' : 'Confirm and Run NFE Analysis'}</button></div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-item"><small>{label}</small><strong>{value}</strong></div>;
}

function StageEmpty({ text }: { text: string }) {
  return <section className="panel span-2 empty-stage"><h3>Not started</h3><p>{text}</p></section>;
}

function Disclosure() {
  return (
    <section className="panel span-2 beta-disclosure">
      <strong>NFE PropertyScope is an early-stage property and development investigation tool.</strong>
      <p>Information may be incomplete and must be independently verified. It does not replace attorney review, title examination, survey, appraisal, engineering, environmental assessment, zoning confirmation, government approval, or licensed real-estate advice.</p>
    </section>
  );
}
