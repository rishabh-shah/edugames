import type { FastifyRequest } from "fastify";

import type { ApiConfig } from "../config.js";
import { ApiError } from "../errors.js";
import type { InMemoryPlatformRepository } from "../repositories/in-memory-platform-repository.js";
import { verifyAccessToken } from "../domain/tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    installationAuth?: {
      installationId: string;
      sessionId: string;
    };
  }
}

export const requireInstallationAuth = (
  request: FastifyRequest,
  repository: InMemoryPlatformRepository,
  config: ApiConfig,
  now: Date
): { installationId: string; sessionId: string } => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing Bearer token.");
  }

  const token = authorization.slice("Bearer ".length);
  const claims = verifyAccessToken(
    token,
    config.jwtSecret,
    Math.floor(now.getTime() / 1000)
  );

  if (!claims) {
    throw new ApiError(401, "Access token is invalid or expired.");
  }

  const installation = repository.getInstallation(claims.sub);

  if (!installation || installation.status !== "active") {
    throw new ApiError(403, "Installation is not active.");
  }

  const session = repository.getSession(claims.sid);

  if (
    !session ||
    session.installationId !== claims.sub ||
    session.revokedAt !== null ||
    session.expiresAt <= now.toISOString()
  ) {
    throw new ApiError(401, "Access token session is invalid or expired.");
  }

  request.installationAuth = {
    installationId: claims.sub,
    sessionId: claims.sid
  };

  return request.installationAuth;
};

export const requireAdminAuth = (
  request: FastifyRequest,
  config: ApiConfig
): true => {
  const adminApiKey = request.headers["x-admin-api-key"];
  const providedApiKey = Array.isArray(adminApiKey) ? adminApiKey[0] : adminApiKey;

  if (!providedApiKey || providedApiKey !== config.adminApiKey) {
    throw new ApiError(401, "Missing or invalid admin API key.");
  }

  return true;
};
