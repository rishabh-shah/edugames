import { z } from "zod";

import { ageBandSchema, isAgeBandRangeOrdered } from "./age-bands.js";
import { contentFlagsSchema, gameSlugSchema, semverSchema } from "./common.js";

export const gameManifestSchema = z.object({
  slug: gameSlugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  version: semverSchema,
  entrypoint: z.string().min(1),
  minAgeBand: ageBandSchema,
  maxAgeBand: ageBandSchema,
  categories: z.array(z.string().min(1)).min(1),
  screenshots: z.array(z.string().min(1)).min(1),
  contentFlags: contentFlagsSchema,
  offlineReady: z.boolean(),
  allowedEvents: z.array(z.string().min(1)),
  license: z.string().min(1)
}).refine(
  (manifest) => isAgeBandRangeOrdered(manifest.minAgeBand, manifest.maxAgeBand),
  {
    message: "Expected minAgeBand to be less than or equal to maxAgeBand.",
    path: ["maxAgeBand"]
  }
);

export type GameManifest = z.infer<typeof gameManifestSchema>;
