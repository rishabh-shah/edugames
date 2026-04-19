# iOS Shell

Purpose: Native iPad-first shell app that downloads reviewed EduGames bundles, presents the catalog, and launches approved games inside `WKWebView`.

Current Phase 6 scope:
- reproducible Xcode project generation with XcodeGen
- SwiftUI shell entry and bootstrap flow
- local session + profile persistence foundations
- profile picker
- catalog render against fixture or live API data
- Swift Testing unit coverage and XCUITest shell coverage

Key commands:
- `cd /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell && /opt/homebrew/bin/xcodegen generate`
- `xcodebuild -project /Users/shrutishah/Desktop/Codebase/edugames/apps/ios-shell/EduGamesApp.xcodeproj -scheme EduGamesApp -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5),OS=26.4' test`
