'use client';

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useRouter } from 'next/navigation';
import {
  ACCEPT_ATTRIBUTE,
  DOCUMENT_ACCEPT_ATTRIBUTE,
  EVIDENCE_SOURCE_CATEGORIES,
  formatBytes,
  IMAGE_ACCEPT_ATTRIBUTE,
  isAllowedEvidenceFile,
  MAX_EVIDENCE_FILES,
  MAX_EVIDENCE_FILE_SIZE_BYTES,
  MAX_EVIDENCE_FILE_SIZE_LABEL,
  defaultEvidenceCategory,
  defaultTruthClass,
  sanitizeFilename
} from '@/lib/evidence-config';
import {
  createPrivateProjectRecord,
  getPublicSystemStatus,
  uploadPrivateEvidence
} from '@/lib/client/propertyscope-api';
import { getConfiguredNfeConnectionState, getNfeConnectionLabel } from '@/lib/adapters/nfe-os';
import { saveProject } from '@/lib/storage';
import { PROPERTY_SCOPE_BUILD_ID, PROPERTY_SCOPE_VERSION } from '@/lib/version';
import type {
  EvidenceSourceCategory,
  EvidenceTruthClass,
  PropertyAsset,
  PublicSystemStatus,
  SiteProject,
  VerificationState
} from '@/lib/types';

const suggestions = [
  'What could go here?',
  'Could this be residential?',
  'Could apartments work here?',
  'Would a restaurant make sense here?',
  'Analyze this property for possible development.'
];

const verificationStates: VerificationState[] = [
  'Unreviewed',
  'Needs verification',
  'Partially verified',
  'Verified against source',
  'Conflicting source',
  'Superseded'
];

interface PendingEvidence {
  id: string;
  file: File;
  previewUrl?: string;
  sourceCategory: EvidenceSourceCategory;
  sourceDescription: string;
  verificationStatus: VerificationState;
  truthClass: EvidenceTruthClass;
  status: 'READY' | 'REJECTED';
  warning?: string;
}

const defaultStatus: PublicSystemStatus = {
  version: PROPERTY_SCOPE_VERSION,
  buildId: PROPERTY_SCOPE_BUILD_ID,
  storageMode: 'LOCAL_PREVIEW_ONLY',
  secureUploadsEnabled: false,
  controlledBetaGate: false,
  nfe: getConfiguredNfeConnectionState(),
  hdp: getConfiguredNfeConnectionState(),
  rrs: getConfiguredNfeConnectionState(),
  adapterVersion: 'mock-nfe-os-adapter-v0.2'
};

export default function NewInvestigationPage() {
  const router = useRouter();
  const allFileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [question, setQuestion] = useState('What could realistically be done with this property?');
  const [name, setName] = useState('');
  const [investigationType, setInvestigationType] = useState<SiteProject['investigationType']>('Known Property');
  const [parcelId, setParcelId] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [betaCode, setBetaCode] = useState('');
  const [items, setItems] = useState<PendingEvidence[]>([]);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [systemStatus, setSystemStatus] = useState<PublicSystemStatus>(defaultStatus);

  useEffect(() => {
    let active = true;
    getPublicSystemStatus()
      .then((status) => { if (active) setSystemStatus(status); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);


  const readyItems = useMemo(() => items.filter((item) => item.status === 'READY'), [items]);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    setError('');
    setNotice('');

    setItems((current) => {
      const next = [...current];
      const existingKeys = new Set(current.map((item) => `${item.file.name.toLowerCase()}|${item.file.size}|${item.file.lastModified}`));

      for (const file of incoming) {
        if (next.length >= MAX_EVIDENCE_FILES) {
          setError(`Maximum ${MAX_EVIDENCE_FILES} evidence files per investigation.`);
          break;
        }

        const duplicateKey = `${file.name.toLowerCase()}|${file.size}|${file.lastModified}`;
        if (existingKeys.has(duplicateKey)) {
          setError(`Duplicate file skipped: ${file.name}`);
          continue;
        }

        if (!isAllowedEvidenceFile(file)) {
          next.push({
            id: crypto.randomUUID(),
            file,
            sourceCategory: defaultEvidenceCategory(file),
            sourceDescription: '',
            verificationStatus: 'Unreviewed',
            truthClass: defaultTruthClass(defaultEvidenceCategory(file)),
            status: 'REJECTED',
            warning: 'Unsupported file type. Accepted: JPG, JPEG, PNG, WEBP, PDF, DOCX, TXT and CSV.'
          });
          existingKeys.add(duplicateKey);
          continue;
        }

        if (file.size > MAX_EVIDENCE_FILE_SIZE_BYTES) {
          next.push({
            id: crypto.randomUUID(),
            file,
            sourceCategory: defaultEvidenceCategory(file),
            sourceDescription: '',
            verificationStatus: 'Unreviewed',
            truthClass: defaultTruthClass(defaultEvidenceCategory(file)),
            status: 'REJECTED',
            warning: `Oversized file. Maximum size is ${MAX_EVIDENCE_FILE_SIZE_LABEL}.`
          });
          existingKeys.add(duplicateKey);
          continue;
        }

        const sourceCategory = defaultEvidenceCategory(file);
        next.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          sourceCategory,
          sourceDescription: '',
          verificationStatus: 'Unreviewed',
          truthClass: defaultTruthClass(sourceCategory),
          status: 'READY'
        });
        existingKeys.add(duplicateKey);
      }

      return next;
    });
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files ?? []);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  function removeItem(id: string) {
    setItems((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function updateItem(id: string, changes: Partial<PendingEvidence>) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const next = { ...item, ...changes };
      if (changes.sourceCategory) next.truthClass = defaultTruthClass(changes.sourceCategory);
      return next;
    }));
  }

  function makeAsset(item: PendingEvidence, index: number): PropertyAsset {
    return {
      id: item.id,
      evidenceItemId: item.id,
      type: item.file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT',
      filename: item.file.name,
      originalFilename: item.file.name,
      sanitizedFilename: sanitizeFilename(item.file.name),
      mimeType: item.file.type || 'application/octet-stream',
      sizeBytes: item.file.size,
      uploadedAt: new Date().toISOString(),
      isPrimary: index === 0 && item.file.type.startsWith('image/'),
      provenance: 'USER_PROVIDED',
      sourceCategory: item.sourceCategory,
      sourceDescription: item.sourceDescription,
      truthClass: item.truthClass,
      verificationStatus: item.verificationStatus,
      uploadStatus: systemStatus.secureUploadsEnabled && betaCode.trim() ? 'QUEUED' : 'LOCAL_PREVIEW_ONLY',
      localPreviewAvailable: Boolean(item.previewUrl)
    };
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!address.trim() && !locationDescription.trim() && readyItems.length === 0) {
      setError('Add at least an address, a location description, or one valid property evidence file.');
      return;
    }

    setProcessing(true);
    setError('');
    setNotice('');
    const now = new Date().toISOString();
    const projectId = crypto.randomUUID();
    const initialAssets = readyItems.map(makeAsset);
    const rejectedAssets = items.filter((item) => item.status === 'REJECTED').map((item, index): PropertyAsset => ({
      ...makeAsset(item, index + initialAssets.length),
      uploadStatus: 'REJECTED',
      errorMessage: item.warning
    }));

    let project: SiteProject = {
      id: projectId,
      name: name.trim() || address.trim().split(',')[0] || 'Untitled Property Investigation',
      investigationType,
      address: address.trim(),
      locationDescription: locationDescription.trim() || undefined,
      parcelId: parcelId.trim() || undefined,
      listingUrl: listingUrl.trim() || undefined,
      primaryQuestion: question.trim() || 'What could realistically be done with this property?',
      stage: initialAssets.length ? 'EVIDENCE_GATHERING' : 'CAPTURED',
      status: initialAssets.length ? 'Property evidence collected' : 'New investigation',
      assets: [...initialAssets, ...rejectedAssets],
      evidence: [],
      missingInformation: [
        'Official parcel number or parcel numbers',
        'Official ownership record',
        'Official zoning jurisdiction and permitted uses',
        'Floodplain, wetlands, buffers and buildable acreage',
        'Road-access, utilities, drainage and environmental constraints',
        'Survey, easements, title restrictions and approval process'
      ],
      analysisConnection: {
        nfe: systemStatus.nfe,
        hdp: systemStatus.hdp,
        rrs: systemStatus.rrs,
        adapterVersion: systemStatus.adapterVersion,
        label: getNfeConnectionLabel(systemStatus.nfe)
      },
      findings: [],
      scenarios: [],
      risks: [],
      analysisCompleted: false,
      createdAt: now,
      updatedAt: now
    };

    try {
      saveProject(project);

      if (systemStatus.secureUploadsEnabled && betaCode.trim()) {
        try {
          await createPrivateProjectRecord(project, betaCode.trim());
          const uploadedAssets: PropertyAsset[] = [];
          for (let index = 0; index < readyItems.length; index += 1) {
            const item = readyItems[index];
            const queuedAsset = { ...initialAssets[index], uploadStatus: 'UPLOADING' as const };
            project = { ...project, assets: project.assets.map((asset) => asset.id === queuedAsset.id ? queuedAsset : asset) };
            saveProject(project);
            try {
              uploadedAssets.push(await uploadPrivateEvidence(project.id, queuedAsset, item.file, betaCode.trim()));
            } catch (uploadError) {
              uploadedAssets.push({
                ...queuedAsset,
                uploadStatus: 'FAILED',
                errorMessage: uploadError instanceof Error ? uploadError.message : 'Upload failed. Retry from the Evidence Collection stage.'
              });
            }
          }
          project = {
            ...project,
            assets: [
              ...uploadedAssets,
              ...rejectedAssets
            ],
            status: uploadedAssets.some((asset) => asset.uploadStatus === 'FAILED')
              ? 'Investigation created with one or more failed evidence uploads'
              : 'Private evidence saved',
            updatedAt: new Date().toISOString()
          };
          saveProject(project);
        } catch (storageError) {
          project = {
            ...project,
            assets: project.assets.map((asset) => asset.uploadStatus === 'QUEUED' ? {
              ...asset,
              uploadStatus: 'FAILED',
              errorMessage: storageError instanceof Error ? storageError.message : 'Secure storage unavailable.'
            } : asset),
            status: 'Investigation preserved — secure evidence storage unavailable',
            updatedAt: new Date().toISOString()
          };
          saveProject(project);
        }
      } else if (readyItems.length > 0) {
        project = {
          ...project,
          assets: project.assets.map((asset) => asset.uploadStatus === 'LOCAL_PREVIEW_ONLY' ? {
            ...asset,
            uploadStatus: 'SECURE_STORAGE_REQUIRED',
            errorMessage: 'Local preview only — this file has not been securely saved.'
          } : asset),
          status: 'Intake saved — secure storage required before public file upload',
          updatedAt: new Date().toISOString()
        };
        saveProject(project);
      }

      router.push(`/sites/${project.id}`);
    } catch {
      setError('This browser could not preserve the investigation metadata. Try again with fewer files.');
      setProcessing(false);
    }
  }

  return (
    <div className="page-wrap narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">New Property Investigation</span>
          <h1>Start with what you have.</h1>
          <p>A photo, an address, or a simple field note is enough to begin. Missing information stays visibly missing.</p>
        </div>
      </header>

      <form onSubmit={submit} className="new-site-layout">
        <section className="form-card evidence-intake-card">
          <div className="form-card-header">
            <div><span className="step-number">1</span><h2>Add property evidence</h2></div>
            <span className="optional">Recommended · {items.length}/{MAX_EVIDENCE_FILES}</span>
          </div>
          <p className="form-supporting-text">Add photos, documents, plans, listings, maps or correspondence.</p>

          <div
            className={dragActive ? 'upload-zone upload-zone-active' : 'upload-zone'}
            role="button"
            tabIndex={0}
            onClick={() => allFileInputRef.current?.click()}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') allFileInputRef.current?.click(); }}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
          >
            <input ref={allFileInputRef} type="file" accept={ACCEPT_ATTRIBUTE} multiple onChange={onFiles} />
            <span className="upload-icon">＋</span>
            <strong>Drop evidence here or choose files</strong>
            <small>Add photographs and supporting documents. Analysis begins only when you request it.</small>
            <small>Accepted: JPG, JPEG, PNG, WEBP, PDF, DOCX, TXT, CSV · Maximum {MAX_EVIDENCE_FILES} files · {MAX_EVIDENCE_FILE_SIZE_LABEL} each</small>
          </div>

          <div className="upload-action-row">
            <button className="button button-secondary" type="button" onClick={() => photoInputRef.current?.click()}>Take or add photos</button>
            <button className="button button-secondary" type="button" onClick={() => documentInputRef.current?.click()}>Add documents</button>
            <input ref={photoInputRef} className="visually-hidden" type="file" accept={IMAGE_ACCEPT_ATTRIBUTE} capture="environment" multiple onChange={onFiles} />
            <input ref={documentInputRef} className="visually-hidden" type="file" accept={DOCUMENT_ACCEPT_ATTRIBUTE} multiple onChange={onFiles} />
          </div>

          {!systemStatus.secureUploadsEnabled && (
            <div className="storage-truth-banner">
              <strong>INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD</strong>
              <span>Local preview only — selected file contents are not saved in localStorage and will not survive page closure. Investigation metadata will be preserved.</span>
            </div>
          )}

          {items.length > 0 && (
            <div className="evidence-intake-list">
              {items.map((item) => (
                <article className={item.status === 'REJECTED' ? 'evidence-upload-item rejected' : 'evidence-upload-item'} key={item.id}>
                  <div className="evidence-upload-preview">
                    {item.previewUrl ? <img src={item.previewUrl} alt="Local preview only" /> : <span>{item.file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC'}</span>}
                  </div>
                  <div className="evidence-upload-main">
                    <div className="evidence-upload-title-row">
                      <div><strong>{item.file.name}</strong><small>{item.file.type || 'Type not reported'} · {formatBytes(item.file.size)}</small></div>
                      <span className={item.status === 'REJECTED' ? 'upload-state rejected' : 'upload-state ready'}>{item.status === 'REJECTED' ? 'Rejected' : 'Ready'}</span>
                    </div>
                    {item.warning && <p className="upload-warning">{item.warning}</p>}
                    {item.status === 'READY' && (
                      <div className="evidence-upload-fields">
                        <label>Source / provenance
                          <select value={item.sourceCategory} onChange={(event) => updateItem(item.id, { sourceCategory: event.target.value as EvidenceSourceCategory })}>
                            {EVIDENCE_SOURCE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                          </select>
                        </label>
                        <label>Verification state
                          <select value={item.verificationStatus} onChange={(event) => updateItem(item.id, { verificationStatus: event.target.value as VerificationState })}>
                            {verificationStates.map((state) => <option key={state}>{state}</option>)}
                          </select>
                        </label>
                        <label className="full-width-field">Source description
                          <input value={item.sourceDescription} onChange={(event) => updateItem(item.id, { sourceDescription: event.target.value })} placeholder="e.g. MLS listing supplied by user; not independently verified" />
                        </label>
                      </div>
                    )}
                    <div className="evidence-upload-actions">
                      {item.status === 'REJECTED' && <button type="button" className="text-button" onClick={() => documentInputRef.current?.click()}>Retry with another file</button>}
                      <button type="button" className="text-button danger" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="form-card">
          <div className="form-card-header"><div><span className="step-number">2</span><h2>Tell us where it is</h2></div><span className="optional">One field is enough</span></div>
          <label>Investigation type
            <select value={investigationType} onChange={(event) => setInvestigationType(event.target.value as SiteProject['investigationType'])}>
              <option>Known Property</option><option>Observed Property</option><option>Listing Review</option><option>Other</option>
            </select>
          </label>
          <label>Project name <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Florence TV Road Development Feasibility Test" /></label>
          <label>Address / location <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street address, city, state" /></label>
          <label>Or describe the location <textarea value={locationDescription} onChange={(event) => setLocationDescription(event.target.value)} placeholder="e.g. Vacant tract near TV Road and Black Creek Road" /></label>
        </section>

        <section className="form-card">
          <div className="form-card-header"><div><span className="step-number">3</span><h2>Ask a simple question</h2></div><span className="optional">No expert prompt needed</span></div>
          <textarea className="question-input" value={question} onChange={(event) => setQuestion(event.target.value)} />
          <div className="suggestion-row">{suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>)}</div>
        </section>

        <details className="form-card optional-card">
          <summary>Optional property details</summary>
          <div className="optional-fields">
            <label>Parcel ID <input value={parcelId} onChange={(event) => setParcelId(event.target.value)} /></label>
            <label>Listing URL <input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://…" /></label>
            {systemStatus.secureUploadsEnabled && systemStatus.controlledBetaGate && (
              <label>Controlled beta access code
                <input type="password" autoComplete="off" value={betaCode} onChange={(event) => setBetaCode(event.target.value)} placeholder="Invitation code" />
                <small>This code is sent only to the server for controlled private upload access and is not stored with the investigation.</small>
              </label>
            )}
          </div>
        </details>

        <div className="connection-status-card">
          <strong>{getNfeConnectionLabel(systemStatus.nfe)}</strong>
          <span>NFE Analysis, HDP Discovery and RRS Review remain separate. No analysis runs when evidence is added or when this page loads.</span>
        </div>

        {notice && <div className="notice-banner">{notice}</div>}
        {error && <div className="error-banner">{error}</div>}

        <div className="sticky-submit">
          <div><strong>Ready to create the investigation?</strong><small>Property information is preserved even when one evidence file fails.</small></div>
          <button className="button button-primary button-large" disabled={processing}>{processing ? 'Creating Property Workspace…' : 'Create Property Workspace →'}</button>
        </div>
      </form>
    </div>
  );
}
