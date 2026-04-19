# Release Runbook

## Purpose

Ship an EduGames release without skipping safety, review, or validation checks.

This runbook is intentionally tooling-light. Use it until repo-level release automation is in place.

## Use When

- Promoting a planned MVP release
- Shipping a hotfix from `main`
- Preparing a release candidate for review or submission

## Preconditions

- Scope is merged to `main` through reviewed pull requests.
- The release matches `docs/implementation-decisions.md`.
- Validation follows `docs/testing-strategy.md`.
- A maintainer is available to own release decisions and rollback calls.
- The local machine or CI runner can execute the current validation commands listed below.

## Local Verification

Before a release candidate is approved, run the repo-level checks that match the changed surface:

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
pnpm test:sample-game
pnpm exec playwright install --with-deps chromium webkit
pnpm test:playwright
```

If the release touches `apps/ios-shell`, also verify on macOS with Xcode available:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell
xcodebuild -project EduGamesApp.xcodeproj -scheme EduGamesApp -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=26.4' test
```

## Steps

1. Confirm release scope and note the target commit, PRs, and any decision or policy changes.
2. Verify the required checks that exist for the changed surfaces are green. If automation is missing, run the matching manual validation and record the result.
3. Prepare short release notes covering user-facing changes, operational changes, and any known limitations.
4. Deploy in platform order:
   - static docs or site
   - backend and admin surfaces
   - iOS shell, if the release includes native changes
5. Run focused smoke checks:
   - site and docs load
   - admin access works
   - catalog excludes disabled games
   - an approved game launches
   - timer warning and expiry behavior still work
6. Record the release identifier, deployment links, approver, and any follow-up items in the release log used by the team.

## Stop Conditions

Stop the release and switch to `docs/runbooks/rollback.md` if any critical smoke check fails or if the deployed build violates a locked MVP policy.
