# Disable Game Runbook

## Purpose

Remove a game or specific game version from circulation without waiting for a full app release.

## Use When

- A game is unsafe, broken, or out of policy
- A reviewed bundle is found to be corrupt or mismatched
- Legal, moderation, or support requires immediate removal

## Preconditions

- A maintainer has confirmed the slug and, if relevant, the version to disable.
- The team has decided whether the action is version-specific or global for the game.

## Steps

1. Record the reason for disablement, the reporter, and the affected slug and version.
2. Apply the disable action in the admin or backend control surface that owns catalog visibility.
3. Confirm the game no longer appears in catalog responses for new sessions.
4. Confirm new launch requests fail closed for the disabled target.
5. Verify the shell shows an unavailable state rather than continuing play for newly blocked launches.
6. Notify maintainers and support owners that disablement is active.
7. Open follow-up work for root-cause analysis, bundle replacement, or permanent removal.

## Evidence to Keep

- The exact game slug and version
- Timestamp of the disable action
- Reason for the change
- Proof that catalog and launch behavior updated as expected
