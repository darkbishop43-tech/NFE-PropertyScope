# NFE Site Intelligence — Builder #2 Build Status

## Current status

Builder #2 continues as a standalone real-estate/property intelligence application.

The protected NFE-OS Platform remains external and untouched.

## Isolation controls

- Standalone local Git repository
- No Git remote configured
- Protected NFE-OS repository explicitly blocked by boundary check
- Protected NFE-OS local working-directory references blocked from application source
- No Platform `app.js` import
- No Platform DOM scraping or click automation
- No dependency on Platform localStorage, browser archive, workspace state, prompts, validators, or lineage
- Separate Builder #2 environment variables, storage, database schema, and future API routes

## NFE-OS integration contract

All engine-specific integration is localized to:

`lib/adapters/nfe-os.ts`

Operations remain separate:

- `runNfeAnalysis`
- `runHdp`
- `runRrs`

Current active implementation:

`MockNfeOsAdapter` — DEVELOPMENT / MOCK only

Future implementation:

`RemoteNfeOsAdapter` — configurable approved service base URL and localized paths. It is not instantiated by the current UI and has no default NFE-OS Platform URL.

## Output separation

The Property Workspace now displays separate sections for:

- NFE Analysis
- HDP Discovery
- RRS Review
- Overall Summary

Each integration run can preserve:

- real-estate case ID
- NFE request ID
- HDP request ID
- RRS request ID
- timestamps
- adapter version
- provider/model/service version metadata
- mock/service flag
- partial or failed state
- error message

## Failure isolation

If a future NFE-OS service is unavailable:

- the real-estate case remains saved
- partial outputs remain preserved
- loading ends normally
- the user receives a clear unavailable message
- no automatic retry occurs
- retry remains a visible user action

## Database foundation

Added `nfe_os_integration_runs` to the Builder #2 Supabase schema.

This table stores returned integration results in the real-estate application's database and does not modify or mirror NFE-OS Platform case lineage.

## Verification

- Repository boundary check: PASS
- TypeScript check: PASS
- Production build: PASS
- Git diff whitespace check: PASS
- Protected Platform source-coupling scan: PASS

## Governance

Human final authority remains locked.

Outputs are presented as structured analysis, decision support, evidence review, risk identification, and material requiring further verification—not guaranteed truth, legal advice, financial advice, appraisal certification, underwriting approval, or investment approval.

**One engine. Multiple applications. Separate repositories. Separate deployments. Controlled integration.**
