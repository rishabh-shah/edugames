import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("game validator cli", () => {
  it("prints a JSON validation report for a valid bundle", async () => {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        "src/cli.ts",
        "--json",
        "tests/fixtures/valid-bundle"
      ],
      {
        cwd: new URL("..", import.meta.url).pathname
      }
    );

    const report = JSON.parse(stdout);

    expect(report.ok).toBe(true);
    expect(report.manifest.slug).toBe("shape-match");
  });
});
