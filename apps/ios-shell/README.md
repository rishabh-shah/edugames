# iOS Shell

Purpose: Native iPad-first shell app that downloads reviewed EduGames bundles, presents the catalog, and launches approved games inside `WKWebView`.

Intended module layout:
- `AppShell` for app entry, navigation, and global app state.
- `Bootstrap` for first-run setup, configuration fetch, and local migrations.
- `Profiles` for child profile selection and switching.
- `Catalog` for browsable game metadata and availability state.
- `Downloads` for bundle download, integrity verification, and storage management.
- `Runtime` for `WKWebView` lifecycle and shell-to-game handoff.
- `Bridge` for validated messages between native code and embedded games.
- `SaveState` for local game progress and recoverable runtime state.
- `Telemetry` for queued analytics and operational events.
- `ParentZone`, `ParentalGate`, `Settings`, and `Support` for parent-controlled surfaces.

Testing plan:
- `Swift Testing` for pure Swift domain logic such as bundle verification, timers, and bridge payload validation.
- `XCTest` and `XCUITest` for app launch, profile selection, offline behavior, and runtime handoff coverage.
- Simulator screenshots captured from UI tests for visual review in CI.
- No Xcode project is created in this scaffold because local Apple tooling is not installed yet.
