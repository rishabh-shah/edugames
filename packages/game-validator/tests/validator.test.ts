import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { validateGameBundle } from "../src/index.js";

const fixturesDir = new URL("./fixtures/valid-bundle/", import.meta.url);
const tempDirs: string[] = [];

const createFixtureCopy = async (): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "edugames-validator-"));
  const fixtureDir = path.join(tempDir, "bundle");

  await cp(fixturesDir, fixtureDir, {
    recursive: true
  });

  tempDirs.push(tempDir);

  return fixtureDir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((tempDir) =>
      rm(tempDir, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("validateGameBundle", () => {
  it("accepts a compliant bundle fixture", async () => {
    const fixtureDir = await createFixtureCopy();

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(true);
    expect(report.manifest?.slug).toBe("shape-match");
    expect(report.issues).toEqual([]);
  });

  it("rejects remote URLs and banned browser APIs", async () => {
    const fixtureDir = await createFixtureCopy();
    const mainJsPath = path.join(fixtureDir, "main.js");
    const mainJs = await readFile(mainJsPath, "utf8");

    await writeFile(
      mainJsPath,
      `${mainJs}\nfetch("https://example.com/tracker");\nwindow.open("https://example.com");\n`,
      "utf8"
    );

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("remote-url");
    expect(report.issues.map((issue) => issue.code)).toContain("banned-browser-api");
  });

  it("rejects runtime references that escape the bundle root", async () => {
    const fixtureDir = await createFixtureCopy();
    const mainJsPath = path.join(fixtureDir, "main.js");
    const mainJs = await readFile(mainJsPath, "utf8");

    await writeFile(
      mainJsPath,
      `${mainJs}\nimport '../../packages/game-sdk/src/index.js';\n`,
      "utf8"
    );

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("invalid-local-reference");
  });

  it("rejects manifest entrypoints that escape the bundle root", async () => {
    const fixtureDir = await createFixtureCopy();
    const manifestPath = path.join(fixtureDir, "manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    manifest.entrypoint = "../outside.html";

    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("invalid-manifest");
  });

  it("rejects CSP-hostile entrypoints and prohibited content flags", async () => {
    const fixtureDir = await createFixtureCopy();
    const manifestPath = path.join(fixtureDir, "manifest.json");
    const entrypointPath = path.join(fixtureDir, "index.html");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    manifest.contentFlags.ads = true;

    await writeFile(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8"
    );
    await writeFile(
      entrypointPath,
      `<!doctype html><html><body onload="boot()"><script>boot()</script></body></html>`,
      "utf8"
    );

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("prohibited-content-flag");
    expect(report.issues.map((issue) => issue.code)).toContain("csp-not-enforceable");
  });

  it("rejects missing review assets and undersized screenshots", async () => {
    const fixtureDir = await createFixtureCopy();
    const screenshotPath = path.join(fixtureDir, "assets", "ss-1.svg");

    await writeFile(
      screenshotPath,
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"></svg>`,
      "utf8"
    );
    await rm(path.join(fixtureDir, "assets", "ss-2.svg"));

    const report = await validateGameBundle(fixtureDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain("invalid-asset-dimensions");
    expect(report.issues.map((issue) => issue.code)).toContain("missing-file");
  });
});
