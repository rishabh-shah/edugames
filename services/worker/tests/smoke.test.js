import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildGameSignalRollups,
  pruneOldGameSignals,
  workerScaffold
} from "../src/index.ts";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

describe("worker bootstrap", () => {
  it("exposes the standard workspace scripts", () => {
    expect(Object.keys(packageJson.scripts).sort()).toEqual([
      "build",
      "lint",
      "test",
      "typecheck"
    ]);
  });

  it("documents the workspace purpose", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    expect(readme).toMatch(/Purpose:/);
  });

  it("exports scaffold metadata", () => {
    expect(workerScaffold.workspace).toBe("worker");
    expect(workerScaffold.purpose).toMatch(/Background processing/i);
  });

  it("rolls up moderation and telemetry signals per game", () => {
    const rollups = buildGameSignalRollups({
      games: [
        {
          gameId: "shape-match",
          slug: "shape-match",
          title: "Shape Match",
          version: "1.0.0",
          status: "disabled"
        }
      ],
      reports: [
        {
          id: "rep_123abc",
          gameId: "shape-match",
          reason: "safety",
          status: "open",
          createdAt: "2026-04-19T18:01:00.000Z"
        },
        {
          id: "rep_456def",
          gameId: "shape-match",
          reason: "bug",
          status: "resolved",
          createdAt: "2026-04-19T18:02:00.000Z"
        }
      ],
      telemetryBatches: [
        {
          id: "tel_123abc",
          gameId: "shape-match",
          receivedAt: "2026-04-19T18:03:00.000Z",
          events: [
            {
              ts: "2026-04-19T18:03:00.000Z",
              type: "session_start"
            },
            {
              ts: "2026-04-19T18:03:03.000Z",
              type: "milestone",
              name: "first-match",
              value: 1
            },
            {
              ts: "2026-04-19T18:03:10.000Z",
              type: "session_end"
            }
          ]
        }
      ]
    });

    expect(rollups).toEqual([
      {
        gameId: "shape-match",
        status: "disabled",
        openReportCount: 1,
        totalReportCount: 2,
        sessionsStarted: 1,
        sessionsEnded: 1,
        milestones: 1,
        lastSignalAt: "2026-04-19T18:03:10.000Z"
      }
    ]);
  });

  it("prunes resolved reports and stale telemetry batches beyond retention", () => {
    const pruned = pruneOldGameSignals({
      now: "2026-04-19T18:30:00.000Z",
      reportRetentionDays: 1,
      telemetryRetentionDays: 1,
      reports: [
        {
          id: "rep_keep01",
          status: "open",
          createdAt: "2026-04-19T17:30:00.000Z"
        },
        {
          id: "rep_drop01",
          status: "resolved",
          createdAt: "2026-04-17T18:29:59.000Z"
        }
      ],
      telemetryBatches: [
        {
          id: "tel_keep01",
          receivedAt: "2026-04-19T18:00:00.000Z",
          events: []
        },
        {
          id: "tel_drop01",
          receivedAt: "2026-04-17T18:00:00.000Z",
          events: []
        }
      ]
    });

    expect(pruned.reports).toEqual([
      expect.objectContaining({
        id: "rep_keep01"
      })
    ]);
    expect(pruned.telemetryBatches).toEqual([
      expect.objectContaining({
        id: "tel_keep01"
      })
    ]);
  });
});
