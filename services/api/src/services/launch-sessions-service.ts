import {
  ageBandOrder,
  type LaunchSessionRequest,
  type LaunchSessionResponse
} from "@edugames/contracts";

import { createPrefixedId } from "../domain/ids.js";
import { ApiError } from "../errors.js";
import type {
  InMemoryPlatformRepository,
  ProfileRecord,
  PublishedGameRecord
} from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

const LAUNCH_SESSION_TTL_SECONDS = 15 * 60;
const CATALOG_REVALIDATE_AFTER_SECONDS = 24 * 60 * 60;

const isAgeBandWithinRange = (
  profileAgeBand: ProfileRecord["ageBand"],
  minAgeBand: PublishedGameRecord["minAgeBand"],
  _maxAgeBand: PublishedGameRecord["maxAgeBand"]
): boolean => ageBandOrder[profileAgeBand] >= ageBandOrder[minAgeBand];

export class LaunchSessionsService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  create(
    installationId: string,
    payload: LaunchSessionRequest
  ): LaunchSessionResponse {
    const profile = this.getOwnedProfile(installationId, payload.profileId);
    const cohort = this.repository.getInstallation(installationId)?.cohort ?? "general";
    const game = this.repository.getPublishedGameRecord(payload.gameId);

    if (!game) {
      throw new ApiError(404, "Game not found.");
    }

    if (game.cohort !== cohort) {
      throw new ApiError(404, "Game not found.");
    }

    if (game.status === "queued") {
      throw new ApiError(404, "Game not found.");
    }

    if (game.status === "disabled") {
      throw new ApiError(403, "Game is disabled.");
    }

    if (!isAgeBandWithinRange(profile.ageBand, game.minAgeBand, game.maxAgeBand)) {
      throw new ApiError(403, "Profile age band is not allowed for this game.");
    }

    const now = this.clock.now();
    const launchSessionId = createPrefixedId("ls");

    this.repository.saveLaunchSession({
      id: launchSessionId,
      installationId,
      profileId: profile.id,
      gameId: game.gameId,
      version: game.version,
      createdAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + LAUNCH_SESSION_TTL_SECONDS * 1000
      ).toISOString()
    });

    return {
      launchSessionId,
      gameId: game.gameId,
      version: game.version,
      bundle: {
        bundleUrl: game.bundleUrl,
        sha256: game.sha256,
        compressedSizeBytes: game.compressedSizeBytes
      },
      manifest: {
        entrypoint: game.entrypoint,
        minAgeBand: game.minAgeBand,
        maxAgeBand: game.maxAgeBand,
        allowedEvents: game.allowedEvents
      },
      cachePolicy: {
        revalidateAfterSeconds: CATALOG_REVALIDATE_AFTER_SECONDS
      }
    };
  }

  private getOwnedProfile(installationId: string, profileId: string): ProfileRecord {
    const profile = this.repository.getProfile(profileId);

    if (!profile || profile.installationId !== installationId) {
      throw new ApiError(404, "Profile not found.");
    }

    return profile;
  }
}
