# ADR 0002: Single Monorepo for MVP

- Status: Accepted
- Date: 2026-04-19
- Source: `docs/implementation-decisions.md`

## Context

The MVP needs one place to define contracts, sample games, shell work, backend services, docs, and review workflows. Splitting too early would make bootstrap work harder to coordinate and would slow down changes that cross package boundaries.

## Decision

Use one public monorepo for the MVP.

The intended shape is:

- `apps/` for deployable applications
- `services/` for backend processes
- `packages/` for shared contracts and SDKs
- `games/` for in-repo sample and contributed games
- `docs/` for ADRs, runbooks, and contributor guidance

Do not split into separate game, registry, or template repositories during the MVP bootstrap.

## Consequences

- Shared contracts, validation, CI policy, and contributor guidance live in one repo.
- Cross-cutting changes can land in one pull request.
- Repo-level tooling can be added once and reused across the full platform.
- If the contribution model later outgrows one repo, we will revisit the split after the in-repo workflow is proven.
