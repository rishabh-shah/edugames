# Set Sizes Shapes

Purpose: Packaged EduGames bundle for the GPL-licensed upstream HTML game `set-sizes-shapes.html` from [jkanev/educational-html-games](https://github.com/jkanev/educational-html-games).

## What it is

Set Sizes Shapes adapts Jacob Kanev's quick number-sense activity for the EduGames platform. Players estimate how many moving shapes appear on screen and tap the matching number button, building fast visual quantity recognition in short rounds.

## Packaging notes

- The original gameplay logic is preserved from the upstream single-file HTML game.
- The bundled `src/bootstrap.js` adds EduGames ready and exit signaling without changing the core gameplay rules.
- This package intentionally stays offline-first with only local runtime references.

## License

- Upstream game code: GPL-3.0-or-later, based on set-sizes-shapes.html by Jacob Kanev.
- Packaging assets and wrapper code: GPL-3.0-or-later for consistency with the distributed bundle.

## Local use

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/games/set-sizes-shapes
pnpm test
pnpm build
python3 -m http.server 4173
```
