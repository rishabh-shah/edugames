import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { gameManifestSchema } from "../../../packages/contracts/src/manifest.ts";

const packageRoot = resolve(import.meta.dirname, "..");

describe("game-of-differences package contract", () => {
  it("ships a valid manifest and referenced assets", () => {
    const manifestPath = resolve(packageRoot, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const parsedManifest = gameManifestSchema.parse(manifest);

    expect(parsedManifest.gameId).toBe("game-of-differences");
    expect(parsedManifest.slug).toBe("game-of-differences");
    expect(parsedManifest.entrypoint).toBe("index.html");
    expect(parsedManifest.runtime).toBe("html5");
    expect(parsedManifest.orientation).toBe("landscape");

    const referencedFiles = [
      parsedManifest.entrypoint,
      parsedManifest.iconPath,
      ...parsedManifest.screenshotPaths,
      "LICENSES.json",
      "README.md"
    ];

    for (const relativePath of referencedFiles) {
      expect(existsSync(resolve(packageRoot, relativePath))).toBe(true);
    }
  });

  it("loads the local game runtime and EduGames bootstrap from the bundle", () => {
    const html = readFileSync(resolve(packageRoot, "index.html"), "utf8");
    const runtimeSource = readFileSync(resolve(packageRoot, "src/bootstrap.js"), "utf8");
    const gameSource = readFileSync(resolve(packageRoot, "src/game.js"), "utf8");
    const buildSource = readFileSync(resolve(packageRoot, "scripts/build.mjs"), "utf8");

    expect(html).toContain('src="./src/game.js"');
    expect(html).toContain('src="./src/bootstrap.js"');
    expect(runtimeSource).toMatch(/createEduGameSdk/);
    expect(runtimeSource).toMatch(/edugames-exit-button/);
    expect(gameSource.length).toBeGreaterThan(1000);
    expect(buildSource).toContain("assets/bootstrap.js");
  });
});
