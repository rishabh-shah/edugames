#!/usr/bin/env node

import path from "node:path";

import { validateGameBundle } from "./index.js";

const run = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const targetArg = args.find((value) => !value.startsWith("--")) ?? ".";
  const rootDir = path.resolve(process.cwd(), targetArg);
  const report = await validateGameBundle(rootDir);

  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    console.log(
      `EduGames validator passed for ${rootDir} (${report.stats.fileCount} files, ${report.stats.uncompressedSizeBytes} bytes).`
    );
  } else {
    console.error(`EduGames validator failed for ${rootDir}.`);

    for (const issue of report.issues) {
      const suffix = issue.path ? ` (${issue.path})` : "";
      console.error(`- [${issue.code}] ${issue.message}${suffix}`);
    }
  }

  process.exitCode = report.ok ? 0 : 1;
};

await run();
