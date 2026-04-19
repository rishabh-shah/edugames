import { z } from "zod";

export const ageBandValues = [
  "TODDLER_1_2",
  "PRESCHOOL_3_5",
  "EARLY_PRIMARY_6_8",
  "LATE_PRIMARY_9_10"
] as const;

export const ageBandSchema = z.enum(ageBandValues);

export type AgeBand = z.infer<typeof ageBandSchema>;
