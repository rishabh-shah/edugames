import { z } from "zod";

import { ageBandSchema } from "./age-bands.js";
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
});

export type GameManifest = z.infer<typeof gameManifestSchema>;
