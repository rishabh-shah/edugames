import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { ModerationService } from "../src/services/moderation-service.js";

describe("ModerationService", () => {
  it("lists games for review with report and telemetry signal summaries", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveReport({
      id: "rep_123abc",
      installationId: "inst_owner01",
      profileId: "prof_preschool01",
      gameId: "shape-match",
      reason: "safety",
      details: "Unexpected chat prompt shown.",
      status: "open",
      createdAt: "2026-04-19T18:01:00.000Z"
    });
    repository.saveTelemetryBatch({
      id: "tel_123abc",
      installationId: "inst_owner01",
      profileId: "prof_preschool01",
      launchSessionId: "ls_123abc",
      gameId: "shape-match",
      schemaVersion: 1,
      receivedAt: "2026-04-19T18:03:00.000Z",
      events: [
        {
          ts: "2026-04-19T18:02:00.000Z",
          type: "session_start"
        },
        {
          ts: "2026-04-19T18:02:03.000Z",
          type: "milestone",
          name: "first-match",
          value: 1
        }
      ]
    });

    const service = new ModerationService(repository, {
      now: () => new Date("2026-04-19T18:05:00.000Z")
    });
    const response = service.listGamesForReview();

    expect(response.games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gameId: "shape-match",
          status: "live",
          openReportCount: 1,
          totalReportCount: 1,
          latestReportAt: "2026-04-19T18:01:00.000Z",
          telemetry: {
            sessionStarts: 1,
            sessionEnds: 0,
            milestones: 1,
            lastEventAt: "2026-04-19T18:02:03.000Z"
          }
        }),
        expect.objectContaining({
          gameId: "counting-kites",
          status: "queued"
        })
      ])
    );
  });

  it("approves queued games, disables live ones, and resolves reports", () => {
    const repository = new InMemoryPlatformRepository();
    repository.saveReport({
      id: "rep_123abc",
      installationId: "inst_owner01",
      profileId: "prof_preschool01",
      gameId: "shape-match",
      reason: "safety",
      details: "Unexpected chat prompt shown.",
      status: "open",
      createdAt: "2026-04-19T18:01:00.000Z"
    });
    const service = new ModerationService(repository, {
      now: () => new Date("2026-04-19T18:05:00.000Z")
    });

    const approved = service.approveGame("counting-kites");
    const disabled = service.disableGame("shape-match", "Safety escalation");
    const enabled = service.enableGame("shape-match");
    const reports = service.listReportsForReview();
    const resolved = service.resolveReport("rep_123abc");

    expect(approved).toEqual({
      gameId: "counting-kites",
      status: "live",
      disabledAt: null,
      disabledReason: null
    });
    expect(disabled).toEqual({
      gameId: "shape-match",
      status: "disabled",
      disabledAt: "2026-04-19T18:05:00.000Z",
      disabledReason: "Safety escalation"
    });
    expect(enabled).toEqual({
      gameId: "shape-match",
      status: "live",
      disabledAt: null,
      disabledReason: null
    });
    expect(reports.reports).toEqual([
      expect.objectContaining({
        reportId: "rep_123abc",
        gameId: "shape-match",
        gameTitle: "Shape Match",
        status: "open"
      })
    ]);
    expect(resolved).toEqual({
      reportId: "rep_123abc",
      status: "resolved"
    });
  });
});
