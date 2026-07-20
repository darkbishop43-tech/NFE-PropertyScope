# Builder #2 Project Boundary — LOCKED

This repository is **NFE Site Intelligence** only.

## Protected NFE-OS systems

Builder #2 must not edit, commit to, push to, import from, scrape, or automate the protected NFE-OS Platform.

Protected repository:

`darkbishop43-tech/NFE1.0-sandbox`

Protected local working directory:

`C:\Users\Bishop\Desktop\NFE-Platform\mnt\data\nfe_platform_prototype`

Builder #1 remains authoritative for NFE-OS Platform, Studio, NFE, HDP, RRS, Reasoning Arena, case lineage, archive, validation, and Platform deployment.

## Hard boundary

- This repository must not modify, rebuild, refactor, or reproduce the main NFE-OS Platform.
- NFE-OS is treated as an external protected service/engine dependency.
- NFE-OS integration occurs only through `lib/adapters/nfe-os.ts` or a future service implementation behind the same interface.
- The app must not import the Platform `app.js`, Platform DOM state, Platform localStorage keys, browser-local archive data, workspace state, prompts, validators, lineage logic, or production UI.
- The NFE-OS Platform production URL must not be treated as a backend API unless Builder #1 later publishes an approved service contract.
- If integration exposes a Platform defect, Builder #2 stops, documents it, and returns it to Builder #1 rather than patching it.
- TrueTakeoff is not implemented here. Only a future adapter boundary may exist.
- External provider logic must remain behind adapters.

## Repository isolation

Builder #2 owns separate:

- repository and branches
- local project folder
- deployment
- environment variables
- storage and database
- API routes

Expected repository root folder:

`nfe-site-intelligence-builder2`

Run before major work:

`npm run boundary-check`

The check intentionally fails if executed from another repository name, from a package that is not `nfe-site-intelligence`, or when the Git remote points at the protected NFE-OS repository.

**One engine. Multiple applications. Separate repositories. Separate deployments. Controlled integration.**
