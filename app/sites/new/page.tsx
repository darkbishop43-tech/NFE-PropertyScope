'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/image-utils';
import { saveProject } from '@/lib/storage';
import type { PropertyAsset, SiteProject } from '@/lib/types';

const suggestions = ['What could go here?', 'Could this be residential?', 'Could apartments work here?', 'Would a restaurant make sense here?', 'Analyze this site for possible development.'];

export default function NewSitePage() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [question, setQuestion] = useState('What could realistically be done with this property?');
  const [name, setName] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [listingUrl, setListingUrl] = useState('');
  const [assets, setAssets] = useState<PropertyAsset[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  async function onPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 6);
    setProcessing(true); setError('');
    try {
      const prepared = await Promise.all(files.map(async (file, index) => ({ id: crypto.randomUUID(), type: 'PHOTO' as const, dataUrl: await compressImage(file), filename: file.name, mimeType: 'image/jpeg', isPrimary: assets.length === 0 && index === 0, provenance: 'USER_PROVIDED' as const })));
      setAssets((current) => [...current, ...prepared].slice(0, 6));
    } catch { setError('One or more photos could not be prepared. Try a smaller image.'); }
    finally { setProcessing(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!address.trim() && !locationDescription.trim() && assets.length === 0) { setError('Add at least an address, a location description, or one property photo.'); return; }
    const now = new Date().toISOString();
    const project: SiteProject = {
      id: crypto.randomUUID(), name: name.trim() || address.trim().split(',')[0] || 'Untitled Site Investigation', address: address.trim(), locationDescription: locationDescription.trim() || undefined,
      parcelId: parcelId.trim() || undefined, listingUrl: listingUrl.trim() || undefined, primaryQuestion: question.trim() || 'What could realistically be done with this property?',
      stage: 'CAPTURED', status: 'New investigation', assets, evidence: [], findings: [], scenarios: [], risks: [], analysisCompleted: false, createdAt: now, updatedAt: now
    };
    try { saveProject(project); router.push(`/sites/${project.id}`); }
    catch { setError('This browser could not save the project. Large photo sets can exceed local MVP storage; try fewer photos.'); }
  }

  return (
    <div className="page-wrap narrow-page">
      <header className="page-header"><div><span className="eyebrow">New Site</span><h1>Start with what you have.</h1><p>A photo, an address, or a simple field note is enough to begin. Missing information stays visibly missing.</p></div></header>
      <form onSubmit={submit} className="new-site-layout">
        <section className="form-card photo-card">
          <div className="form-card-header"><div><span className="step-number">1</span><h2>Upload property photos</h2></div><span className="optional">Recommended</span></div>
          <label className="upload-zone"><input type="file" accept="image/*" capture="environment" multiple onChange={onPhotos} /><span className="upload-icon">＋</span><strong>{processing ? 'Preparing photos…' : 'Add or take property photos'}</strong><small>Up to 6 compressed previews in the local MVP</small></label>
          {assets.length > 0 && <div className="photo-preview-grid">{assets.map((asset) => <img key={asset.id} src={asset.dataUrl} alt={asset.filename} />)}</div>}
        </section>
        <section className="form-card">
          <div className="form-card-header"><div><span className="step-number">2</span><h2>Tell us where it is</h2></div><span className="optional">One field is enough</span></div>
          <label>Project name <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Florence Highway Opportunity" /></label>
          <label>Address / location <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address, city, state" /></label>
          <label>Or describe the location <textarea value={locationDescription} onChange={(e) => setLocationDescription(e.target.value)} placeholder="e.g. Vacant lot beside the gas station near Exit 170" /></label>
        </section>
        <section className="form-card">
          <div className="form-card-header"><div><span className="step-number">3</span><h2>Ask a simple question</h2></div><span className="optional">No expert prompt needed</span></div>
          <textarea className="question-input" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <div className="suggestion-row">{suggestions.map((item) => <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>)}</div>
        </section>
        <details className="form-card optional-card"><summary>Optional property details</summary><div className="optional-fields"><label>Parcel ID <input value={parcelId} onChange={(e) => setParcelId(e.target.value)} /></label><label>Listing URL <input value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} placeholder="https://…" /></label></div></details>
        {error && <div className="error-banner">{error}</div>}
        <div className="sticky-submit"><div><strong>Ready to create the investigation?</strong><small>All live public-record integrations remain disconnected in this MVP.</small></div><button className="button button-primary button-large" disabled={processing}>Create Property Workspace →</button></div>
      </form>
    </div>
  );
}
