import { z } from "zod";

import {
  gameIdSchema,
  gameSlugSchema,
  isoTimestampSchema,
  profileIdSchema,
  reportIdSchema
} from "./common.js";
import { reportReasonSchema } from "./reports.js";

export const gameModerationStatusSchema = z.enum(["queued", "live", "disabled"]);
export const moderationReportStatusSchema = z.enum(["open", "resolved"]);

export const moderationTelemetrySummarySchema = z.object({
  sessionStarts: z.number().int().nonnegative(),
  sessionEnds: z.number().int().nonnegative(),
  milestones: z.number().int().nonnegative(),
  lastEventAt: isoTimestampSchema.nullable()
});

export const moderationGameReviewSchema = z.object({
  gameId: gameIdSchema,
  slug: gameSlugSchema,
  title: z.string().min(1),
  version: z.string().min(1),
  status: gameModerationStatusSchema,
  disabledAt: isoTimestampSchema.nullable(),
  disabledReason: z.string().min(1).nullable(),
  openReportCount: z.number().int().nonnegative(),
  totalReportCount: z.number().int().nonnegative(),
  latestReportAt: isoTimestampSchema.nullable(),
  telemetry: moderationTelemetrySummarySchema
});

export const listModerationGamesResponseSchema = z.object({
  generatedAt: isoTimestampSchema,
  games: z.array(moderationGameReviewSchema)
});

export const moderationReasonRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500)
});

export const createModerationActionResponseSchema = z.object({
  gameId: gameIdSchema,
  status: gameModerationStatusSchema,
  disabledAt: isoTimestampSchema.nullable(),
  disabledReason: z.string().min(1).nullable()
});

export const moderationReportReviewSchema = z.object({
  reportId: reportIdSchema,
  profileId: profileIdSchema,
  gameId: gameIdSchema,
  gameTitle: z.string().min(1),
  reason: reportReasonSchema,
  details: z.string().max(2_000).nullable(),
  status: moderationReportStatusSchema,
  submittedAt: isoTimestampSchema
});

export const listModerationReportsResponseSchema = z.object({
  generatedAt: isoTimestampSchema,
  reports: z.array(moderationReportReviewSchema)
});

export const resolveModerationReportResponseSchema = z.object({
  reportId: reportIdSchema,
  status: moderationReportStatusSchema
});

export type GameModerationStatus = z.infer<typeof gameModerationStatusSchema>;
export type ListModerationGamesResponse = z.infer<
  typeof listModerationGamesResponseSchema
>;
export type ModerationActionResponse = z.infer<
  typeof createModerationActionResponseSchema
>;
export type ListModerationReportsResponse = z.infer<
  typeof listModerationReportsResponseSchema
>;
export type ResolveModerationReportResponse = z.infer<
  typeof resolveModerationReportResponseSchema
>;
