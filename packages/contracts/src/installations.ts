import { z } from "zod";

import {
  accessTokenSchema,
  cohortSchema,
  installationIdSchema,
  localeSchema,
  opaqueTokenSchema,
  semverSchema
} from "./common.js";

export const installationFeaturesSchema = z.object({
  declaredAgeRangePrompt: z.boolean(),
  productAnalyticsOptIn: z.boolean()
});

export const registerInstallationRequestSchema = z.object({
  appVersion: semverSchema,
  iosVersion: z.string().min(1).max(32),
  deviceClass: z.string().min(1).max(64),
  locale: localeSchema,
  supportsAppAttest: z.boolean()
});

export const registerInstallationResponseSchema = z.object({
  installationId: installationIdSchema,
  accessToken: accessTokenSchema,
  refreshToken: opaqueTokenSchema,
  cohort: cohortSchema,
  features: installationFeaturesSchema
});

export const refreshInstallationRequestSchema = z.object({
  refreshToken: opaqueTokenSchema
});

export const refreshInstallationResponseSchema = z.object({
  accessToken: accessTokenSchema,
  refreshToken: opaqueTokenSchema
});

export type RegisterInstallationRequest = z.infer<
  typeof registerInstallationRequestSchema
>;
export type RegisterInstallationResponse = z.infer<
  typeof registerInstallationResponseSchema
>;
export type RefreshInstallationRequest = z.infer<
  typeof refreshInstallationRequestSchema
>;
export type RefreshInstallationResponse = z.infer<
  typeof refreshInstallationResponseSchema
>;
