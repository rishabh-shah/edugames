import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const requiredFiles = [
  "manifest.json",
  "LICENSES.json",
  "index.html",
  "styles.css",
  "README.md",
  "src/game-logic.js",
  "src/main.js",
  "tests/game-logic.test.js",
  "tests/runtime.integration.test.js",
  "tests/package-contract.test.js"
];

for (const relativePath of requiredFiles) {
  if (!existsSync(resolve(packageRoot, relativePath))) {
    throw new Error(`Missing required Shape Match file: ${relativePath}`);
  }
}

const manifest = JSON.parse(readFileSync(resolve(packageRoot, "manifest.json"), "utf8"));
const html = readFileSync(resolve(packageRoot, "index.html"), "utf8");

if (manifest.entrypoint !== "index.html") {
  throw new Error("Expected manifest entrypoint to stay aligned with index.html.");
}

const assetPaths = [manifest.iconPath, ...(manifest.screenshotPaths ?? [])];

for (const relativePath of assetPaths) {
  if (!existsSync(resolve(packageRoot, relativePath))) {
    throw new Error(`Manifest asset is missing from the package: ${relativePath}`);
  }
}

if (!html.includes("./src/main.js")) {
  throw new Error("Expected index.html to load the local runtime module.");
}
