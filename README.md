# NFE Site Intelligence — Builder #2

Standalone property-development intelligence MVP. This repository is intentionally isolated from the main NFE-OS Platform.

## Current build

- Independent Next.js App Router project
- Responsive premium dashboard
- New Site field workflow with phone camera/file input
- Local MVP save/resume using browser localStorage
- Client-side image compression for local photo persistence
- Property Workspace with Overview, Evidence, Site Analysis, Scenarios, Risks, Visualize, and Project Plan
- Mock property evidence adapter
- Mock NFE-OS adapter behind a strict interface boundary
- Mock visual-generation adapter boundary
- TrueTakeoff future boundary only
- Supabase/Postgres schema foundation
- Visible provenance, confidence, and verification language
- Human scenario selection only

## Repository boundary

Read `PROJECT_BOUNDARY.md`.

Run:

```bash
npm run boundary-check
```

## Local development

```bash
npm install
npm run boundary-check
npm run dev
```

Open `http://localhost:3000`.

## MVP limitations

- Public property records are not live-connected.
- Zoning is never presented as authoritative.
- Map provider is not connected.
- Image generation is a placeholder.
- TrueTakeoff is not implemented.
- Local projects are browser/device-local until Supabase persistence is connected.

## Next engineering step

Connect Supabase as the persistence layer without changing the domain model or page components, then replace mock adapters one service at a time.
