import { z } from "zod";

import { ageBandSchema, isAgeBandRangeOrdered } from "./age-bands.js";
import {
  contentFlagsSchema,
  gameIdSchema,
  gameSlugSchema,
  localBundlePathSchema,
  localeSchema,
  orientationSchema,
  runtimeSchema,
  semverSchema,
  sha256ChecksumSchema
} from "./common.js";

const gameCapabilitySchema = z.enum(["saveState", "events", "audio"]);

export const assetLicenseDeclarationSchema = z.object({
  code: z.string().min(1),
  art: z.string().min(1),
  audio: z.string().min(1),
  fonts: z.string().min(1)
});

export const gameTelemetrySchema = z.object({
  allowedEvents: z.array(z.string().min(1)).min(1)
});

export const gameManifestSchema = z.object({
  schemaVersion: z.literal(1),
  gameId: gameIdSchema,
  slug: gameSlugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  version: semverSchema,
  runtime: runtimeSchema,
  entrypoint: localBundlePathSchema,
  orientation: orientationSchema,
  defaultLocale: localeSchema,
  supportedLocales: z.array(localeSchema).min(1),
  minAgeBand: ageBandSchema,
  maxAgeBand: ageBandSchema,
  categories: z.array(z.string().min(1)).min(1),
  offlineReady: z.boolean(),
  compressedSizeBytes: z.number().int().nonnegative().max(30 * 1024 * 1024),
  sha256: sha256ChecksumSchema,
  iconPath: localBundlePathSchema,
  screenshotPaths: z.array(localBundlePathSchema).min(1),
  contentFlags: contentFlagsSchema,
  telemetry: gameTelemetrySchema,
  capabilities: z.array(gameCapabilitySchema).min(1),
  assetLicenseDeclaration: assetLicenseDeclarationSchema
}).superRefine((manifest, ctx) => {
  if (!isAgeBandRangeOrdered(manifest.minAgeBand, manifest.maxAgeBand)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected minAgeBand to be less than or equal to maxAgeBand.",
      path: ["maxAgeBand"]
    });
  }

  if (manifest.gameId !== manifest.slug) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected gameId to match slug for MVP game packages.",
      path: ["gameId"]
    });
  }

  if (!manifest.supportedLocales.includes(manifest.defaultLocale)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Expected defaultLocale to be listed in supportedLocales.",
      path: ["defaultLocale"]
    });
  }
});

export type GameManifest = z.infer<typeof gameManifestSchema>;
