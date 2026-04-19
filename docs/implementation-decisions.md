# EduGames MVP Implementation Decisions

This document resolves conflicts across the attached planning materials and defines the implementation shape I recommend we use for the first build.

## Source of truth order

Use the planning inputs in this order when they disagree:

1. `/Users/shrutishah/Downloads/edugames_platform_design_spec.md`
2. `/Users/shrutishah/Downloads/edugames_platform_backlog.yaml`
3. `/Users/shrutishah/Downloads/edugames_platform_cookbook.md`
4. `/Users/shrutishah/Downloads/edugames_codex_prompt_pack.md`

Reason:

- The design spec is the most complete product and architecture document.
- The backlog is the clearest execution sequence.
- The cookbook is a strong operational reference, but it includes some older assumptions.
- The prompt pack is useful for task slicing, not for final architecture arbitration.

## Locked MVP product defaults

- iPad-first shell app with a curated catalog, not an open marketplace.
- Reviewed HTML5 games only, running inside `WKWebView`.
- No ads, no chat, no user-generated content, no in-game login.
- No monetization in MVP.
- No cloud sync in MVP.
- Offline-first for already-downloaded games.
- English-only for MVP.
- Landscape-only games at launch.
- Build to child-directed and Kids Category constraints from day one, even if public App Store positioning is decided later.

## Repository strategy

Use this existing repo as the single public core monorepo for MVP.

Do not split into separate game repos, registry repos, or template repos yet. Those can come after the package contract and review flow have been proven inside one repo.

Recommended layout:

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
  infra/
    render/
  docker/
  scripts/
```

Naming choices:

- Use `apps/ios-shell`, not `apps/ipad-shell`.
- Use `apps/admin-web`, not `apps/admin`.
- Use `packages/contracts`, not `packages/schemas`.

Reason:

- `ios-shell` matches Apple platform tooling and leaves room for iPhone support later without a rename.
- `admin-web` is clearer than `admin`.
- `contracts` better reflects that the package should hold API schemas, manifest schemas, telemetry schemas, generated types, and OpenAPI output.

## Package manager and developer experience

Use `pnpm` workspaces for the monorepo.

This is an inference based on the repo being a real multi-app monorepo and on current `pnpm` positioning around workspace support and monorepo performance. The cookbook and prompt pack say `npm workspaces`, which is still viable, but I recommend `pnpm` as the better default for the long-lived platform repo.

Recommended DX choices:

- Node.js 24 LTS for repo tooling and backend runtime.
- `pnpm-workspace.yaml` at the repo root.
- Root `Makefile` with `make dev`, `make test`, `make lint`, and `make build`.
- `docker-compose.yml` for local Postgres and local object-storage emulation.
- No Turborepo in the first scaffold. Add it only if CI and local orchestration become painful.

## Public website and docs

Use Astro plus Starlight in `apps/site`.

Host the static site on GitHub Pages.

Reason:

- The public site is mostly content, docs, and contributor guidance.
- Astro and Starlight are well aligned with static docs publishing and GitHub Pages deployment.
- Keeping the public site separate from the admin portal avoids mixing static-doc hosting constraints with authenticated app behavior.

## Admin portal

Use Next.js in `apps/admin-web`.

Admin auth should be GitHub OAuth with an allowlist of approved maintainers.

Reason:

- The design spec already converges on Next.js for the internal admin surface.
- The admin app benefits from React ecosystem depth and easy authenticated dashboards.
- GitHub OAuth is a good fit for a maintainer-only internal tool tied to a GitHub-centered contributor workflow.

## Backend architecture

Use a TypeScript modular monolith.

Recommended stack:

- Fastify for HTTP.
- Zod for runtime validation.
- Prisma with Postgres.
- Pino-based structured logging.
- One API process in `services/api`.
- One worker process in `services/worker`.

Recommended domain modules:

- `installations`
- `profiles`
- `games`
- `catalog`
- `launch`
- `telemetry`
- `reports`
- `reviews`
- `admin-auth`
- `audit`
- `jobs`

## Jobs and async work

Do not add Redis or BullMQ in the initial MVP scaffold.

Use:

- a worker service,
- a small Postgres-backed jobs table if needed,
- and scheduled jobs via cron for rollups and cleanup.

Reason:

- Launch scale is small.
- The first async tasks are low-volume operational jobs.
- Dropping Redis removes a service from local development and production.

When to add a queue later:

- if review artifact generation becomes heavy,
- if telemetry ingestion becomes bursty,
- if asset processing or notification workloads appear,
- or if worker throughput and retry semantics become complex enough to justify Redis-backed queues.

## Storage and delivery

Use:

- Postgres for backend state.
- Cloudflare R2 for immutable game bundles and media assets.
- SHA-256 verification for every downloaded bundle in the iOS shell.
- Versioned immutable paths for published assets.

Recommended asset paths:

```text
/games/{slug}/{version}/bundle.zip
/games/{slug}/{version}/manifest.json
/games/{slug}/{version}/assets/...
```

## iOS shell architecture

Use:

- SwiftUI for shell UI.
- `WKWebView` for the game runtime.
- Keychain for installation secrets and refresh tokens.
- App sandbox file storage for downloaded bundles.
- A SQLite-backed local store for profiles, cache metadata, save state, telemetry outbox, and policy flags.

Recommended local persistence choice:

- GRDB over SwiftData.

This is an inference, not a direct requirement from the design spec. I recommend it because the shell needs predictable SQLite control, explicit migrations, local queue-like behavior, and stable offline state for a safety-sensitive app shell.

Recommended local modules:

- `AppShell`
- `Bootstrap`
- `Profiles`
- `Catalog`
- `Downloads`
- `Runtime`
- `Bridge`
- `SaveState`
- `Telemetry`
- `ParentZone`
- `ParentalGate`
- `Settings`
- `Support`

Why `ParentZone` is not top-level in the repo:

- It is a product area inside the native shell app, not a separate deployable app or service.
- The top-level repo structure only shows deployable apps and shared packages.
- The parent experience should live in `apps/ios-shell`, protected by the parental gate.

Recommended internal structure for `apps/ios-shell`:

```text
apps/ios-shell/
  EduGamesApp/
    App/
    Bootstrap/
    ChildExperience/
      Profiles/
      Catalog/
      GameDetail/
      Runtime/
    ParentZone/
      Entry/
      TimeLimits/
      ProfileManagement/
      Reports/
      Settings/
      Support/
    Shared/
      Bridge/
      Downloads/
      Persistence/
      Telemetry/
      DesignSystem/
```

Product distinction:

- `ParentalGate` is the mechanism for proving an adult is present.
- `ParentZone` is the protected area where adults manage the app.

Lock these `ParentZone` MVP responsibilities:

- set and change play-time limits,
- manage child profiles,
- review/download status,
- submit game reports,
- view support and safety information,
- access reset or clear-local-data actions.

## Game runtime rules

Lock these rules for MVP:

- Games run only inside `WKWebView`.
- Games communicate only through the platform bridge.
- No direct access to native APIs.
- No arbitrary remote network access.
- No external links from games.
- No ads.
- No login flows inside games.
- Corrupt or mismatched bundles fail closed.

Recommended bridge surface:

```ts
type EduGamesBridge = {
  getProfile(): Promise<{ id: string; ageBand: string; nickname: string }>
  loadState(): Promise<unknown | null>
  saveState(payload: unknown): Promise<void>
  trackEvent(name: string, payload?: Record<string, unknown>): Promise<void>
  requestExit(): Promise<void>
  openParentalGate(reason: string): Promise<boolean>
  getCapabilities(): Promise<string[]>
}
```

## Save state decision

Keep save state local-only in MVP.

This resolves a conflict between the cookbook and the more complete design spec. Because cloud sync is out of scope, there is no good MVP reason to store child save state on the backend.

Implications:

- No backend `save_states` table in MVP.
- No backend save-state API endpoints in MVP.
- Save state lives only in the device-local SQLite store.
- If cloud sync becomes a roadmap item later, add a separate sync design instead of pretending MVP already needs it.

## Parent controls and session timers

Parent controls are in MVP.

Lock these defaults:

- Timer options are fixed to `15`, `30`, `45`, or `60` minutes.
- Timer is configured in the parent zone.
- Timer is tracked per child profile, but the allowed option set is global.
- Timer applies to active gameplay time only, not browsing the parent zone.
- Timer pauses when the app is backgrounded or the child exits the running game.
- When time expires, the shell exits the game and returns to the locked child home state.
- Extending time requires a parental gate.

Recommended extension behavior:

- On expiry, show a child-safe "time is up" screen.
- Allow only two actions: `Done for now` or `Ask a parent`.
- If a parent passes the gate, they can add another `15`, `30`, `45`, or `60` minutes.

Recommended warning behavior:

- Friendly warning at 5 minutes remaining.
- Clear countdown warning at 1 minute remaining.

## Parental gate design

Treat the extension flow as a real parental gate, not as a light speed bump.

Apple's current Kids guidance describes parental gates as adult-level tasks. Because the target audience is primarily under 10, a gate that many 10-year-olds can solve is directionally helpful, but I do not recommend designing it around "10+ can solve" as the actual product rule.

Use this MVP gate shape instead:

- A short text instruction that requires reading comprehension.
- A randomly generated multi-step arithmetic or ordering challenge.
- Large controls and clear accessibility support.
- Optional spoken prompt telling younger children to ask a parent for help.

Avoid:

- a static code,
- a reusable answer pattern,
- a single-digit math question,
- or anything that an older sibling can memorize after a few uses.

Future option:

- Add a local parent PIN after MVP if families want a faster extension flow.

## API shape

Use the design-spec endpoint model as the base:

- `POST /v1/installations/register`
- `POST /v1/installations/refresh`
- `POST /v1/profiles`
- `GET /v1/profiles`
- `DELETE /v1/profiles/{profileId}`
- `GET /v1/catalog`
- `GET /v1/games/{slug}`
- `POST /v1/launch-sessions`
- `POST /v1/telemetry/batches`
- `POST /v1/reports`
- admin review and catalog endpoints
- `GET /healthz`
- `GET /readyz`

Do not carry forward the older save-state endpoints into the initial API scaffold.

## Shared contracts

Put the following in `packages/contracts`:

- Zod request and response schemas.
- Generated TypeScript types.
- Game manifest schema.
- Telemetry event schema.
- OpenAPI generation.
- Shared enums for age bands, review states, rollout states, and policy flags.

Keep this package free of app-specific UI code.

## Contributor workflow

Use one in-repo sample game first:

- `games/shape-match`

Contributor contract:

- Each game owns its manifest, assets, and build output definition.
- Each game depends only on `packages/game-sdk`.
- Each game must pass the validator and runtime harness before merge.

The future external-repo model should wait until the single-repo contribution path is smooth.

## CI and delivery

Use GitHub Actions as the control plane.

Required workflows:

- repo CI on every PR,
- site deploy to GitHub Pages,
- backend deploy hooks or Render integration,
- iOS validation workflow,
- optional nightly smoke tests once the stack exists.

Required PR checks:

- lint
- typecheck
- unit tests
- build
- manifest validation
- game validator
- runtime harness
- bundle size budget
- license scan

## Security and privacy defaults

Lock these defaults for MVP:

- No third-party analytics in child-facing flows.
- Minimal first-party telemetry only.
- No child PII collection.
- Anonymous installation plus pseudonymous local child profiles.
- Kill switch for global game disable and version disable before public launch.
- Immutable published bundles.
- Audit logs for admin actions.

App Attest decision:

- Do not make App Attest part of the first implementation slice.
- Design the installation auth flow so App Attest can be added later without breaking public contracts.

## Environment blockers noticed locally

Current local machine status in this workspace:

- `node` is installed and reports `v24.14.0`.
- `npm` is not currently available on `PATH`.
- `pnpm` is not currently available on `PATH`.
- `xcodebuild` is not currently available because the active developer directory points to Command Line Tools, not a full Xcode install.

Implication:

- We can align on architecture and scaffold non-iOS files now.
- Full iOS execution should wait until Xcode is installed and selected.
- Repo bootstrap should include an explicit local setup section for package manager installation.

## What I will treat as agreed unless overridden

- Single public monorepo for MVP.
- `pnpm` workspaces.
- Astro and Starlight for the public site.
- Next.js for admin.
- Fastify, Zod, Prisma, and Postgres for the backend.
- No Redis in initial MVP.
- Save state local-only in MVP.
- SwiftUI plus `WKWebView` shell with a SQLite-backed local store.

If these stand, the next execution step is to scaffold the monorepo and lock the main ADRs before any business logic is added.
