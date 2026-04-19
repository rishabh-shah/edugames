import type {
  ListModerationGamesResponse,
  ListModerationReportsResponse
} from "@edugames/contracts";

export type DashboardTelemetryHighlight = {
  label: string;
  value: string;
  detail: string;
};

export type AdminDashboardData = {
  games: ListModerationGamesResponse["games"];
  reports: ListModerationReportsResponse["reports"];
  telemetryHighlights: DashboardTelemetryHighlight[];
  errorMessage?: string;
};

const defaultApiBaseUrl = "http://127.0.0.1:3000";
const defaultAdminApiKey = "edugames-admin-dev-key";

const getAdminConfig = () => ({
  apiBaseUrl: process.env.EDUGAMES_API_BASE_URL ?? defaultApiBaseUrl,
  adminApiKey: process.env.EDUGAMES_ADMIN_API_KEY ?? defaultAdminApiKey
});

const parseJson = async <ResponseBody>(
  response: Response
): Promise<ResponseBody> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Admin API request failed with ${response.status}: ${message || "Unknown error"}`
    );
  }

  return (await response.json()) as ResponseBody;
};

const adminFetch = async <ResponseBody>(
  path: string,
  init?: RequestInit
): Promise<ResponseBody> => {
  const { apiBaseUrl, adminApiKey } = getAdminConfig();

  return parseJson<ResponseBody>(
    await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-admin-api-key": adminApiKey,
        ...(init?.headers ?? {})
      }
    })
  );
};

export const buildTelemetryHighlights = (
  games: ListModerationGamesResponse["games"],
  reports: ListModerationReportsResponse["reports"]
): DashboardTelemetryHighlight[] => {
  const totalSessionStarts = games.reduce(
    (count, game) => count + game.telemetry.sessionStarts,
    0
  );
  const totalMilestones = games.reduce(
    (count, game) => count + game.telemetry.milestones,
    0
  );
  const openReports = reports.filter((report) => report.status === "open").length;

  return [
    {
      label: "Session starts",
      value: String(totalSessionStarts),
      detail: "Captured from uploaded runtime telemetry batches."
    },
    {
      label: "Milestones",
      value: String(totalMilestones),
      detail: "Allowed gameplay milestones recorded across live sessions."
    },
    {
      label: "Open reports",
      value: String(openReports),
      detail: "Fresh family reports still waiting for moderation review."
    }
  ];
};

export const loadAdminDashboardData = async (): Promise<AdminDashboardData> => {
  try {
    const [gamesResponse, reportsResponse] = await Promise.all([
      adminFetch<ListModerationGamesResponse>("/v1/admin/games"),
      adminFetch<ListModerationReportsResponse>("/v1/admin/reports")
    ]);

    return {
      games: gamesResponse.games,
      reports: reportsResponse.reports,
      telemetryHighlights: buildTelemetryHighlights(
        gamesResponse.games,
        reportsResponse.reports
      )
    };
  } catch (error) {
    return {
      games: [],
      reports: [],
      telemetryHighlights: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "The admin dashboard could not reach the local EduGames API."
    };
  }
};

export const postApproveGame = async (gameId: string) =>
  adminFetch(`/v1/admin/games/${gameId}/approve`, {
    method: "POST"
  });

export const postDisableGame = async (gameId: string, reason: string) =>
  adminFetch(`/v1/admin/games/${gameId}/disable`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });

export const postEnableGame = async (gameId: string) =>
  adminFetch(`/v1/admin/games/${gameId}/enable`, {
    method: "POST"
  });

export const postResolveReport = async (reportId: string) =>
  adminFetch(`/v1/admin/reports/${reportId}/resolve`, {
    method: "POST"
  });

export const adminDashboardFixtures: AdminDashboardData = {
  games: [
    {
      gameId: "counting-kites",
      slug: "counting-kites",
      title: "Counting Kites",
      version: "0.1.0",
      status: "queued",
      disabledAt: null,
      disabledReason: null,
      openReportCount: 0,
      totalReportCount: 0,
      latestReportAt: null,
      telemetry: {
        sessionStarts: 0,
        sessionEnds: 0,
        milestones: 0,
        lastEventAt: null
      }
    },
    {
      gameId: "shape-match",
      slug: "shape-match",
      title: "Shape Match",
      version: "1.0.0",
      status: "live",
      disabledAt: null,
      disabledReason: null,
      openReportCount: 1,
      totalReportCount: 1,
      latestReportAt: "2026-04-19T18:03:00Z",
      telemetry: {
        sessionStarts: 6,
        sessionEnds: 5,
        milestones: 12,
        lastEventAt: "2026-04-19T18:05:00Z"
      }
    },
    {
      gameId: "letter-river",
      slug: "letter-river",
      title: "Letter River",
      version: "0.3.0",
      status: "disabled",
      disabledAt: "2026-04-19T18:00:00Z",
      disabledReason: "Safety escalation",
      openReportCount: 2,
      totalReportCount: 3,
      latestReportAt: "2026-04-19T18:04:00Z",
      telemetry: {
        sessionStarts: 2,
        sessionEnds: 1,
        milestones: 3,
        lastEventAt: "2026-04-19T17:58:00Z"
      }
    }
  ],
  reports: [
    {
      reportId: "rep_123abc",
      profileId: "prof_fixture_01",
      gameId: "shape-match",
      gameTitle: "Shape Match",
      reason: "bug",
      details: "The round froze after the first match.",
      status: "open",
      submittedAt: "2026-04-19T18:03:00Z"
    }
  ],
  telemetryHighlights: buildTelemetryHighlights(
    [
      {
        gameId: "shape-match",
        slug: "shape-match",
        title: "Shape Match",
        version: "1.0.0",
        status: "live",
        disabledAt: null,
        disabledReason: null,
        openReportCount: 1,
        totalReportCount: 1,
        latestReportAt: "2026-04-19T18:03:00Z",
        telemetry: {
          sessionStarts: 6,
          sessionEnds: 5,
          milestones: 12,
          lastEventAt: "2026-04-19T18:05:00Z"
        }
      }
    ],
    [
      {
        reportId: "rep_123abc",
        profileId: "prof_fixture_01",
        gameId: "shape-match",
        gameTitle: "Shape Match",
        reason: "bug",
        details: "The round froze after the first match.",
        status: "open",
        submittedAt: "2026-04-19T18:03:00Z"
      }
    ]
  )
};
