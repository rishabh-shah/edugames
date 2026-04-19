import { randomBytes } from "node:crypto";

export const createPrefixedId = (prefix: string): string =>
  `${prefix}_${randomBytes(8).toString("hex")}`;
