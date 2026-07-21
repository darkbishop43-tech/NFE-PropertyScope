# NFE PropertyScope — Builder #2 Repository Boundary

This repository is **NFE PropertyScope** only.

It is a standalone real-estate and property-development application. It may consume an approved NFE-OS service through its own adapter layer, but it may never modify or couple directly to the protected NFE-OS Platform.

## Prohibited coupling

- Do not edit or push to `darkbishop43-tech/NFE1.0-sandbox`.
- Do not modify the NFE-OS Platform local working directory.
- Do not import Platform `app.js`, DOM state, localStorage, IndexedDB, archive, prompts, validators, Arena implementation, or lineage.
- Do not use the Platform web UI or public URL as an unofficial backend.
- Do not store PropertyScope cases in the Platform browser archive.
- Do not expose service-role credentials or private NFE-OS credentials to the browser.

## Required separation

PropertyScope maintains its own repository, deployment, environment variables, API routes, database, object storage, case IDs, and evidence provenance.

The repository boundary check permits the historical local folder name `nfe-site-intelligence-builder2` and the current product folder name `PropertyScope`; it blocks the protected NFE-OS remote and forbidden source references.

**One engine. Multiple applications. Separate repositories. Separate deployments. Controlled integration.**
