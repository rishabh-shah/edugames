# ADR 0004: Parent Zone and Time-Limit Policy

- Status: Accepted
- Date: 2026-04-19
- Source: `docs/implementation-decisions.md`

## Context

EduGames needs a clear adult-only management area and a time-limit model that is understandable for families, enforceable by the shell, and compatible with child-directed platform constraints.

## Decision

Put parent controls inside a protected Parent Zone in the native shell and use fixed gameplay time limits for MVP.

For MVP:

- Parent Zone access requires a parental gate.
- Parent Zone owns profile management, time-limit settings, reports, support, and local reset actions.
- Timer options are fixed to `15`, `30`, `45`, or `60` minutes.
- Limits are tracked per child profile.
- The timer applies to active gameplay time only.
- The timer pauses when the app is backgrounded or no game is active.
- On expiry, the shell exits the game and returns the child to a locked home state.
- Time extensions require the parental gate and use the same fixed option set.

## Consequences

- Time-limit enforcement is a shell responsibility, not game logic.
- Games must tolerate exit and resume through the platform bridge.
- Parent-facing policy stays in native UI, where the app can apply stronger access controls.
- If the project later adds PIN-based shortcuts or more flexible schedules, that should be a follow-up decision.
