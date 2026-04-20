# EduGames Platform

EduGames is an iPad-first platform for curated educational mini-games for kids.
The shell is native SwiftUI, approved games run as reviewed HTML5 bundles inside
`WKWebView`, and this repo contains the shell, API, sample game, shared
contracts, and validation tooling in one monorepo.

## What Works Today

- A local Fastify API with installation, profile, catalog, launch, report, and telemetry flows.
- An iOS shell that can create child profiles, browse the catalog, launch the built-in Shape Match game, and enforce parent controls.
- A sample game in `/Users/shrutishah/Desktop/Codebase/edugames/games/shape-match`.
- Four additional packaged GPL-licensed math games from `jkanev/educational-html-games`:
  `set-sizes-shapes`, `triple-number-memory`, `game-of-sums`, and `game-of-differences`.
- Contract validation for game manifests and bundle structure.
- Browser E2E coverage for the sample game and XCUITest coverage for the iOS shell.

`set-sizes-animals` is intentionally not packaged here because that specific
upstream file carries more restrictive licensing terms than the rest of the
`jkanev` games.

## Repository Layout

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
  scripts/
```

## Prerequisites

- Node.js 24.x
- `pnpm` 10.x
- Xcode 26+ with an iPad simulator installed
- `xcodegen`
  - Install with `brew install xcodegen`

The repo is pinned to Node 24 via `/Users/shrutishah/Desktop/Codebase/edugames/.node-version`.

## Initial Setup

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm install
```

Useful workspace commands:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

## 1. Play The Built-In Shape Match Game Locally

There are two useful local loops:

- Browser-only: fastest way to work on the sample game itself
- Full platform: run the local API and launch the game through the iOS shell

### Browser-Only Loop For Shape Match

Use this when you only want to work on the sample game bundle.

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/shape-match test
pnpm --filter @edugames/shape-match build
python3 -m http.server 4173 --directory /Users/shrutishah/Desktop/Codebase/edugames/games/shape-match
```

Then open [http://127.0.0.1:4173](http://127.0.0.1:4173).

You can also run the browser E2E suite:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm exec playwright install
pnpm test:playwright
```

### Full Local Platform Loop

This path lets you create a child profile in the iOS shell and launch the game
 through the platform.

#### Step 1: Build The Shared Contracts

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/contracts build
```

#### Step 2: Build The Sample Game Bundle

The local API and iOS shell expect the sample game bundle to exist under
`games/shape-match/dist`.

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/shape-match build
```

#### Step 3: Start The Local API

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/api dev
```

The API listens on `http://127.0.0.1:3000` by default.
Keep this process running in its own terminal while you work in Xcode.

#### Step 4: Generate Or Refresh The Xcode Project

Run this if the Xcode project ever gets out of sync with
`/Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/project.yml`.

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell
xcodegen generate
```

#### Step 5: Open The iOS Shell

Open:

- `/Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/EduGamesApp.xcodeproj`

Select:

- Scheme: `EduGamesApp`
- A booted iPad simulator

Optional environment variables for the app target:

- `EDUGAMES_API_BASE_URL=http://127.0.0.1:3000`
  - Only needed if you are not using the default local API port
- `EDUGAMES_RESET_LOCAL_DATA=1`
  - Clears the local install/profile DB on launch
- `EDUGAMES_USE_FIXTURES=1`
  - Uses fixture API responses instead of the live local API

For the normal full-platform flow, leave `EDUGAMES_USE_FIXTURES` unset so the
shell talks to the local API.

#### Step 6: Play The Game

In the running app:

1. Tap `Create Child Profile`
2. Enter first name, last name, age, and gender
3. Select the created profile
4. Open `Shape Match`
5. Tap `Play`

### Local iOS Test Commands

Use a simulator destination that exists on your machine. For example:

```sh
xcrun simctl list devices available
```

Then substitute either a simulator name or your own simulator id in the commands
below.

Unit and integration-style native tests:

```sh
xcodebuild test \
  -project /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/EduGamesApp.xcodeproj \
  -scheme EduGamesApp \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5)' \
  -only-testing:EduGamesAppTests \
  -parallel-testing-enabled NO
```

Full simulator-backed shell E2E:

```sh
xcodebuild test \
  -project /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/EduGamesApp.xcodeproj \
  -scheme EduGamesApp \
  -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5)' \
  -only-testing:EduGamesAppUITests \
  -parallel-testing-enabled NO
```

## 2. Build A New Game

Today the fastest path is to clone the sample game structure and adapt it.

### Recommended Starting Point

Copy `/Users/shrutishah/Desktop/Codebase/edugames/games/shape-match` into a new
workspace under `/Users/shrutishah/Desktop/Codebase/edugames/games/<your-game>`.

Before you run anything, rename the copied project so it has its own identity:

- update `package.json` from `@edugames/shape-match` to `@edugames/<your-game>`
- update `manifest.json` so `gameId` and `slug` are unique
- update the human-facing `title`, `summary`, and `description`
- rename any copied screenshots, icons, and test fixtures that still reference Shape Match

If you skip this step, `pnpm --filter @edugames/<your-game> ...` will not match
the copied package and the local catalog will be ambiguous.

At minimum, your new game should include:

- `manifest.json`
- `README.md`
- `LICENSES.json`
- `index.html`
- your runtime code under `src/`
- referenced assets under `assets/`
- a local `package.json` with `build`, `test`, `lint`, and `typecheck` scripts

### Game Manifest Requirements

The validator currently checks for a manifest named either:

- `manifest.json`
- `game.manifest.json`

The sample manifest in
`/Users/shrutishah/Desktop/Codebase/edugames/games/shape-match/manifest.json`
is the best reference.

Important fields include:

- `gameId`
- `slug`
- `title`
- `summary`
- `description`
- `version`
- `runtime`
- `entrypoint`
- `orientation`
- `defaultLocale`
- `supportedLocales`
- `minAgeBand`
- `maxAgeBand`
- `categories`
- `offlineReady`
- `compressedSizeBytes`
- `sha256`
- `iconPath`
- `screenshotPaths`
- `contentFlags`
- `telemetry.allowedEvents`
- `capabilities`
- `assetLicenseDeclaration`

### Runtime Integration Expectations

Games should integrate with `@edugames/game-sdk` and support the shell bridge.

The current SDK surface supports:

- `ready(metadata)`
- `loadState()`
- `saveState(state)`
- `emitEvent(name, value)`
- `requestExit()`

The sample game vendors the SDK into its bundle so the shipped output stays
self-contained for offline execution.

### Validation Rules To Keep In Mind

`@edugames/game-validator` currently enforces:

- a valid manifest
- required root files: `README.md` and `LICENSES.json`
- local-only asset references
- no banned browser APIs such as `document.cookie`, `window.open`, `WebSocket`, or `getUserMedia`
- no remote runtime URLs
- icon and screenshot size checks
- bundle size limits

Validate your game with:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/game-validator validate ../../games/<your-game>
```

### Suggested Development Loop For A New Game

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/<your-game> test
pnpm --filter @edugames/<your-game> typecheck
pnpm --filter @edugames/<your-game> lint
pnpm --filter @edugames/<your-game> build
pnpm --filter @edugames/game-validator validate ../../games/<your-game>
```

If your game is browser-runnable, add a Playwright or Vitest integration path
similar to `games/shape-match/tests/`.

### Make A New Game Show Up In The Local Platform

This part is currently manual, and the local path is not fully generalized for
arbitrary bundles yet.

To expose a new game through the local API catalog, add it to the in-memory
published game list in:

- `/Users/shrutishah/Desktop/Codebase/edugames/services/api/src/repositories/in-memory-platform-repository.ts`

You will usually need to:

1. add a new `PublishedGameRecord` entry in `defaultPublishedGames()`
2. point its `bundleUrl`, `entrypoint`, age band, categories, and allowed events at your bundle
3. restart the local API

Important caveat: the iOS shell currently does not download arbitrary remote
bundle URLs for local development. The built-in Shape Match path works because
the shell falls back to a vendored `shape-match-fixture.zip` resource when the
API returns the sample CDN-style URL.

That means adding a `PublishedGameRecord` alone is not enough to make a brand
new game launch locally through the shell. For a new game, you currently need
both:

1. a catalog entry in the local API
2. matching fixture-side wiring in the iOS shell so the bundle can actually be installed

If you only want to iterate on the game runtime itself, use the browser loop
first. If you want your new game to launch through the native shell, plan on
adding the equivalent fixture resource and lookup path on the iOS side in
addition to the API record.

## Engineer Checklist

When changing the built-in Shape Match or adding a new game, this is the safest
short checklist:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames
pnpm --filter @edugames/contracts build
pnpm --filter @edugames/api test
pnpm --filter @edugames/shape-match test
pnpm --filter @edugames/shape-match build
pnpm --filter @edugames/game-validator validate ../../games/shape-match
pnpm test:playwright
```

Then run the iOS shell XCUITests if your change touches the native app flow.

## Related Docs

- [iOS shell README](/Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/README.md)
- [Shape Match README](/Users/shrutishah/Desktop/Codebase/edugames/games/shape-match/README.md)
- [API README](/Users/shrutishah/Desktop/Codebase/edugames/services/api/README.md)
- [Implementation decisions](/Users/shrutishah/Desktop/Codebase/edugames/docs/implementation-decisions.md)
- [Testing strategy](/Users/shrutishah/Desktop/Codebase/edugames/docs/testing-strategy.md)

## License

See `/Users/shrutishah/Desktop/Codebase/edugames/LICENSE`.
