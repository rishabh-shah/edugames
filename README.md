# EduGames Platform

EduGames is an iPad-first platform for curated educational mini-games for kids.
The platform shell is native, contributed games run as reviewed HTML5 bundles
inside a controlled WebKit runtime, and the repository is organized as a
single monorepo for the MVP.

## Principles

- Native shell, HTML5 games.
- Child-directed privacy and safety posture.
- Offline-first for already-downloaded games.
- Codex-authored pull requests with human review.
- Test-driven development with unit, integration, and end-to-end coverage.

## Repository layout

```text
/
  apps/
    ios-shell/
    admin-web/
    site/
  services/
    api/
    worker/
  packages/
    contracts/
    game-sdk/
    game-validator/
    shared-config/
  games/
    shape-match/
  docs/
    adr/
    runbooks/
  docker/
  infra/
    render/
  scripts/
```

## Tooling

- Package manager: `pnpm`
- JavaScript runtime: Node.js 24 LTS
- JS/TS tests: `Vitest`
- Browser E2E and visual validation: `Playwright`
- Native unit tests: `Swift Testing`
- Native UI tests: `XCTest` and `XCUITest`

## Current bootstrap status

This repository is being scaffolded in phases.

- Root workspace and CI/test conventions are present.
- Package and app placeholders are intentionally lightweight.
- `apps/ios-shell` remains docs-only until full Xcode is installed and selected.
- Root Vitest workspace configuration lives in `vitest.workspace.ts`.

## Useful commands

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Key docs

- [Implementation decisions](docs/implementation-decisions.md)
- [Testing strategy](docs/testing-strategy.md)

## License

See [LICENSE](LICENSE).
