import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { ReportsService } from "../src/services/reports-service.js";

describe("ReportsService", () => {
  it("creates a report for an owned profile and known game", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
      firstName: "Ava",
      lastName: "Shah",
      age: 5,
      gender: "GIRL",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new ReportsService(repository, {
      now: () => new Date("2026-04-19T18:04:00.000Z")
    });
    const response = service.create("inst_owner01", {
      profileId: "prof_preschool01",
      gameId: "shape-match",
      reason: "bug",
      details: "The round freezes after the first match."
    });

    expect(response.reportId).toMatch(/^rep_/);
    expect(response.status).toBe("open");
    expect(repository.listReports()).toEqual([
      expect.objectContaining({
        profileId: "prof_preschool01",
        gameId: "shape-match",
        reason: "bug"
      })
    ]);
  });

  it("allows reports for disabled games but rejects unknown games", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
      firstName: "Ava",
      lastName: "Shah",
      age: 5,
      gender: "GIRL",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });
    repository.updatePublishedGameStatus(
      "shape-match",
      "disabled",
      "2026-04-19T18:01:00.000Z",
      "Safety escalation"
    );

    const service = new ReportsService(repository, {
      now: () => new Date("2026-04-19T18:04:00.000Z")
    });

    expect(
      service.create("inst_owner01", {
        profileId: "prof_preschool01",
        gameId: "shape-match",
        reason: "safety",
        details: "The game should stay disabled."
      }).status
    ).toBe("open");

    expect(() =>
      service.create("inst_owner01", {
        profileId: "prof_preschool01",
        gameId: "missing-game",
        reason: "other",
        details: null
      })
    ).toThrow(/game not found/i);
  });
});
