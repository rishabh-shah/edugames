import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { siteScaffold } from "../src/index.ts";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

describe("site bootstrap", () => {
  it("exposes the standard workspace scripts", () => {
    expect(Object.keys(packageJson.scripts).sort()).toEqual([
      "build",
      "lint",
      "test",
      "typecheck"
    ]);
  });

  it("documents the workspace purpose", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toMatch(/Purpose:/);
  });

  it("exports scaffold metadata", () => {
    expect(siteScaffold.workspace).toBe("site");
    expect(siteScaffold.purpose).toMatch(/documentation surface/i);
  });
});
