# NFE PropertyScope — Builder #2

**Version:** 1.2.0  
**Build:** `PS-P1.2-EVIDENCE-WORKSPACE-20260721`

Standalone real-estate development intelligence application. This repository is intentionally isolated from the protected NFE-OS Platform.

## Phase 1.2 capabilities

- Approved dashboard and photo-first intake preserved
- Public brand completed as **NFE PropertyScope**
- Friendly **New Investigation** workflow
- Mixed property evidence intake for JPG, JPEG, PNG, WEBP, PDF, DOCX, TXT, and CSV
- Desktop drag/drop, file picker, phone photo selection, and phone document selection
- Maximum 12 files per investigation and 20 MB per file
- File name, type, size, source category, verification state, truth class, and upload state
- Duplicate, unsupported-type, oversized-file, removal, and retry handling
- Investigation workspace with nine visible stages
- Separate NFE Analysis, HDP Discovery, RRS Review, Overall Summary, and Human Decision
- Explicit NFE-OS connection truth state
- Human-confirmed NFE request review; uploads never trigger analysis
- Local investigation metadata restoration after refresh/browser restart
- Secure private Supabase storage routes prepared behind a controlled-beta allowlist
- Server-side MIME, extension, size, content-signature, ownership, count, and rate-limit checks
- Private bucket/signed-access migration included

## Current release gate

The public build remains safe when private storage is not configured:

`INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD`

In that state, selected file contents are previews only and are not persisted in localStorage. Investigation metadata, evidence metadata, failed states, provenance, and verification states can still be preserved in the browser.

Permanent uploads must not be enabled until the dedicated Supabase project, private bucket migration, server credentials, and controlled-beta tester map have been configured and tested.

## Local verification

```bash
npm install
npm run verify
npm run dev
```

## Protected boundary

PropertyScope must not import, edit, scrape, automate, or depend on the protected NFE-OS Platform UI, `app.js`, DOM, localStorage, IndexedDB, case archive, prompts, validators, Arena implementation, or lineage.

**One engine. Multiple applications. Separate repositories. Separate deployments. Controlled integration.**
