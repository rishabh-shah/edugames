import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { adminWebScaffold } from "../src/index.ts";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

describe("admin web bootstrap", () => {
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
    expect(adminWebScaffold.workspace).toBe("admin-web");
    expect(adminWebScaffold.purpose).toMatch(/maintainer dashboard/i);
  });
});
