# Shape Match Garden

Purpose: Sample reviewed HTML5 game workspace used to validate the EduGames shell, SDK, and release flow.

## What it is

`Shape Match Garden` is a static, landscape-oriented kid game for ages 4-6. The player taps a colorful tray shape and then taps the matching outline in the garden board above it. The game runs with plain HTML, CSS, and browser modules, and uses the shared EduGames runtime API through a vendored local module so the shipped bundle stays self-contained.

## Files

- `manifest.json` defines the game contract consumed by the platform.
- `LICENSES.json` records the sample package licensing inventory for validator checks.
- `index.html` and `styles.css` provide the local static shell.
- `src/game-logic.js` contains the pure matching rules and save-state snapshot helpers.
- `src/main.js` wires the canvas runtime to the bundled local EduGames SDK copy.
- `src/vendor/edugames-sdk.js` keeps the runtime self-contained for offline execution.
- `assets/screenshots/` contains lightweight screenshot placeholders referenced by the manifest.
- `tests/` covers unit logic, runtime wiring, and package contract checks.

## Local use

Open [index.html](/Users/shrutishah/Desktop/Codebase/edugames/games/shape-match/index.html) directly in a browser, or serve the folder locally for stricter module loading:

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/games/shape-match
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Controls

- Click or tap a tray shape to select it.
- Click or tap the matching outline to place it.
- Use `Start` to begin, `Restart` to replay, and `Exit` to hand back control to the shell.
- Press `F` to toggle fullscreen.

## Test commands

```sh
pnpm --filter @edugames/shape-match test
pnpm --filter @edugames/shape-match typecheck
pnpm --filter @edugames/shape-match lint
pnpm --filter @edugames/shape-match build
```
