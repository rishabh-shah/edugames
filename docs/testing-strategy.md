# EduGames MVP Testing and PR Strategy

This document defines how we will build, validate, and merge changes for the EduGames platform.

The goal is not only "tests exist." The goal is:

- Codex can open pull requests safely.
- CI can reject regressions automatically.
- visual changes are inspectable from CI artifacts,
- and the repo stays friendly to TDD from day one.

## Delivery model

All production changes land through pull requests.

Target operating model:

- `main` is protected and always releasable.
- No direct pushes to `main`.
- New development and fixes are proposed through Codex-authored PRs.
- Humans review, approve, and merge.

Important honesty note:

GitHub can enforce "all changes must go through PRs," but it cannot perfectly prove "this PR was authored by Codex" unless you restrict write access to a dedicated Codex service identity and make that identity the only actor allowed to open implementation branches.

So the recommended enforcement model is:

1. Protect `main`.
2. Require pull requests before merge.
3. Require required checks to pass.
4. Give implementation write access only to the Codex service identity and a small maintainer group.
5. Give humans review and merge authority, not routine feature-branch authoring authority.

## Branch protection and PR rules

Configure GitHub rulesets so `main` requires:

- pull request before merging,
- required status checks,
- dismiss stale approvals on new commits,
- at least one approval from a human maintainer,
- CODEOWNERS review for protected areas,
- branches up to date before merge or merge queue,
- no force pushes,
- no direct deletion bypass.

Recommended merge policy:

- squash merge only for most PRs,
- auto-merge allowed only after all required checks pass,
- merge queue enabled once PR volume grows.

## TDD policy

We will use test-driven development as the default implementation workflow.

Rules:

- Every feature change gets unit tests and integration tests.
- Every bug fix starts with a failing reproduction test before the fix is added.
- Every user-critical flow also gets an end-to-end or UI-level test.
- Visual changes to web surfaces get screenshot-based validation.
- High-risk native-shell flows get simulator UI tests plus screenshot artifacts.

Red-green-refactor expectations:

1. Add or update the test that proves the desired behavior.
2. Watch it fail for the correct reason.
3. Implement the smallest change that makes it pass.
4. Refactor while keeping all tests green.

No-merge rule:

- If the change introduces behavior and does not add or update the matching tests, the PR is incomplete.

## Framework decisions

### JavaScript and TypeScript

Use `Vitest` as the default test runner for:

- `services/api`
- `services/worker`
- `packages/contracts`
- `packages/game-sdk`
- `packages/game-validator`
- `apps/admin-web`
- `apps/site` where applicable
- `games/*` logic-level tests

Reason:

- One runner across backend, packages, web, and game code keeps the monorepo simple.
- `Vitest` supports fast unit testing, mocking, coverage, and browser mode.

### React component tests

Use `React Testing Library` with `Vitest` for:

- `apps/admin-web`
- any interactive React surfaces in `apps/site`

Testing style:

- query by role, label, and visible text first,
- avoid implementation-detail assertions,
- reserve `data-testid` for escape hatches only.

### Backend integration tests

Use `Vitest` with `Testcontainers for Node.js`.

Initial real dependencies:

- PostgreSQL container
- S3-compatible object storage test container

Reason:

- integration tests should hit real infrastructure boundaries instead of mocked databases,
- and `Testcontainers` gives isolated, disposable test environments in CI.

### Browser end-to-end and visual tests

Use `Playwright`.

Use cases:

- admin flows,
- site smoke tests,
- sample game/runtime harness tests,
- visual regression for app-facing web surfaces,
- trace capture for failed CI runs.

Browser matrix:

- `webkit` is required because contributed games ultimately run in an Apple WebKit-based environment,
- `chromium` is also required for broader regression coverage,
- `firefox` is optional and can be added later.

### iOS unit and module tests

Use `Swift Testing` for new native unit tests.

Use it for:

- pure Swift domain logic,
- timer calculations,
- parental gate state handling,
- bundle verification logic,
- bridge payload validation,
- local persistence adapters where practical.

### iOS UI and integration tests

Use `XCTest` and `XCUITest`.

Use it for:

- app launch/bootstrap,
- profile selection,
- Parent Zone flows,
- timer-expiry behavior,
- parental-gate extension flow,
- offline launch behavior,
- disabled-game behavior,
- shell navigation and runtime handoff.

Keep `XCTest` for UI tests and performance measurements even though new unit tests should prefer `Swift Testing`.

## Visual QC strategy

Visual validation is part of the PR process.

### Web surfaces

For `apps/admin-web`, `apps/site`, and the browser-side runtime harness:

- use Playwright screenshot assertions for stable screens,
- capture HTML reports,
- retain traces on failure,
- upload screenshots and traces as GitHub Actions artifacts.

Stable visual targets in MVP:

- site home,
- developer docs landing,
- admin review queue,
- admin game detail,
- sample game launch screen,
- sample game active play state,
- sample game time-expired state.

### iOS shell

For `apps/ios-shell`:

- run XCUITests in simulator,
- capture screenshots at key checkpoints,
- upload the `.xcresult` bundle and extracted screenshots as workflow artifacts.

Important constraint:

- We will not start with brittle pixel-perfect native snapshot tests.
- For MVP, the primary native visual signal is deterministic simulator UI tests plus screenshot artifacts.
- If the shell stabilizes and we want stricter native visual diffing later, we can add a dedicated snapshot layer then.

## Sandbox validation strategy

Codex should be able to validate changes in isolated environments before merge.

Use two levels of sandboxing:

### Level 1: CI-local ephemeral sandbox

Run on every PR:

- JS/TS unit tests
- backend integration tests with containers
- browser E2E against locally started app services
- runtime harness tests for sample games

This is the default automated gate.

### Level 2: PR preview sandbox

Use Render preview environments for high-fidelity PR validation of:

- `services/api`
- `services/worker` where relevant
- `apps/admin-web`

Use cases:

- manual stakeholder review,
- higher-fidelity Playwright smoke runs against preview URLs,
- checking real deployment wiring before merge.

Because preview environments have real cost, they should be:

- automatic for app-facing or infra-changing PRs,
- optional for pure docs or low-risk internal package changes.

### iOS sandbox posture

There is no equivalent lightweight hosted preview for the native app shell.

For MVP, native validation uses:

- simulator-based UI tests in CI,
- mocked or seeded backend state,
- and artifact capture for screenshots and test results.

Later, beta distribution can add:

- TestFlight builds,
- and optionally Xcode Cloud for wider native test coverage and distribution workflows.

## CI control plane

Use GitHub Actions as the primary CI system because:

- PR checks and required status gates live in GitHub,
- Codex can reason about PR checks and artifacts more directly,
- GitHub-hosted runners are available for Linux and macOS workflows,
- and artifacts are easy to attach to PRs for review.

Use Xcode Cloud later as an optional supplement for:

- broader Apple-device coverage,
- TestFlight distribution,
- release-oriented workflows.

Do not make Xcode Cloud the only required gate in MVP.

## Required CI workflows

### 1. `ci-node`

Runs on Linux for changed JS/TS workspaces.

Responsibilities:

- install dependencies,
- lint,
- typecheck,
- run unit tests,
- run package-level integration tests,
- collect coverage,
- upload test reports.

### 2. `ci-api-integration`

Runs on Linux.

Responsibilities:

- start disposable Postgres and S3-compatible dependencies,
- apply migrations,
- run API and worker integration tests,
- verify contract compatibility.

### 3. `ci-playwright`

Runs on Linux.

Responsibilities:

- boot the local app stack,
- run admin/site/runtime-harness E2E tests,
- run visual assertions,
- upload HTML report, screenshots, and traces.

### 4. `ci-ios`

Runs on macOS.

Responsibilities:

- build the native shell,
- run `Swift Testing` unit suites,
- run `XCTest` and `XCUITest`,
- collect code coverage,
- upload `.xcresult` and screenshots.

### 5. `ci-games`

Runs on Linux.

Responsibilities:

- validate manifests,
- build sample games,
- run validator,
- run runtime harness,
- enforce bundle budgets,
- run license and external-URL scans.

### 6. `preview-validate`

Runs when a preview environment is created or updated.

Responsibilities:

- target the preview URL,
- run Playwright smoke flows,
- attach report links to the PR.

## Required status checks on every implementation PR

At minimum, require:

- `lint`
- `typecheck`
- `unit-tests`
- `integration-tests`
- `playwright-e2e`
- `ios-unit-ui-tests` when iOS code changes
- `game-validator` when game-related code changes
- `coverage-threshold`

Also require artifact publication for failing runs:

- Playwright traces
- Playwright HTML report
- screenshots for visual failures
- `.xcresult` bundle for iOS failures

## Coverage policy

Coverage is a floor, not the goal, but we still enforce it.

Initial thresholds:

- JS/TS overall: `90%` lines, `90%` functions, `85%` branches
- critical JS/TS modules: `90%` branches minimum
- Swift pure-domain modules: `85%` line coverage minimum

Critical modules include:

- installation auth,
- launch policy,
- timer enforcement,
- parental gate,
- bundle verification,
- disablement and kill-switch logic,
- review and approval policy,
- telemetry schema validation.

Even if a module meets numeric coverage, a PR can still be rejected for weak scenario coverage.

## MVP test inventory by area

### `packages/contracts`

Unit tests:

- age-band enum validation,
- telemetry event schema parsing,
- manifest schema parsing,
- endpoint request and response schema parsing,
- OpenAPI generation smoke test.

Integration tests:

- generated types and schemas are consumable from API and admin packages,
- breaking contract changes are detected by snapshot or spec diff checks.

### `services/api`

Unit tests:

- installation token creation and refresh rules,
- profile filtering and age-band policy,
- catalog eligibility logic,
- launch-session expiry and payload generation,
- admin authorization guards,
- disablement policy checks,
- telemetry validation and rejection cases,
- report deduping or classification helpers.

Integration tests:

- `POST /v1/installations/register`
- `POST /v1/installations/refresh`
- `POST /v1/profiles`
- `GET /v1/profiles`
- `DELETE /v1/profiles/{id}`
- `GET /v1/catalog`
- `GET /v1/games/{slug}`
- `POST /v1/launch-sessions`
- `POST /v1/telemetry/batches`
- `POST /v1/reports`
- admin approve, reject, disable flows
- audit-log write behavior
- disabled-game exclusion from catalog and launch

### `services/worker`

Unit tests:

- daily telemetry rollup aggregation,
- stale launch-session cleanup logic,
- catalog rebuild logic,
- retry and dead-letter decisions if implemented.

Integration tests:

- rollup job writes expected DB records,
- cleanup job removes expired data only,
- rebuild job updates catalog visibility correctly.

### `apps/admin-web`

Unit tests:

- review queue table behavior,
- filters and sorting,
- action-state handling,
- auth-state guards,
- form validation.

Integration tests:

- review queue page with mocked contract-valid responses,
- game detail approval flow,
- disable flow,
- reports list filtering,
- audit-log page rendering.

E2E tests:

- maintainer login,
- open review queue,
- approve awaiting game,
- disable live game,
- inspect report.

Visual tests:

- review queue baseline,
- game detail baseline,
- report detail baseline.

### `apps/site`

Unit tests:

- link-generation helpers,
- content navigation helpers if custom code exists.

Integration tests:

- static build succeeds,
- core pages render,
- no broken internal links on critical docs pages.

E2E and visual:

- home page loads,
- developers page loads,
- safety page loads,
- docs navigation works,
- visual baselines for key pages.

### `packages/game-sdk`

Unit tests:

- bridge method request formatting,
- response parsing,
- error fallback when shell bridge is unavailable,
- event validation,
- unsupported capability handling.

Integration tests:

- browser-side test page can communicate with a mocked bridge host,
- sample game can import and use the SDK successfully.

### `packages/game-validator`

Unit tests:

- manifest-required-field checks,
- semver checks,
- entrypoint checks,
- asset existence checks,
- license declaration checks,
- age-band validity,
- external-URL and forbidden-API detection,
- size-budget logic.

Integration tests:

- valid fixture passes,
- invalid fixtures fail for the expected reason,
- JSON output is stable for CI consumers.

### `games/shape-match`

Unit tests:

- scoring logic,
- win condition,
- pause and resume state,
- serialization of save payload,
- timer or level progression logic if present.

Integration tests:

- game boots with the SDK,
- save/load round-trip works,
- event tracking fires valid payloads,
- no forbidden external requests are attempted.

E2E and visual:

- launch in WebKit browser project,
- complete one happy path,
- verify time-expired overlay from shell harness,
- baseline screenshots for title, gameplay, and completion states.

### `apps/ios-shell`

Unit tests with `Swift Testing`:

- timer duration calculations,
- timer pause and resume rules,
- timer expiry behavior,
- parental gate challenge generation and validation state,
- profile model validation,
- local persistence repositories,
- bundle checksum verification,
- bridge message encoding and decoding,
- offline catalog fallback decisions,
- kill-switch enforcement logic.

Integration tests:

- repository layer against local persistence,
- API client decoding against fixture payloads from shared contracts,
- bundle install flow using fixture archives,
- save-state local round trip,
- telemetry outbox enqueue and flush logic.

UI tests with `XCUITest`:

- first launch and installation bootstrap,
- create and switch child profiles,
- enter Parent Zone through parental gate,
- set a `15`, `30`, `45`, and `60` minute limit,
- launch a game,
- receive 5-minute and 1-minute warnings,
- time expires and returns to child home,
- parent extends time after passing gate,
- disabled game becomes unavailable after refresh,
- previously downloaded game launches offline.

Visual checkpoints:

- profile picker,
- child catalog,
- Parent Zone timer settings,
- parental gate screen,
- time-expired screen,
- disabled-game screen.

## Test data and determinism rules

To keep CI trustworthy:

- freeze clocks in timer-sensitive tests,
- use seeded fixture data,
- avoid random identifiers unless seeded,
- avoid real network calls in unit tests,
- use disposable isolated dependencies in integration tests,
- use stable fonts, viewport sizes, and animation-reduction settings in visual tests.

For visual tests:

- disable nonessential animations,
- pin browser viewport sizes,
- seed data consistently,
- prefer explicit loading-idle waits over arbitrary sleeps.

## What Codex should do on every PR

For every implementation PR, Codex should:

1. add or update unit tests first,
2. add or update integration tests,
3. add or update E2E or UI tests for user-critical behavior,
4. run the relevant test suites locally when possible,
5. include a short test plan in the PR body,
6. attach or point to visual artifacts for UI-impacting changes,
7. never mark a PR ready if required tests are knowingly missing.

## What we are intentionally not doing in MVP

- no separate flaky end-to-end framework alongside Playwright,
- no pixel-perfect native snapshot suite on day one,
- no dependence on a long-lived shared staging environment for basic PR validation,
- no manual-only QA as the primary release gate.

## Recommended first implementation slice

When we start execution, we should scaffold the repo so these test boundaries exist immediately:

- root testing conventions and scripts,
- `Vitest` base config,
- `Playwright` base config,
- `Swift Testing` and `XCTest` targets in the iOS shell,
- GitHub Actions workflows and artifact upload conventions,
- baseline path filters so iOS jobs only run when native code changes.
