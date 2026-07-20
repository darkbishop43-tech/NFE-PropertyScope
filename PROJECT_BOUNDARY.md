# Builder #2 Project Boundary — LOCKED

This repository is **NFE Site Intelligence** only.

## Hard boundary

- This repository must not modify, rebuild, refactor, or reproduce the main NFE-OS Platform.
- NFE-OS is a separate canonical system.
- NFE-OS integration occurs only through `lib/adapters/nfe-os.ts` (or a future service implementation behind the same interface).
- TrueTakeoff is not implemented here. Only a future adapter boundary may exist.
- External provider logic must remain behind adapters.

## Repository isolation

Expected repository root folder:

`nfe-site-intelligence-builder2`

Run before major work:

`npm run boundary-check`

The check intentionally fails if executed from another repository name or a package that is not `nfe-site-intelligence`.
