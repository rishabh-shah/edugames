import { z } from "zod";

import { ageBandSchema } from "./age-bands.js";
import {
  contentFlagsSchema,
  gameIdSchema,
  gameSlugSchema,
  isoTimestampSchema
} from "./common.js";

export const catalogItemSchema = z.object({
  gameId: gameIdSchema,
  slug: gameSlugSchema,
  version: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  ageBand: ageBandSchema,
  iconUrl: z.string().url(),
  cached: z.boolean()
});

export const catalogSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  items: z.array(catalogItemSchema)
});

export const catalogResponseSchema = z.object({
  generatedAt: isoTimestampSchema,
  sections: z.array(catalogSectionSchema)
});

export const gameDetailResponseSchema = z.object({
  gameId: gameIdSchema,
  slug: gameSlugSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  ageBand: ageBandSchema,
  screenshots: z.array(z.string().url()),
  categories: z.array(z.string().min(1)),
  offlineReady: z.boolean(),
  contentFlags: contentFlagsSchema
});

export type CatalogResponse = z.infer<typeof catalogResponseSchema>;
export type GameDetailResponse = z.infer<typeof gameDetailResponseSchema>;
