# Contracts

Purpose: Shared platform contracts for API payloads, game manifests, telemetry events, and generated types.

Current scope:
- Zod schemas for installation, profile, catalog, launch, telemetry, report, and manifest payloads.
- Shared type exports for app and backend code.
- OpenAPI smoke document generation for app-facing endpoints.

Testing:
- `vitest` validates schema parsing and contract invariants.
