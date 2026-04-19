## Summary

- What changed?
- Why does it matter?

## Test Plan

- [ ] Unit tests added or updated
- [ ] Integration tests added or updated
- [ ] E2E or UI tests added or updated when user-facing behavior changed
- [ ] Visual artifacts reviewed when UI changed

## Validation

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:sample-game` when game assets or runtime wiring changed
- [ ] `pnpm exec playwright install --with-deps chromium webkit` if browsers are not already installed
- [ ] `pnpm test:playwright` when browser-side sample-game behavior changed
- [ ] `xcodebuild` on macOS when iOS shell changes landed

## Notes

- Risks, follow-ups, or manual checks
