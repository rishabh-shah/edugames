import type {
  CreateReportRequest,
  CreateReportResponse
} from "@edugames/contracts";

import { createPrefixedId } from "../domain/ids.js";
import { ApiError } from "../errors.js";
import type { InMemoryPlatformRepository } from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

export class ReportsService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  create(
    installationId: string,
    payload: CreateReportRequest
  ): CreateReportResponse {
    const profile = this.repository.getProfile(payload.profileId);

    if (!profile || profile.installationId !== installationId) {
      throw new ApiError(404, "Profile not found.");
    }

    const game = this.repository.getPublishedGameRecord(payload.gameId);

    if (!game) {
      throw new ApiError(404, "Game not found.");
    }

    const reportId = createPrefixedId("rep");

    this.repository.saveReport({
      id: reportId,
      installationId,
      profileId: payload.profileId,
      gameId: payload.gameId,
      reason: payload.reason,
      details: payload.details,
      status: "open",
      createdAt: this.clock.now().toISOString()
    });

    return {
      reportId,
      status: "open"
    };
  }
}
