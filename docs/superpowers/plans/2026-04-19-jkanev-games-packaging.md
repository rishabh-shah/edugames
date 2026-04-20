# JKanev Games Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package four GPL-licensed `jkanev/educational-html-games` titles into EduGames as offline HTML5 bundles and expose them through the local catalog.

**Architecture:** Each upstream single-file HTML game will live in its own `games/<slug>` package with a light EduGames bootstrap script injected at build time for ready and exit signaling. The API fixture repository will publish the new bundles as live catalog items, and bundle metadata will be derived from each built `dist/` directory the same way the existing sample game works.

**Tech Stack:** pnpm workspace packages, Vitest, static HTML/CSS/JS bundles, EduGames browser SDK, Fastify fixture repository.

---

### Task 1: Extend catalog expectations

**Files:**
- Modify: `services/api/tests/catalog.unit.test.ts`
- Modify: `services/api/tests/routes.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Add expectations for these live slugs:

```ts
[
  "shape-match",
  "set-sizes-shapes",
  "triple-number-memory",
  "game-of-sums",
  "game-of-differences"
]
```

and verify game detail for one new slug, for example:

```ts
expect(gameDetail.json().slug).toBe("set-sizes-shapes");
expect(gameDetail.json().title).toBe("Set Sizes Shapes");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @edugames/api test -- --run services/api/tests/catalog.unit.test.ts services/api/tests/routes.integration.test.ts`

Expected: FAIL because the repository fixture still publishes only `shape-match`.

- [ ] **Step 3: Write minimal implementation**

Add new published-game records and local bundle metadata resolution in:

```ts
services/api/src/repositories/in-memory-platform-repository.ts
```

using new slugs:

```ts
"set-sizes-shapes"
"triple-number-memory"
"game-of-sums"
"game-of-differences"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @edugames/api test -- --run services/api/tests/catalog.unit.test.ts services/api/tests/routes.integration.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add services/api/tests/catalog.unit.test.ts services/api/tests/routes.integration.test.ts services/api/src/repositories/in-memory-platform-repository.ts
git commit -m "feat: publish packaged jkanev games"
```

### Task 2: Add the packaged game workspaces

**Files:**
- Create: `games/set-sizes-shapes/**`
- Create: `games/triple-number-memory/**`
- Create: `games/game-of-sums/**`
- Create: `games/game-of-differences/**`

- [ ] **Step 1: Write the failing package tests**

Create `tests/package-contract.test.js` in each game folder with checks equivalent to:

```js
expect(parsedManifest.slug).toBe("set-sizes-shapes");
expect(parsedManifest.entrypoint).toBe("index.html");
expect(parsedManifest.runtime).toBe("html5");
expect(html).toMatch(/edugames-exit-button/);
expect(runtimeSource).toMatch(/createEduGameSdk/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @edugames/set-sizes-shapes test`

Expected: FAIL because the package does not exist yet.

- [ ] **Step 3: Write minimal implementation**

For each package, add:

```text
manifest.json
LICENSES.json
README.md
index.html
package.json
scripts/build.mjs
scripts/lint.mjs
src/bootstrap.js
src/vendor/edugames-sdk.js
assets/icon.svg
assets/screenshots/*.svg
tests/package-contract.test.js
```

The build should copy the upstream HTML, bundle `src/bootstrap.js` to `dist/assets/bootstrap.js`, and inject:

```html
<script src="./assets/bootstrap.js"></script>
```

before `</body>`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @edugames/set-sizes-shapes test
pnpm --filter @edugames/triple-number-memory test
pnpm --filter @edugames/game-of-sums test
pnpm --filter @edugames/game-of-differences test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add games/set-sizes-shapes games/triple-number-memory games/game-of-sums games/game-of-differences
git commit -m "feat: add jkanev game bundles"
```

### Task 3: Build and validate bundle metadata

**Files:**
- Modify: `package.json`
- Modify: `services/api/src/repositories/in-memory-platform-repository.ts`

- [ ] **Step 1: Write the failing verification expectation**

Run the validator against one new game before metadata support exists:

```bash
pnpm --filter @edugames/game-validator validate ../../games/set-sizes-shapes
```

Expected: FAIL until the package is fully structured and built.

- [ ] **Step 2: Write minimal implementation**

Add bundle build coverage for all four new packages and generalize local metadata lookup so fixture SHA and size fields come from built `dist/` directories when present.

- [ ] **Step 3: Run verification**

Run:

```bash
pnpm --filter @edugames/set-sizes-shapes build
pnpm --filter @edugames/triple-number-memory build
pnpm --filter @edugames/game-of-sums build
pnpm --filter @edugames/game-of-differences build
pnpm --filter @edugames/game-validator validate ../../games/set-sizes-shapes
pnpm --filter @edugames/game-validator validate ../../games/triple-number-memory
pnpm --filter @edugames/game-validator validate ../../games/game-of-sums
pnpm --filter @edugames/game-validator validate ../../games/game-of-differences
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add package.json services/api/src/repositories/in-memory-platform-repository.ts
git commit -m "build: validate packaged jkanev bundles"
```

### Task 4: Local gameplay verification and publish

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add notes for shipped scope**

Document that `set-sizes-animals` is intentionally excluded from packaging because its file-level license terms are not suitable for this platform.

- [ ] **Step 2: Run local gameplay verification**

Run a local server and exercise all four games in a browser:

```bash
python3 -m http.server 4173 --directory /Users/shrutishah/Desktop/Codebase/edugames/games
```

Then verify:

```text
/set-sizes-shapes/dist/
/triple-number-memory/dist/
/game-of-sums/dist/
/game-of-differences/dist/
```

Check that each game loads, accepts at least one interaction, and the EduGames exit button is visible.

- [ ] **Step 3: Run final verification**

Run:

```bash
pnpm --filter @edugames/api test
pnpm --filter @edugames/set-sizes-shapes test && pnpm --filter @edugames/set-sizes-shapes build
pnpm --filter @edugames/triple-number-memory test && pnpm --filter @edugames/triple-number-memory build
pnpm --filter @edugames/game-of-sums test && pnpm --filter @edugames/game-of-sums build
pnpm --filter @edugames/game-of-differences test && pnpm --filter @edugames/game-of-differences build
pnpm --filter @edugames/game-validator validate ../../games/set-sizes-shapes
pnpm --filter @edugames/game-validator validate ../../games/triple-number-memory
pnpm --filter @edugames/game-validator validate ../../games/game-of-sums
pnpm --filter @edugames/game-validator validate ../../games/game-of-differences
```

Expected: PASS

- [ ] **Step 4: Commit and push**

```bash
git add README.md docs/superpowers/plans/2026-04-19-jkanev-games-packaging.md
git commit -m "docs: record jkanev packaging scope"
git push -u origin codex/package-jkanev-games
```
