import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { LaunchSessionsService } from "../src/services/launch-sessions-service.js";

describe("LaunchSessionsService", () => {
  it("creates launch metadata for an eligible profile and game", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new LaunchSessionsService(repository, {
      now: () => new Date("2026-04-19T18:00:00.000Z")
    });

    const response = service.create("inst_owner01", {
      profileId: "prof_preschool01",
      gameId: "shape-match"
    });

    expect(response.gameId).toBe("shape-match");
    expect(response.launchSessionId).toMatch(/^ls_/);
    expect(response.bundle.bundleUrl).toMatch(/shape-match\/1\.0\.0\/bundle\.zip$/);
  });

  it("rejects launch requests when the profile age band is outside the game range", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_lateprimary01",
      installationId: "inst_owner01",
      ageBand: "LATE_PRIMARY_9_10",
      avatarId: "owl-blue",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new LaunchSessionsService(repository, {
      now: () => new Date("2026-04-19T18:00:00.000Z")
    });

    expect(() =>
      service.create("inst_owner01", {
        profileId: "prof_lateprimary01",
        gameId: "shape-match"
      })
    ).toThrow(/age band/i);
  });

  it("rejects launch requests for disabled games", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });
    repository.updatePublishedGameStatus(
      "shape-match",
      "disabled",
      "2026-04-19T18:05:00.000Z",
      "Moderator kill switch"
    );

    const service = new LaunchSessionsService(repository, {
      now: () => new Date("2026-04-19T18:06:00.000Z")
    });

    expect(() =>
      service.create("inst_owner01", {
        profileId: "prof_preschool01",
        gameId: "shape-match"
      })
    ).toThrow(/disabled/i);
  });

  it("rejects launch requests for queued games that are not yet live", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new LaunchSessionsService(repository, {
      now: () => new Date("2026-04-19T18:06:00.000Z")
    });

    expect(() =>
      service.create("inst_owner01", {
        profileId: "prof_preschool01",
        gameId: "counting-kites"
      })
    ).toThrow(/game not found/i);
  });
});
