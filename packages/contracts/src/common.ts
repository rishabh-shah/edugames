import { z } from "zod";

export const cohortValues = ["internal", "beta", "general"] as const;
export const appAttestStatusValues = [
  "disabled",
  "eligible",
  "enrolled",
  "unsupported"
] as const;

export const cohortSchema = z.enum(cohortValues);
export const appAttestStatusSchema = z.enum(appAttestStatusValues);

export const isoTimestampSchema = z.string().min(1);
export const semverSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/, "Expected a semver string");

export const installationIdSchema = z
  .string()
  .regex(/^inst_[a-z0-9]{6,}$/i, "Expected installation id prefixed with inst_");

export const profileIdSchema = z
  .string()
  .regex(/^prof_[a-z0-9]{6,}$/i, "Expected profile id prefixed with prof_");

export const launchSessionIdSchema = z
  .string()
  .regex(/^ls_[a-z0-9]{6,}$/i, "Expected launch session id prefixed with ls_");

export const reportIdSchema = z
  .string()
  .regex(/^rep_[a-z0-9]{6,}$/i, "Expected report id prefixed with rep_");

export const avatarIdSchema = z.string().min(1).max(64);
export const localeSchema = z.string().min(2).max(32);
export const gameSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Expected kebab-case slug");
export const gameIdSchema = gameSlugSchema;
export const localBundlePathSchema = z.string().min(1).refine(
  (value) => {
    if (value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:/.test(value)) {
      return false;
    }

    const segments = value.split(/[\\/]/);

    return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
  },
  "Expected a normalized relative bundle path."
);
export const runtimeSchema = z.enum(["html5"]);
export const orientationSchema = z.enum(["landscape"]);
export const sha256ChecksumSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 checksum.");

export const opaqueTokenSchema = z.string().min(32).max(512);
export const accessTokenSchema = z.string().min(32).max(2048);

export const contentFlagsSchema = z.object({
  externalLinks: z.boolean(),
  ugc: z.boolean(),
  chat: z.boolean(),
  ads: z.boolean(),
  purchases: z.boolean()
});

export type Cohort = z.infer<typeof cohortSchema>;
