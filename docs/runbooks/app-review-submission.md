# App Review Submission Runbook

## Purpose

Prepare and submit the iOS shell for Apple review without missing kids-category and policy requirements.

## Use When

- Submitting the first MVP build
- Resubmitting after a rejection
- Sending a release build for external review

## Preconditions

- The build matches `docs/implementation-decisions.md`.
- Child-directed constraints are still true: no ads, no chat, no open marketplace, no in-game login, and reviewed HTML5 content only.
- Parent Zone and parental gate behavior are working in the release candidate.
- The latest macOS CI run for `apps/ios-shell` passed and uploaded a readable `.xcresult` bundle.
- The checked-in iOS project can still be built with `xcodebuild` on a machine that has Xcode installed.

## Local / CI Verification

Before submission, confirm the current validation set is green:

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

If the submission includes native shell changes, rerun the iOS build/tests on macOS:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell
xcodebuild -project EduGamesApp.xcodeproj -scheme EduGamesApp -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=26.4' test
```

## Submission Checklist

1. Confirm the binary build, version number, and release notes are final.
2. Verify metadata, screenshots, age rating, privacy details, and support links are current.
3. Verify the reviewed game catalog in the build is the intended one for submission.
4. Re-test the flows most likely to trigger review feedback:
   - first launch
   - profile selection
   - game launch
   - parental gate
   - time-limit expiry and extension
   - disabled-game behavior
5. Confirm there are no child-facing ads, external links, account creation prompts, or unsupported network behavior.
6. Submit through App Store Connect and record the submission identifier and notes sent to the reviewer.
7. Monitor review status and capture any rejection or metadata feedback in the release log.

## Notes

- If review reveals a game-specific issue, prefer disablement or a catalog correction when possible before preparing a full binary rollback.
