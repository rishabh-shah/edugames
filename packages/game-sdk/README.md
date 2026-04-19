# Game SDK

Purpose: Shared runtime helpers for approved EduGames titles integrating with the shell bridge and platform rules.

Current surface:
- `createEduGameSdk({ gameId, globalObject, storage, transport })`
- `loadState()` for persisted local progress
- `saveState(state)` for durable progress writes plus bridge emission
- `ready(metadata)` for runtime readiness signaling
- `emitEvent(name, value)` for bounded gameplay telemetry
- `requestExit()` for handing control back to the native shell

Implementation notes:
- the package ships browser-friendly ESM in `dist/`
- the SDK falls back to in-memory storage when `localStorage` is unavailable
- malformed persisted JSON is treated as empty state instead of crashing boot
