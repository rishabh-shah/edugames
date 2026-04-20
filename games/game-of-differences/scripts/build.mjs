import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distRoot = resolve(packageRoot, "dist");
const repoRoot = resolve(packageRoot, "../..");
const copyTargets = [
  "assets",
  "index.html",
  "LICENSES.json",
  "manifest.json",
  "README.md",
  "styles.css"
];

const resolveEsbuildBinary = () => {
  const pnpmRoot = resolve(repoRoot, "node_modules", ".pnpm");
  const candidate = readdirSync(pnpmRoot)
    .filter((entry) => entry.startsWith("esbuild@"))
    .sort()
    .at(-1);

  if (!candidate) {
    throw new Error("Unable to locate esbuild in root node_modules/.pnpm");
  }

  return resolve(pnpmRoot, candidate, "node_modules", "esbuild", "bin", "esbuild");
};

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

const bundledScriptRelativePath = "assets/bootstrap.js";
execFileSync(
  resolveEsbuildBinary(),
  [
    resolve(packageRoot, "src", "bootstrap.js"),
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--outfile=" + resolve(distRoot, bundledScriptRelativePath)
  ],
  {
    stdio: "inherit"
  }
);

mkdirSync(resolve(distRoot, "src"), {
  recursive: true
});
cpSync(resolve(packageRoot, "src", "game.js"), resolve(distRoot, "src", "game.js"), {
  recursive: false
});

const distIndexHTML = resolve(distRoot, "index.html");
const indexHTML = readFileSync(distIndexHTML, "utf8").replace(
  '<script type="module" src="./src/bootstrap.js"></script>',
  '<script src="./' + bundledScriptRelativePath + '"></script>'
);
writeFileSync(distIndexHTML, indexHTML);
