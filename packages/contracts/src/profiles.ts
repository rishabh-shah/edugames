import { z } from "zod";

import { ageBandSchema } from "./age-bands.js";
import { avatarIdSchema, profileIdSchema } from "./common.js";

export const createProfileRequestSchema = z.object({
  ageBand: ageBandSchema,
  avatarId: avatarIdSchema
});

export const createProfileResponseSchema = z.object({
  profileId: profileIdSchema
});

export const profileSummarySchema = z.object({
  profileId: profileIdSchema,
  ageBand: ageBandSchema,
  avatarId: avatarIdSchema
});

export const listProfilesResponseSchema = z.object({
  profiles: z.array(profileSummarySchema)
});

export const deleteProfileResponseSchema = z.object({
  deleted: z.literal(true)
});

export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;
export type CreateProfileResponse = z.infer<typeof createProfileResponseSchema>;
export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type ListProfilesResponse = z.infer<typeof listProfilesResponseSchema>;
