import Link from 'next/link';
import type { SiteProject } from '@/lib/types';

export default function PropertyCard({ project }: { project: SiteProject }) {
  const hero = project.assets.find((asset) => asset.isPrimary && asset.dataUrl)?.dataUrl;
  return (
    <Link href={`/sites/${project.id}`} className="property-card">
      <div className="property-thumb" style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        {!hero && <div className="property-placeholder"><span>⌂</span><small>{project.isDemo ? 'DEMO PROPERTY' : 'PROPERTY'}</small></div>}
        {project.isDemo && <span className="demo-pill">DEMO DATA</span>}
      </div>
      <div className="property-card-body">
        <div className="property-card-top"><span className="stage-pill">{project.stage.replaceAll('_', ' ')}</span><span className="muted">Updated {new Date(project.updatedAt).toLocaleDateString()}</span></div>
        <h3>{project.name}</h3>
        <p>{project.address || project.locationDescription || 'Location not yet confirmed'}</p>
        <div className="property-card-footer"><span>{project.status}</span><strong>Open project →</strong></div>
      </div>
    </Link>
  );
}
