type WorkerGameRecord = {
  gameId: string;
  status: "live" | "disabled";
};

type WorkerReportRecord = {
  id: string;
  gameId?: string;
  status: "open" | "resolved";
  createdAt: string;
};

type WorkerTelemetryEvent = {
  ts: string;
  type: "session_start" | "session_end" | "milestone";
};

type WorkerTelemetryBatchRecord = {
  id: string;
  gameId?: string;
  receivedAt: string;
  events: WorkerTelemetryEvent[];
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getLatestTimestamp = (timestamps: string[]): string | null =>
  timestamps.length === 0
    ? null
    : timestamps.sort((left, right) => left.localeCompare(right)).at(-1) ?? null;

export const buildGameSignalRollups = (input: {
  games: WorkerGameRecord[];
  reports: WorkerReportRecord[];
  telemetryBatches: WorkerTelemetryBatchRecord[];
}) =>
  input.games.map((game) => {
    const reports = input.reports.filter((report) => report.gameId === game.gameId);
    const telemetryEvents = input.telemetryBatches
      .filter((batch) => batch.gameId === game.gameId)
      .flatMap((batch) => batch.events);

    return {
      gameId: game.gameId,
      status: game.status,
      openReportCount: reports.filter((report) => report.status === "open").length,
      totalReportCount: reports.length,
      sessionsStarted: telemetryEvents.filter((event) => event.type === "session_start")
        .length,
      sessionsEnded: telemetryEvents.filter((event) => event.type === "session_end")
        .length,
      milestones: telemetryEvents.filter((event) => event.type === "milestone").length,
      lastSignalAt: getLatestTimestamp([
        ...reports.map((report) => report.createdAt),
        ...telemetryEvents.map((event) => event.ts)
      ])
    };
  });

export const pruneOldGameSignals = (input: {
  now: string;
  reportRetentionDays: number;
  telemetryRetentionDays: number;
  reports: WorkerReportRecord[];
  telemetryBatches: WorkerTelemetryBatchRecord[];
}) => {
  const nowMs = new Date(input.now).getTime();
  const reportCutoffMs = nowMs - input.reportRetentionDays * DAY_IN_MS;
  const telemetryCutoffMs = nowMs - input.telemetryRetentionDays * DAY_IN_MS;

  return {
    reports: input.reports.filter((report) => {
      if (report.status === "open") {
        return true;
      }

      return new Date(report.createdAt).getTime() >= reportCutoffMs;
    }),
    telemetryBatches: input.telemetryBatches.filter(
      (batch) => new Date(batch.receivedAt).getTime() >= telemetryCutoffMs
    )
  };
};
