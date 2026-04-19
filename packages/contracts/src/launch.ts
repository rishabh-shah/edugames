import { z } from "zod";

import { ageBandSchema, isAgeBandRangeOrdered } from "./age-bands.js";
import {
  gameIdSchema,
  launchSessionIdSchema,
  opaqueTokenSchema,
  profileIdSchema
} from "./common.js";

export const launchSessionRequestSchema = z.object({
  profileId: profileIdSchema,
  gameId: gameIdSchema
});

export const launchManifestSchema = z.object({
  entrypoint: z.string().min(1),
  minAgeBand: ageBandSchema,
  maxAgeBand: ageBandSchema,
  allowedEvents: z.array(z.string().min(1))
}).refine(
  (manifest) => isAgeBandRangeOrdered(manifest.minAgeBand, manifest.maxAgeBand),
  {
    message: "Expected minAgeBand to be less than or equal to maxAgeBand.",
    path: ["maxAgeBand"]
  }
);

export const launchBundleSchema = z.object({
  bundleUrl: z.string().url(),
  sha256: opaqueTokenSchema,
  compressedSizeBytes: z.number().int().nonnegative()
});

export const launchCachePolicySchema = z.object({
  revalidateAfterSeconds: z.number().int().positive()
});

export const launchSessionResponseSchema = z.object({
  launchSessionId: launchSessionIdSchema,
  gameId: gameIdSchema,
  version: z.string().min(1),
  bundle: launchBundleSchema,
  manifest: launchManifestSchema,
  cachePolicy: launchCachePolicySchema
});

export type LaunchSessionRequest = z.infer<typeof launchSessionRequestSchema>;
export type LaunchSessionResponse = z.infer<typeof launchSessionResponseSchema>;
