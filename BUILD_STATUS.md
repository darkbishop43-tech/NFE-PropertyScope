# NFE PropertyScope — Builder #2 Build Status

## Canonical version

- Previous public version: `0.1.0`
- Phase 1.2 version: `1.2.0`
- Build identifier: `PS-P1.2-EVIDENCE-WORKSPACE-20260721`
- Repository visibility baseline: Public
- NFE adapter baseline: MOCK — TEST OUTPUT ONLY
- HDP adapter baseline: MOCK — TEST OUTPUT ONLY
- RRS adapter baseline: MOCK — TEST OUTPUT ONLY
- Authentication baseline: No full user authentication
- Controlled upload gate: Server-side invitation-code allowlist when configured

## Verified locally

- Builder #2 repository boundary check: PASS
- TypeScript check: PASS
- Next.js production build: PASS
- Dashboard route: HTTP 200
- New Investigation route: HTTP 200
- Demo Property Workspace route: HTTP 200
- System status route: HTTP 200
- System status without secure environment configuration: `LOCAL_PREVIEW_ONLY`
- NFE/HDP/RRS status without service integration: `MOCK`

## Storage truth

The original implementation compressed user images into data URLs and stored them in browser localStorage. Phase 1.2 removes user-uploaded file contents from localStorage persistence.

The current source contains a dedicated server-side Supabase private-storage adapter, private bucket migration, ownership checks, signed temporary access, controlled-beta allowlist, validation, and rate guard. These paths are disabled unless all required server environment variables are configured.

Because no dedicated Supabase project or production credentials are available in this build environment, private upload persistence and cross-tester isolation have **not** been live-tested. Do not claim full Phase 1.2 acceptance until that test is completed.

## Release wording

`INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD`
