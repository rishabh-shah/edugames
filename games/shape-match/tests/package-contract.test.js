import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { gameManifestSchema } from "../../../packages/contracts/src/manifest.ts";

const packageRoot = resolve(import.meta.dirname, "..");

describe("shape-match package contract", () => {
  it("ships a valid manifest and referenced assets", () => {
    const manifestPath = resolve(packageRoot, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const parsedManifest = gameManifestSchema.parse(manifest);

    expect(parsedManifest.gameId).toBe("shape-match");
    expect(parsedManifest.slug).toBe("shape-match");
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

  it("declares a local static runtime in index.html", () => {
    const html = readFileSync(resolve(packageRoot, "index.html"), "utf8");
    const runtimeSource = readFileSync(
      resolve(packageRoot, "src/main.js"),
      "utf8"
    );
    const buildSource = readFileSync(
      resolve(packageRoot, "scripts/build.mjs"),
      "utf8"
    );

    expect(html).toMatch(/id="game-canvas"/);
    expect(html).toMatch(/id="start-button"/);
    expect(html).toMatch(/src="\.\/src\/main\.js"/);
    expect(html).toMatch(/data-testid="shape-match-app"/);
    expect(html).toMatch(/data-testid="shape-match-prompt"/);
    expect(html).toMatch(/data-testid="shape-match-progress"/);
    expect(html).toMatch(/data-testid="shape-match-targets"/);
    expect(html).toMatch(/data-testid="shape-match-complete"/);
    expect(runtimeSource).toMatch(/\.\/vendor\/edugames-sdk\.js/);
    expect(runtimeSource).not.toMatch(/\.\.\/\.\.\/\.\.\/packages\/game-sdk/);
    expect(buildSource).toMatch(/LICENSES\.json/);
    expect(html).toMatch(/Shape Match Garden/);
  });
});
