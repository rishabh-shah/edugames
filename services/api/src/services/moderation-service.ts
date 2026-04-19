import type {
  ListModerationGamesResponse,
  ListModerationReportsResponse,
  ModerationActionResponse,
  ResolveModerationReportResponse,
  TelemetryEvent
} from "@edugames/contracts";

import { ApiError } from "../errors.js";
import type {
  InMemoryPlatformRepository,
  PublishedGameRecord
} from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

const getLatestIsoTimestamp = (values: Array<string | null | undefined>): string | null => {
  const filteredValues = values.filter((value): value is string => Boolean(value));

  if (filteredValues.length === 0) {
    return null;
  }

  return filteredValues.sort((left, right) => left.localeCompare(right)).at(-1) ?? null;
};

const summarizeTelemetry = (events: TelemetryEvent[]) => ({
  sessionStarts: events.filter((event) => event.type === "session_start").length,
  sessionEnds: events.filter((event) => event.type === "session_end").length,
  milestones: events.filter((event) => event.type === "milestone").length,
  lastEventAt: getLatestIsoTimestamp(events.map((event) => event.ts))
});

const toModerationActionResponse = (
  game: PublishedGameRecord
): ModerationActionResponse => ({
  gameId: game.gameId,
  status: game.status,
  disabledAt: game.disabledAt,
  disabledReason: game.disabledReason
});

export class ModerationService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  listGamesForReview(): ListModerationGamesResponse {
    const reports = this.repository.listReports();
    const telemetryBatches = this.repository.listTelemetryBatches();

    return {
      generatedAt: this.clock.now().toISOString(),
      games: this.repository.listPublishedGames().map((game) => {
        const gameReports = reports.filter((report) => report.gameId === game.gameId);
        const gameTelemetryEvents = telemetryBatches
          .filter((batch) => batch.gameId === game.gameId)
          .flatMap((batch) => batch.events);

        return {
          gameId: game.gameId,
          slug: game.slug,
          title: game.title,
          version: game.version,
          status: game.status,
          disabledAt: game.disabledAt,
          disabledReason: game.disabledReason,
          openReportCount: gameReports.filter((report) => report.status === "open").length,
          totalReportCount: gameReports.length,
          latestReportAt: getLatestIsoTimestamp(
            gameReports.map((report) => report.createdAt)
          ),
          telemetry: summarizeTelemetry(gameTelemetryEvents)
        };
      })
    };
  }

  listReportsForReview(): ListModerationReportsResponse {
    return {
      generatedAt: this.clock.now().toISOString(),
      reports: this.repository.listReports().flatMap((report) => {
        const game = this.repository.getPublishedGameRecord(report.gameId);

        if (!game) {
          return [];
        }

        return [
          {
            reportId: report.id,
            profileId: report.profileId,
            gameId: report.gameId,
            gameTitle: game.title,
            reason: report.reason,
            details: report.details,
            status: report.status,
            submittedAt: report.createdAt
          }
        ];
      })
    };
  }

  disableGame(gameId: string, reason: string): ModerationActionResponse {
    const updatedGame = this.repository.updatePublishedGameStatus(
      gameId,
      "disabled",
      this.clock.now().toISOString(),
      reason
    );

    if (!updatedGame) {
      throw new ApiError(404, "Game not found.");
    }

    return toModerationActionResponse(updatedGame);
  }

  approveGame(gameId: string): ModerationActionResponse {
    const updatedGame = this.repository.updatePublishedGameStatus(
      gameId,
      "live",
      this.clock.now().toISOString(),
      null
    );

    if (!updatedGame) {
      throw new ApiError(404, "Game not found.");
    }

    return toModerationActionResponse(updatedGame);
  }

  enableGame(gameId: string): ModerationActionResponse {
    const updatedGame = this.repository.updatePublishedGameStatus(
      gameId,
      "live",
      this.clock.now().toISOString(),
      null
    );

    if (!updatedGame) {
      throw new ApiError(404, "Game not found.");
    }

    return toModerationActionResponse(updatedGame);
  }

  resolveReport(reportId: string): ResolveModerationReportResponse {
    const updatedReport = this.repository.updateReportStatus(reportId, "resolved");

    if (!updatedReport) {
      throw new ApiError(404, "Report not found.");
    }

    return {
      reportId: updatedReport.id,
      status: updatedReport.status
    };
  }
}
