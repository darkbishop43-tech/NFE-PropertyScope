# NFE Site Intelligence — Builder #2 Build Status

## Repository isolation

- Standalone repository root: `nfe-site-intelligence-builder2`
- Independent Git history initialized locally
- No main NFE-OS repository is present inside this project
- `PROJECT_BOUNDARY.md` locks the separation rule
- `npm run boundary-check` verifies the expected standalone repository identity

## Implemented

### Foundation
- Next.js App Router + TypeScript
- Responsive desktop/mobile application shell
- Standalone navigation and design system
- Domain types and adapter boundaries
- Supabase/Postgres schema foundation
- Environment-variable placeholders

### Dashboard
- Recent/saved property investigations
- Demo projects
- Project stage/status cards
- New Site entry point

### New Site workflow
- Phone camera/file upload input
- Client-side image compression
- Address/location input
- Location-description fallback
- Simple user question with suggestions
- Optional parcel/listing fields
- Local save/resume for MVP

### Property Workspace
- Overview
- Evidence
- Site Analysis
- Scenarios
- Risks
- Visualize
- Project Plan

### Evidence & provenance
- Confidence labels
- Verification flags
- Provenance types
- Mock evidence adapter
- Explicit unknown/not-yet-retrieved states

### NFE-OS boundary
- `NfeOsAdapter` interface
- `MockNfeOsAdapter` implementation
- No private NFE-OS architecture duplicated in UI components

### Scenario governance
- Multiple scenario cards
- No automatic winner
- Human-only scenario selection
- Selection disclaimer

### Visual / future integrations
- Before/proposed concept workspace shell
- Original property image kept separate
- Visual-generation adapter placeholder
- TrueTakeoff adapter boundary only
- "COMING LATER" cost/material action

## Validation completed

- `npm run boundary-check` — PASS
- `npm run typecheck` — PASS
- `npm run build` — PASS
- Runtime smoke test:
  - `/dashboard` — HTTP 200
  - `/sites/new` — HTTP 200
  - `/sites/demo-urban-lot` — HTTP 200
- `npm audit --omit=dev` — 0 reported vulnerabilities

## Current MVP limitations

- No live authoritative property/zoning/flood/parcel integrations
- No live map provider
- No remote NFE-OS service connection
- No real image-generation provider
- No TrueTakeoff functionality
- Local browser/device persistence until Supabase is connected

## Next recommended build step

Connect this standalone repository to its own new remote GitHub repository and its own Vercel project, then provision a dedicated Supabase project for NFE Site Intelligence. Do not reuse the main NFE-OS repository, Vercel project, or database.
