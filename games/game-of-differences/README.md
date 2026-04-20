# Game of Differences

Purpose: Packaged EduGames bundle for the GPL-licensed upstream HTML game `game-of-differences.html` from [jkanev/educational-html-games](https://github.com/jkanev/educational-html-games).

## What it is

Game of Differences adapts Jacob Kanev's subtraction card game for the EduGames platform. In solo play, children find two numbers whose difference equals the target value, reinforcing subtraction facts and flexible mental math.

## Packaging notes

- The original gameplay logic is preserved from the upstream single-file HTML game.
- The bundled `src/bootstrap.js` adds EduGames ready and exit signaling without changing the core gameplay rules.
- This package intentionally stays offline-first with only local runtime references.

## License

- Upstream game code: GPL-3.0-or-later, based on game-of-differences.html by Jacob Kanev.
- Packaging assets and wrapper code: GPL-3.0-or-later for consistency with the distributed bundle.

## Local use

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/games/game-of-differences
pnpm test
pnpm build
python3 -m http.server 4173
```
