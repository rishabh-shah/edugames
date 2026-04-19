import { z } from "zod";

import { gameIdSchema, profileIdSchema, reportIdSchema } from "./common.js";

export const reportReasonSchema = z.enum(["bug", "safety", "content", "other"]);

export const createReportRequestSchema = z.object({
  profileId: profileIdSchema,
  gameId: gameIdSchema,
  reason: reportReasonSchema,
  details: z.string().max(2000).nullable()
});

export const createReportResponseSchema = z.object({
  reportId: reportIdSchema,
  status: z.literal("open")
});

export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
