# Game Validator

Purpose: Validation tooling for reviewed game bundles, manifests, assets, and release-time policy checks.

Current scope:
- validates `manifest.json` or `game.manifest.json` against shared contracts
- enforces required bundle files and referenced asset existence
- checks bundle size budgets, prohibited content flags, and media dimensions
- blocks remote runtime URLs, banned browser APIs, and CSP-hostile HTML
- exposes a small CLI via `pnpm --filter @edugames/game-validator validate <path>`
