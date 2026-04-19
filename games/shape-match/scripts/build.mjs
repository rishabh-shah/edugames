import { cpSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = resolve(packageRoot, "dist");
const copyTargets = [
  "assets",
  "index.html",
  "LICENSES.json",
  "manifest.json",
  "README.md",
  "src",
  "styles.css"
];

rmSync(distRoot, {
  force: true,
  recursive: true
});
mkdirSync(distRoot, {
  recursive: true
});

for (const relativePath of copyTargets) {
  cpSync(resolve(packageRoot, relativePath), resolve(distRoot, relativePath), {
    recursive: true
  });
}
