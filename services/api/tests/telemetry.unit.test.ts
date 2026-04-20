import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { TelemetryService } from "../src/services/telemetry-service.js";

describe("TelemetryService", () => {
  it("stores a telemetry batch for an owned launch session", () => {
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
    repository.saveLaunchSession({
      id: "ls_123abc",
      installationId: "inst_owner01",
      profileId: "prof_preschool01",
      gameId: "shape-match",
      version: "1.0.0",
      createdAt: "2026-04-19T18:00:00.000Z",
      expiresAt: "2026-04-19T18:15:00.000Z"
    });

    const service = new TelemetryService(repository, {
      now: () => new Date("2026-04-19T18:03:00.000Z")
    });
    const response = service.ingest("inst_owner01", {
      profileId: "prof_preschool01",
      launchSessionId: "ls_123abc",
      schemaVersion: 1,
      events: [
        {
          ts: "2026-04-19T18:00:00.000Z",
          type: "session_start"
        },
        {
          ts: "2026-04-19T18:00:01.000Z",
          type: "milestone",
          name: "first-match",
          value: 1
        }
      ]
    });

    expect(response).toEqual({ accepted: 2 });
    expect(repository.listTelemetryBatches()).toEqual([
      expect.objectContaining({
        launchSessionId: "ls_123abc",
        gameId: "shape-match",
        schemaVersion: 1
      })
    ]);
  });

  it("rejects telemetry for mismatched launch sessions and unknown milestones", () => {
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
    repository.saveLaunchSession({
      id: "ls_123abc",
      installationId: "inst_owner01",
      profileId: "prof_preschool01",
      gameId: "shape-match",
      version: "1.0.0",
      createdAt: "2026-04-19T18:00:00.000Z",
      expiresAt: "2026-04-19T18:15:00.000Z"
    });

    const service = new TelemetryService(repository, {
      now: () => new Date("2026-04-19T18:03:00.000Z")
    });

    expect(() =>
      service.ingest("inst_owner01", {
        profileId: "prof_other01",
        launchSessionId: "ls_123abc",
        schemaVersion: 1,
        events: [
          {
            ts: "2026-04-19T18:00:00.000Z",
            type: "session_start"
          }
        ]
      })
    ).toThrow(/launch session/i);

    expect(() =>
      service.ingest("inst_owner01", {
        profileId: "prof_preschool01",
        launchSessionId: "ls_123abc",
        schemaVersion: 1,
        events: [
          {
            ts: "2026-04-19T18:00:01.000Z",
            type: "milestone",
            name: "unauthorized",
            value: 1
          }
        ]
      })
    ).toThrow(/telemetry/i);
  });
});
