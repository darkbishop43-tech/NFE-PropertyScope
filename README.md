# PropertyScope — Builder #2

Property intelligence and development-scenario MVP. This repository is intentionally isolated from the protected NFE-OS Platform.

## Current build

- Independent Next.js App Router project
- Responsive premium dashboard
- New Site field workflow with phone camera/file input
- Local MVP save/resume using Builder #2's own browser localStorage namespace
- Client-side image compression for local photo persistence
- Property Workspace with Overview, Evidence, Site Analysis, Scenarios, Risks, Visualize, and Project Plan
- Mock property evidence adapter
- Strict NFE-OS integration adapter with separate `runNfeAnalysis`, `runHdp`, and `runRrs` operations
- Separate NFE Analysis, HDP Discovery, RRS Review, and Overall Summary views
- Per-run request IDs, timestamps, provenance, adapter metadata, and mock/service status
- Failure isolation that preserves the real-estate case and requires manual retry
- Mock visual-generation adapter boundary
- TrueTakeoff future boundary only
- Supabase/Postgres schema foundation
- Visible provenance, confidence, and verification language
- Human scenario selection only

## Repository boundary

Read:

- `PROJECT_BOUNDARY.md`
- `docs/NFE_OS_INTEGRATION_BOUNDARY.md`

Run:

```bash
npm run boundary-check
```

Builder #2 must never modify or push to `darkbishop43-tech/NFE1.0-sandbox` and must never use the protected NFE-OS working tree.

## Local development

```bash
npm install
npm run boundary-check
npm run dev
```

Open `http://localhost:3000`.

## NFE-OS development integration

The current MVP uses `MockNfeOsAdapter` and makes no external NFE-OS calls.

No NFE-OS call occurs automatically on page load. A user must explicitly choose **Run NFE-OS Analysis**.

Future approved service endpoints remain localized behind `lib/adapters/nfe-os.ts`.

## MVP limitations

- Public property records are not live-connected.
- Zoning is never presented as authoritative.
- Map provider is not connected.
- NFE/HDP/RRS outputs are DEVELOPMENT / MOCK until an approved external service contract exists.
- Image generation is a placeholder.
- TrueTakeoff is not implemented.
- Local projects are browser/device-local until Supabase persistence is connected.

## Next engineering step

Connect Supabase as Builder #2's persistence layer without changing the protected NFE-OS Platform, then implement an approved external NFE-OS service adapter when Builder #1 publishes a stable contract.
