import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import {
  gameManifestSchema,
  type GameManifest
} from "@edugames/contracts";

export const MAX_COMPRESSED_BUNDLE_SIZE_BYTES = 30 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BUNDLE_SIZE_BYTES = 100 * 1024 * 1024;
export const MIN_ICON_SIZE_PX = 256;
export const MIN_SCREENSHOT_WIDTH_PX = 1280;
export const MIN_SCREENSHOT_HEIGHT_PX = 720;

const MANIFEST_CANDIDATES = ["manifest.json", "game.manifest.json"];
const REQUIRED_ROOT_FILES = ["README.md", "LICENSES.json"];
const TEXT_SCAN_EXTENSIONS = new Set([".html", ".js", ".mjs", ".css"]);
const IGNORED_TOP_LEVEL_DIRECTORIES = new Set(["dist", "node_modules", "scripts", "tests"]);
const BANNED_BROWSER_APIS: Record<string, RegExp> = {
  "document.cookie": /\bdocument\.cookie\b/,
  "window.open": /\bwindow\.open\b/,
  "getUserMedia": /\bgetUserMedia\b/,
  WebSocket: /\bWebSocket\b/,
  RTCPeerConnection: /\bRTCPeerConnection\b/,
  NotificationPermission: /\bNotification\.requestPermission\b/
};

export type ValidationIssueCode =
  | "missing-manifest"
  | "invalid-manifest"
  | "missing-file"
  | "bundle-too-large"
  | "prohibited-content-flag"
  | "remote-url"
  | "banned-browser-api"
  | "csp-not-enforceable"
  | "invalid-asset-dimensions"
  | "invalid-local-reference";

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string;
  path?: string;
};

export type ValidationReport = {
  ok: boolean;
  rootDir: string;
  manifestPath: string | null;
  manifest: GameManifest | null;
  issues: ValidationIssue[];
  stats: {
    fileCount: number;
    uncompressedSizeBytes: number;
  };
};

type AssetDimensions = {
  width: number;
  height: number;
};

const toPosixPath = (value: string): string => value.split(path.sep).join(path.posix.sep);

const addIssue = (
  issues: ValidationIssue[],
  code: ValidationIssueCode,
  message: string,
  filePath?: string
): void => {
  issues.push({
    code,
    message,
    path: filePath ? toPosixPath(filePath) : undefined
  });
};

const fileExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await stat(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const resolveManifestPath = async (rootDir: string): Promise<string | null> => {
  for (const fileName of MANIFEST_CANDIDATES) {
    const candidate = path.join(rootDir, fileName);

    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
};

const resolveBundlePath = (rootDir: string, bundlePath: string): string | null => {
  const resolvedPath = path.resolve(rootDir, bundlePath);
  const relativeToRoot = path.relative(rootDir, resolvedPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return resolvedPath;
};

const collectBundleFiles = async (rootDir: string): Promise<string[]> => {
  const results: string[] = [];

  const walk = async (currentDir: string): Promise<void> => {
    const entries = await readdir(currentDir, {
      withFileTypes: true
    });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, entryPath);

      if (
        relativePath.startsWith(`node_modules${path.sep}`) ||
        relativePath.startsWith(`tests${path.sep}`) ||
        relativePath.startsWith(`scripts${path.sep}`) ||
        relativePath.startsWith(`dist${path.sep}`)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        if (
          currentDir === rootDir &&
          IGNORED_TOP_LEVEL_DIRECTORIES.has(entry.name)
        ) {
          continue;
        }

        await walk(entryPath);
        continue;
      }

      if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  };

  await walk(rootDir);

  return results.sort((left, right) => left.localeCompare(right));
};

const computeUncompressedSizeBytes = async (files: string[]): Promise<number> => {
  let total = 0;

  for (const filePath of files) {
    total += (await stat(filePath)).size;
  }

  return total;
};

const readSvgDimensions = (contents: string): AssetDimensions | null => {
  const widthMatch = contents.match(/\bwidth="(\d+(?:\.\d+)?)"/i);
  const heightMatch = contents.match(/\bheight="(\d+(?:\.\d+)?)"/i);

  if (widthMatch && heightMatch) {
    return {
      width: Number(widthMatch[1]),
      height: Number(heightMatch[1])
    };
  }

  const viewBoxMatch = contents.match(/\bviewBox="[-\d.\s]+?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)"/i);

  if (!viewBoxMatch) {
    return null;
  }

  return {
    width: Number(viewBoxMatch[1]),
    height: Number(viewBoxMatch[2])
  };
};

const readPngDimensions = async (filePath: string): Promise<AssetDimensions | null> => {
  const buffer = await readFile(filePath);

  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
};

const readAssetDimensions = async (filePath: string): Promise<AssetDimensions | null> => {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".svg") {
    return readSvgDimensions(await readFile(filePath, "utf8"));
  }

  if (extension === ".png") {
    return readPngDimensions(filePath);
  }

  return null;
};

const validateAssetDimensions = async (
  issues: ValidationIssue[],
  rootDir: string,
  manifest: GameManifest
): Promise<void> => {
  const iconPath = resolveBundlePath(rootDir, manifest.iconPath);

  if (iconPath && (await fileExists(iconPath))) {
    const iconDimensions = await readAssetDimensions(iconPath);

    if (
      !iconDimensions ||
      iconDimensions.width < MIN_ICON_SIZE_PX ||
      iconDimensions.height < MIN_ICON_SIZE_PX
    ) {
      addIssue(
        issues,
        "invalid-asset-dimensions",
        `Expected icon dimensions to be at least ${MIN_ICON_SIZE_PX}x${MIN_ICON_SIZE_PX}.`,
        iconPath
      );
    }
  }

  for (const screenshotPath of manifest.screenshotPaths) {
    const resolvedPath = resolveBundlePath(rootDir, screenshotPath);

    if (resolvedPath && (await fileExists(resolvedPath))) {
      const dimensions = await readAssetDimensions(resolvedPath);

      if (
        !dimensions ||
        dimensions.width < MIN_SCREENSHOT_WIDTH_PX ||
        dimensions.height < MIN_SCREENSHOT_HEIGHT_PX ||
        dimensions.width <= dimensions.height
      ) {
        addIssue(
          issues,
          "invalid-asset-dimensions",
          `Expected screenshot dimensions to be at least ${MIN_SCREENSHOT_WIDTH_PX}x${MIN_SCREENSHOT_HEIGHT_PX} and landscape oriented.`,
          resolvedPath
        );
      }
    }
  }
};

const enforceRequiredFiles = async (
  issues: ValidationIssue[],
  rootDir: string,
  manifest: GameManifest
): Promise<void> => {
  for (const fileName of REQUIRED_ROOT_FILES) {
    const filePath = path.join(rootDir, fileName);

    if (!(await fileExists(filePath))) {
      addIssue(issues, "missing-file", `Missing required file: ${fileName}.`, filePath);
    }
  }

  const referencedFiles = [
    manifest.entrypoint,
    manifest.iconPath,
    ...manifest.screenshotPaths
  ];

  for (const bundlePath of referencedFiles) {
    const filePath = resolveBundlePath(rootDir, bundlePath);

    if (!filePath) {
      addIssue(
        issues,
        "invalid-local-reference",
        `Manifest path escapes the bundle root: ${bundlePath}.`
      );
      continue;
    }

    if (!(await fileExists(filePath))) {
      addIssue(
        issues,
        "missing-file",
        `Referenced file does not exist: ${bundlePath}.`,
        filePath
      );
    }
  }
};

const validateContentFlags = (
  issues: ValidationIssue[],
  manifest: GameManifest
): void => {
  for (const [flag, enabled] of Object.entries(manifest.contentFlags)) {
    if (enabled) {
      addIssue(
        issues,
        "prohibited-content-flag",
        `Content flag "${flag}" must be false for MVP child-directed games.`
      );
    }
  }
};

const validateEntryPointHtml = async (
  issues: ValidationIssue[],
  entryPointPath: string
): Promise<void> => {
  const html = await readFile(entryPointPath, "utf8");

  if (/<script(?![^>]*\ssrc=)[^>]*>/i.test(html)) {
    addIssue(
      issues,
      "csp-not-enforceable",
      "Inline <script> tags are not allowed because they prevent a strict CSP.",
      entryPointPath
    );
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    addIssue(
      issues,
      "csp-not-enforceable",
      "Inline event handlers are not allowed because they prevent a strict CSP.",
      entryPointPath
    );
  }

  if (/javascript:/i.test(html)) {
    addIssue(
      issues,
      "csp-not-enforceable",
      "javascript: URLs are not allowed because they prevent a strict CSP.",
      entryPointPath
    );
  }
};

const validateTextFilePolicies = async (
  issues: ValidationIssue[],
  rootDir: string,
  files: string[]
): Promise<void> => {
  for (const filePath of files) {
    const extension = path.extname(filePath).toLowerCase();

    if (!TEXT_SCAN_EXTENSIONS.has(extension)) {
      continue;
    }

    const contents = await readFile(filePath, "utf8");

    const remoteUrlMatches = contents.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];

    for (const url of remoteUrlMatches) {
      addIssue(
        issues,
        "remote-url",
        `Remote URL usage is not allowed in bundled runtime assets: ${url}.`,
        filePath
      );
    }

    for (const [apiName, pattern] of Object.entries(BANNED_BROWSER_APIS)) {
      if (pattern.test(contents)) {
        addIssue(
          issues,
          "banned-browser-api",
          `Unsupported browser API usage detected: ${apiName}.`,
          filePath
        );
      }
    }

    const referencePatterns =
      extension === ".html"
        ? [...contents.matchAll(/\b(?:src|href)=["']([^"'#?]+)["']/gi)].map(
            (match) => match[1]
          )
        : [...contents.matchAll(/(?:import\s+(?:[^"'()]+?\s+from\s+)?|import\()\s*["']([^"']+)["']/g)].map(
            (match) => match[1]
          );

    for (const reference of referencePatterns) {
      if (
        reference.startsWith("http://") ||
        reference.startsWith("https://") ||
        reference.startsWith("data:") ||
        reference.startsWith("javascript:") ||
        reference.startsWith("#")
      ) {
        continue;
      }

      if (!reference.startsWith("./") && !reference.startsWith("../")) {
        addIssue(
          issues,
          "invalid-local-reference",
          `Runtime reference must stay inside the bundle with a relative path: ${reference}.`,
          filePath
        );
        continue;
      }

      const resolvedReference = path.resolve(path.dirname(filePath), reference);
      const relativeToRoot = path.relative(rootDir, resolvedReference);

      if (
        relativeToRoot.startsWith("..") ||
        path.isAbsolute(relativeToRoot) ||
        !(await fileExists(resolvedReference))
      ) {
        addIssue(
          issues,
          "invalid-local-reference",
          `Runtime reference escapes the bundle or points to a missing file: ${reference}.`,
          filePath
        );
      }
    }
  }
};

export const validateGameBundle = async (rootDir: string): Promise<ValidationReport> => {
  const issues: ValidationIssue[] = [];
  const manifestPath = await resolveManifestPath(rootDir);
  const files = await collectBundleFiles(rootDir);
  const stats = {
    fileCount: files.length,
    uncompressedSizeBytes: await computeUncompressedSizeBytes(files)
  };

  if (!manifestPath) {
    addIssue(issues, "missing-manifest", "Missing manifest.json or game.manifest.json.");

    return {
      ok: false,
      rootDir,
      manifestPath: null,
      manifest: null,
      issues,
      stats
    };
  }

  let manifestJson: unknown;

  try {
    manifestJson = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    addIssue(
      issues,
      "invalid-manifest",
      `Manifest is not valid JSON: ${error instanceof Error ? error.message : "unknown error"}.`,
      manifestPath
    );

    return {
      ok: false,
      rootDir,
      manifestPath,
      manifest: null,
      issues,
      stats
    };
  }

  const manifestResult = gameManifestSchema.safeParse(manifestJson);

  if (!manifestResult.success) {
    for (const issue of manifestResult.error.issues) {
      addIssue(
        issues,
        "invalid-manifest",
        issue.message,
        `${manifestPath}#${issue.path.join(".")}`
      );
    }

    return {
      ok: false,
      rootDir,
      manifestPath,
      manifest: null,
      issues,
      stats
    };
  }

  const manifest = manifestResult.data;
  const entryPointPath = resolveBundlePath(rootDir, manifest.entrypoint);

  await enforceRequiredFiles(issues, rootDir, manifest);
  validateContentFlags(issues, manifest);

  if (manifest.compressedSizeBytes > MAX_COMPRESSED_BUNDLE_SIZE_BYTES) {
    addIssue(
      issues,
      "bundle-too-large",
      `Compressed bundle size exceeds the ${MAX_COMPRESSED_BUNDLE_SIZE_BYTES} byte budget.`,
      manifestPath
    );
  }

  if (stats.uncompressedSizeBytes > MAX_UNCOMPRESSED_BUNDLE_SIZE_BYTES) {
    addIssue(
      issues,
      "bundle-too-large",
      `Bundle contents exceed the ${MAX_UNCOMPRESSED_BUNDLE_SIZE_BYTES} byte uncompressed budget.`
    );
  }

  if (entryPointPath && (await fileExists(entryPointPath))) {
    await validateEntryPointHtml(issues, entryPointPath);
  }

  await validateTextFilePolicies(issues, rootDir, files);
  await validateAssetDimensions(issues, rootDir, manifest);

  return {
    ok: issues.length === 0,
    rootDir,
    manifestPath,
    manifest,
    issues,
    stats
  };
};
