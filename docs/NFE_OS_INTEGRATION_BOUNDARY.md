# NFE-OS External Integration Boundary — Builder #2

## Rule

NFE PropertyScope may **use** an approved NFE-OS service. It may never modify the NFE-OS Platform to make integration easier.

## Local adapter contract

All NFE-OS-specific calls are localized to:

`lib/adapters/nfe-os.ts`

The current interface exposes three distinct operations:

- `runNfeAnalysis(input)`
- `runHdp(input)`
- `runRrs(input)`

The user interface does not call NFE-OS endpoints directly.

## Structured payload

The real-estate app owns the case and sends a structured payload containing:

- `domain: "real-estate"`
- `realEstateCaseId`
- `caseTitle`
- `question`
- `sourceMaterial`
- `evidence`
- real-estate metadata

The real-estate case ID remains independent from any future internal NFE-OS case ID.

## Output separation

Returned outputs are stored and shown separately as:

1. NFE Analysis
2. HDP Discovery
3. RRS Review
4. Overall Summary

Each run may store:

- real-estate case ID
- NFE request ID
- HDP request ID
- RRS request ID
- timestamps
- adapter version
- provider/model/version metadata where available
- mock/service flag
- error state

## Failure isolation

NFE-OS unavailability must never destroy or block the real-estate case.

Required behavior:

- preserve property data
- exit loading state
- display a clear unavailable message
- preserve any partial returned outputs
- do not automatically retry
- provide user-controlled retry only

## Current development mode

The MVP uses `MockNfeOsAdapter`.

All mock outputs are visibly labeled `DEVELOPMENT / MOCK`.

No external NFE-OS model call occurs in the mock implementation.

## Future service

A future approved service adapter may map this interface to endpoints conceptually similar to:

- `POST /nfe/analyze`
- `POST /hdp/run`
- `POST /rrs/review`

These endpoint names are placeholders, not assumptions that such endpoints currently exist.

No default NFE-OS Platform URL is hardcoded anywhere in Builder #2.
