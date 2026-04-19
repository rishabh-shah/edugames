import type {
  RefreshInstallationRequest,
  RefreshInstallationResponse,
  RegisterInstallationRequest,
  RegisterInstallationResponse
} from "@edugames/contracts";

import type { ApiConfig } from "../config.js";
import { createPrefixedId } from "../domain/ids.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken
} from "../domain/tokens.js";
import { ApiError } from "../errors.js";
import {
  type InMemoryPlatformRepository,
  type InstallationRecord
} from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

export class InstallationsService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly config: ApiConfig,
    private readonly clock: Clock
  ) {}

  register(
    payload: RegisterInstallationRequest
  ): RegisterInstallationResponse {
    const now = this.clock.now();
    const installationId = createPrefixedId("inst");
    const sessionId = createPrefixedId("sess");
    const refreshToken = createRefreshToken();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    const cohort = "general";
    const record: InstallationRecord = {
      id: installationId,
      status: "active",
      appVersion: payload.appVersion,
      iosVersion: payload.iosVersion,
      deviceClass: payload.deviceClass,
      locale: payload.locale,
      cohort,
      appAttestStatus: payload.supportsAppAttest ? "eligible" : "unsupported",
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString()
    };

    this.repository.saveInstallation(record);
    this.repository.saveSession({
      id: sessionId,
      installationId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(
        now.getTime() + this.config.refreshTokenTtlSeconds * 1000
      ).toISOString(),
      revokedAt: null,
      createdAt: now.toISOString()
    });

    return {
      installationId,
      accessToken: createAccessToken(
        {
          sub: installationId,
          sid: sessionId,
          cohort
        },
        this.config.jwtSecret,
        nowSeconds,
        this.config.accessTokenTtlSeconds
      ),
      refreshToken,
      cohort,
      features: {
        declaredAgeRangePrompt: false,
        productAnalyticsOptIn: true
      }
    };
  }

  refresh(
    payload: RefreshInstallationRequest
  ): RefreshInstallationResponse {
    const now = this.clock.now();
    const refreshTokenHash = hashRefreshToken(payload.refreshToken);
    const currentSession = this.repository.findActiveSessionByRefreshTokenHash(
      refreshTokenHash,
      now.toISOString()
    );

    if (!currentSession) {
      throw new ApiError(401, "Refresh token is invalid or expired.");
    }

    const installation = this.repository.getInstallation(currentSession.installationId);

    if (!installation || installation.status !== "active") {
      throw new ApiError(403, "Installation is not active.");
    }

    const replacementRefreshToken = createRefreshToken();
    const replacementSessionId = createPrefixedId("sess");

    this.repository.revokeSession(currentSession.id, now.toISOString());
    this.repository.saveSession({
      id: replacementSessionId,
      installationId: installation.id,
      refreshTokenHash: hashRefreshToken(replacementRefreshToken),
      expiresAt: new Date(
        now.getTime() + this.config.refreshTokenTtlSeconds * 1000
      ).toISOString(),
      revokedAt: null,
      createdAt: now.toISOString()
    });
    this.repository.saveInstallation({
      ...installation,
      lastSeenAt: now.toISOString()
    });

    return {
      accessToken: createAccessToken(
        {
          sub: installation.id,
          sid: replacementSessionId,
          cohort: installation.cohort
        },
        this.config.jwtSecret,
        Math.floor(now.getTime() / 1000),
        this.config.accessTokenTtlSeconds
      ),
      refreshToken: replacementRefreshToken
    };
  }
}
