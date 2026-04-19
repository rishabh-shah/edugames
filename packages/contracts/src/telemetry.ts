import { z } from "zod";

import {
  isoTimestampSchema,
  launchSessionIdSchema,
  profileIdSchema
} from "./common.js";

export const telemetryEventSchema = z.discriminatedUnion("type", [
  z.object({
    ts: isoTimestampSchema,
    type: z.literal("session_start")
  }),
  z.object({
    ts: isoTimestampSchema,
    type: z.literal("session_end")
  }),
  z.object({
    ts: isoTimestampSchema,
    type: z.literal("milestone"),
    name: z.string().min(1),
    value: z.number()
  })
]);

export const telemetryBatchRequestSchema = z.object({
  profileId: profileIdSchema,
  launchSessionId: launchSessionIdSchema,
  schemaVersion: z.number().int().positive(),
  events: z.array(telemetryEventSchema).min(1)
});

export const telemetryBatchResponseSchema = z.object({
  accepted: z.number().int().nonnegative()
});

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type TelemetryBatchRequest = z.infer<typeof telemetryBatchRequestSchema>;
export type TelemetryBatchResponse = z.infer<typeof telemetryBatchResponseSchema>;
