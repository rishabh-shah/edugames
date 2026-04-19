import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { Cohort } from "@edugames/contracts";

const toBase64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string): Buffer => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;

  return Buffer.from(`${normalized}${"=".repeat(padLength)}`, "base64");
};

export type InstallationAccessTokenClaims = {
  typ: "installation-access";
  sub: string;
  sid: string;
  cohort: Cohort;
  iat: number;
  exp: number;
};

export const createAccessToken = (
  claims: Omit<InstallationAccessTokenClaims, "typ" | "iat" | "exp">,
  secret: string,
  nowSeconds: number,
  ttlSeconds: number
): string => {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const payload: InstallationAccessTokenClaims = {
    typ: "installation-access",
    ...claims,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
};

export const verifyAccessToken = (
  token: string,
  secret: string,
  nowSeconds: number
): InstallationAccessTokenClaims | null => {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const providedSignature = fromBase64Url(encodedSignature);

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    return null;
  }

  const payload = JSON.parse(
    fromBase64Url(encodedPayload).toString("utf8")
  ) as InstallationAccessTokenClaims;

  if (payload.typ !== "installation-access" || payload.exp <= nowSeconds) {
    return null;
  }

  return payload;
};

export const createRefreshToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashRefreshToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
