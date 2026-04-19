# ADR 0003: Local-Only Save State

- Status: Accepted
- Date: 2026-04-19
- Source: `docs/implementation-decisions.md`

## Context

Cloud sync is out of scope for MVP. The shell is expected to work offline for already-downloaded games, and the platform should avoid collecting unnecessary child data during the first release.

## Decision

Keep game save state local to the device for MVP.

For MVP:

- Save state lives in the shell's device-local SQLite store.
- The backend does not expose save-state APIs.
- The backend does not own a `save_states` table.
- Sync between devices is not part of the MVP contract.

## Consequences

- Save progress is available offline on the current device only.
- Device replacement, app deletion, or local data reset can remove saved progress.
- Backend scope stays smaller and child data collection stays lower.
- Any future sync feature needs a separate design and ADR instead of being implied by MVP behavior.
