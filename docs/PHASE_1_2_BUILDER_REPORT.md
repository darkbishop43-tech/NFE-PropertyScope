# NFE PropertyScope — Phase 1.2 Builder Report

1. **Previous PropertyScope version:** 0.1.0 public baseline.
2. **New PropertyScope version:** 1.2.0.
3. **Build identifier:** `PS-P1.2-EVIDENCE-WORKSPACE-20260721`.
4. **Repository visibility:** Public baseline per owner acceptance; no remote is configured in this isolated build copy.
5. **Files inspected:** package/version files; dashboard; intake; workspace; global styles; app shell; storage; types; demo data; NFE adapter; Supabase schema; project boundary; README; build status; environment template.
6. **Files changed:** dashboard, intake, workspace, styles, branding/metadata, storage/types, NFE adapter truth labels, secure API routes, Supabase schema/migration, environment template, documentation, acceptance case, boundary script, package metadata.
7. **Remaining old-language references:** Internal `/sites` route and selected technical names remain for compatibility. No public-facing `NFE Site Intelligence` brand is intended in the Phase 1.2 UI.
8. **Brand-completion result:** UI brand updated to **NFE PropertyScope** with supporting description **Real Estate Development Intelligence**; visible navigation uses **New Investigation** and **New Property Investigation**.
9. **Blank-button root cause:** Secondary button inherited white text from a dark parent while also using a white background.
10. **Blank-button fix result:** Explicit dark text color and label **Start an Investigation →**; route targets the existing intake.
11. **Existing photo implementation found:** Client image compression to data URLs with browser preview/state handling.
12. **Preview-only or persistent:** Original user photos were effectively browser/localStorage data-URL persistence. Phase 1.2 removes uploaded file contents from localStorage; files remain local-preview-only unless secure private storage is configured.
13. **Image types implemented:** JPG, JPEG, PNG, WEBP.
14. **Document types implemented:** PDF, DOCX, TXT, CSV.
15. **Maximum file count:** 12 per investigation.
16. **Maximum file size:** 20 MB per file.
17. **Storage provider/adapter:** Supabase REST + Storage server adapter, disabled until server environment variables are configured.
18. **Private-bucket confirmation:** Migration creates/uses private bucket `property-evidence`; no permanent public URL path is used.
19. **Access-control method:** Controlled beta invitation-code allowlist mapped to tester IDs; server ownership checks; private storage; temporary signed access; simple server-side rate guard.
20. **Evidence metadata schema:** evidenceItemId, propertyCaseId/projectId, original/sanitized filename, MIME type, byte size, upload timestamp, uploader ID, source category/description, private object reference, upload status, verification status, provenance, truth class.
21. **Provenance labels implemented:** User photo; User document; Listing material; Government record; Survey or parcel material; Business/project plan; County or municipal correspondence; Third-party report; Conceptual material; Unclassified evidence.
22. **Verification states implemented:** Unreviewed; Needs verification; Partially verified; Verified against source; Conflicting source; Superseded.
23. **Workspace creation result:** Intake creates a propertyCaseId, saves the investigation record, preserves queued/failed evidence state, and opens the new Property Workspace.
24. **Refresh persistence result:** Local investigation metadata restores after refresh. Secure evidence persistence requires configured Supabase and controlled beta identity.
25. **Browser close/reopen result:** Local investigation metadata restores from PropertyScope browser storage. Secure evidence restoration is implemented but not live-tested without credentials.
26. **Desktop acceptance result:** Production build passes; desktop routes compile and render in the local build.
27. **Mobile acceptance result:** Responsive intake/workspace styling and mobile file/photo inputs implemented; device acceptance still required on the deployed build.
28. **Actual NFE adapter state:** MOCK by default; configurable status can report LIVE, MOCK, DISCONNECTED, or FAILED.
29. **Actual HDP adapter state:** MOCK by default.
30. **Actual RRS adapter state:** MOCK by default.
31. **Mocks visibly labeled:** Yes — `NFE-OS CONNECTION: MOCK — TEST OUTPUT ONLY` and provider metadata `DEVELOPMENT / MOCK`.
32. **Private NFE-OS core copied:** No. No Platform app.js, DOM, localStorage/archive, prompts, validators, Arena code, lineage, or private core was copied.
33. **Commit hash:** Filled after local commit in the handoff response.
34. **Deployment status:** Not deployed from this isolated build environment. Existing public deployment remains untouched until the owner pushes this patch.
35. **Deployment URL:** Existing baseline: `https://nfe-property-scope.vercel.app`.
36. **Known limitations:** No production Supabase credentials; no live private-upload acceptance; no full authentication; controlled-beta allowlist is the current smallest secure gate; in-memory rate limiting is instance-local; NFE/HDP/RRS are not connected to a stable live service; route `/sites` remains for compatibility.
37. **Recommended Phase 1.3:** Configure a dedicated Supabase project and private bucket; apply migration; set controlled beta tester identities; run two-tester access-isolation tests; verify signed downloads, restart persistence, file retry, and mobile uploads; then connect only an approved external NFE-OS service contract.

## Release gate

**INTAKE UI COMPLETE — SECURE STORAGE REQUIRED BEFORE PUBLIC FILE UPLOAD**

Do not declare full Phase 1.2 PASS until private persistent uploads, cross-tester isolation, refresh restoration, browser close/reopen restoration, and deployed adapter truth states have been tested with real server configuration.
