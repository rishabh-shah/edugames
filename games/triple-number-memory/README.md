# Triple Number Memory

Purpose: Packaged EduGames bundle for the GPL-licensed upstream HTML game `triple-number-memory.html` from [jkanev/educational-html-games](https://github.com/jkanev/educational-html-games).

## What it is

Triple Number Memory adapts Jacob Kanev's number matching game for the EduGames platform. Players uncover three cards at a time and look for matching number triplets shown as numerals, dot groups, and words, helping early readers connect multiple number representations.

## Packaging notes

- The original gameplay logic is preserved from the upstream single-file HTML game.
- The bundled `src/bootstrap.js` adds EduGames ready and exit signaling without changing the core gameplay rules.
- This package intentionally stays offline-first with only local runtime references.

## License

- Upstream game code: GPL-3.0-or-later, based on triple-number-memory.html by Jacob Kanev.
- Packaging assets and wrapper code: GPL-3.0-or-later for consistency with the distributed bundle.

## Local use

```sh
cd /Users/shrutishah/Desktop/Codebase/edugames/games/triple-number-memory
pnpm test
pnpm build
python3 -m http.server 4173
```
