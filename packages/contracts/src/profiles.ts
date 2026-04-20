import { z } from "zod";

import { ageBandSchema } from "./age-bands.js";
import {
  avatarIdSchema,
  isoTimestampSchema,
  personNameSchema,
  profileAgeSchema,
  profileGenderSchema,
  profileIdSchema
} from "./common.js";

export const createProfileRequestSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  age: profileAgeSchema,
  gender: profileGenderSchema
});

export const profileSchema = z.object({
  profileId: profileIdSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  age: profileAgeSchema,
  gender: profileGenderSchema,
  ageBand: ageBandSchema,
  avatarId: avatarIdSchema,
  createdAt: isoTimestampSchema,
  lastActiveAt: isoTimestampSchema
});

export const createProfileResponseSchema = z.object({
  profile: profileSchema
});

export const profileSummarySchema = z.object({
  profileId: profileIdSchema,
  firstName: personNameSchema,
  lastName: personNameSchema,
  age: profileAgeSchema,
  gender: profileGenderSchema,
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
export type Profile = z.infer<typeof profileSchema>;
export type CreateProfileResponse = z.infer<typeof createProfileResponseSchema>;
export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type ListProfilesResponse = z.infer<typeof listProfilesResponseSchema>;
