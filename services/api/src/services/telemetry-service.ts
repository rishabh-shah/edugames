import type {
  TelemetryBatchRequest,
  TelemetryBatchResponse
} from "@edugames/contracts";

import { createPrefixedId } from "../domain/ids.js";
import { ApiError } from "../errors.js";
import type { InMemoryPlatformRepository } from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

export class TelemetryService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  ingest(
    installationId: string,
    payload: TelemetryBatchRequest
  ): TelemetryBatchResponse {
    const launchSession = this.repository.getLaunchSession(payload.launchSessionId);

    if (
      !launchSession ||
      launchSession.installationId !== installationId ||
      launchSession.profileId !== payload.profileId
    ) {
      throw new ApiError(404, "Launch session not found.");
    }

    const game = this.repository.getPublishedGameRecord(launchSession.gameId);

    if (!game) {
      throw new ApiError(404, "Game not found.");
    }

    for (const event of payload.events) {
      if (
        event.type === "milestone" &&
        !game.allowedEvents.includes(`milestone:${event.name}`)
      ) {
        throw new ApiError(400, "Telemetry event is not allowed for this game.");
      }
    }

    this.repository.saveTelemetryBatch({
      id: createPrefixedId("tel"),
      installationId,
      profileId: payload.profileId,
      launchSessionId: payload.launchSessionId,
      gameId: launchSession.gameId,
      schemaVersion: payload.schemaVersion,
      receivedAt: this.clock.now().toISOString(),
      events: payload.events
    });

    return {
      accepted: payload.events.length
    };
  }
}
