# Rollback Runbook

## Purpose

Return the platform to the last known good state after a bad deploy or release.

## Use When

- A release causes a user-facing outage
- A policy or safety regression reaches a deployed surface
- A deploy breaks catalog, launch, admin, or submission-critical flows

## Immediate Actions

1. Freeze new deploys until the incident owner says otherwise.
2. Capture the failing release identifier, affected surfaces, and user-visible symptoms.
3. Decide whether the fastest safe action is:
   - rolling back a deploy
   - disabling a game or version
   - restoring data
   - halting an App Store submission

## Rollback Steps

1. Identify the last known good release for each affected surface.
2. Roll back the affected service or site using the host's deployment controls.
3. If the issue is game-specific, use `docs/runbooks/disable-game.md` before attempting a full platform rollback.
4. If the issue is data-related, assess whether `docs/runbooks/restore-db.md` is required.
5. Re-run the minimum smoke checks for catalog, launch, admin access, and timer enforcement.
6. Record what was rolled back, who approved it, and what follow-up fix is needed before the next release attempt.

## Notes

- Native app binaries may not be instantly reversible once submitted or released. In that case, contain impact with server-side controls, disablement, or a paused rollout while a corrected build is prepared.
