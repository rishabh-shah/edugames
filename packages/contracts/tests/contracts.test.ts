import { describe, expect, it } from "vitest";

import {
  ageBandSchema,
  createModerationActionResponseSchema,
  createOpenApiDocument,
  createProfileRequestSchema,
  createProfileResponseSchema,
  createReportRequestSchema,
  listModerationGamesResponseSchema,
  listModerationReportsResponseSchema,
  gameManifestSchema,
  launchSessionResponseSchema,
  registerInstallationRequestSchema,
  resolveModerationReportResponseSchema,
  telemetryBatchRequestSchema,
  telemetryEventSchema
} from "../src/index.js";

describe("contracts package", () => {
  it("accepts the supported age bands", () => {
    expect(ageBandSchema.parse("PRESCHOOL_3_5")).toBe("PRESCHOOL_3_5");
    expect(() => ageBandSchema.parse("MIDDLE_SCHOOL")).toThrow();
  });

  it("validates installation registration payloads", () => {
    const parsed = registerInstallationRequestSchema.parse({
      appVersion: "1.0.0",
      iosVersion: "26.4",
      deviceClass: "iPad14,3",
      locale: "en-US",
      supportsAppAttest: true
    });

    expect(parsed.deviceClass).toBe("iPad14,3");
    expect(() =>
      registerInstallationRequestSchema.parse({
        appVersion: "v1",
        iosVersion: "26.4",
        deviceClass: "iPad14,3",
        locale: "en-US",
        supportsAppAttest: true
      })
    ).toThrow(/semver/i);
  });

  it("validates profile creation payloads with child identity fields", () => {
    const request = createProfileRequestSchema.parse({
      firstName: "Ava",
      lastName: "Shah",
      age: 5,
      gender: "GIRL"
    });
    const response = createProfileResponseSchema.parse({
      profile: {
        profileId: "prof_123abc",
        firstName: "Ava",
        lastName: "Shah",
        age: 5,
        gender: "GIRL",
        ageBand: "PRESCHOOL_3_5",
        avatarId: "starlight-otter",
        createdAt: "2026-04-19T18:00:00Z",
        lastActiveAt: "2026-04-19T18:00:00Z"
      }
    });

    expect(request.gender).toBe("GIRL");
    expect(response.profile.firstName).toBe("Ava");
    expect(() =>
      createProfileRequestSchema.parse({
        firstName: "Ava",
        lastName: "Shah",
        age: 11,
        gender: "GIRL"
      })
    ).toThrow();
  });

  it("parses launch responses and telemetry events", () => {
    const launchResponse = launchSessionResponseSchema.parse({
      launchSessionId: "ls_123abc",
      gameId: "shape-match",
      version: "1.0.0",
      bundle: {
        bundleUrl: "https://cdn.example/games/shape-match/1.0.0/bundle.zip",
        sha256: "a".repeat(64),
        compressedSizeBytes: 4812031
      },
      manifest: {
        entrypoint: "index.html",
        minAgeBand: "PRESCHOOL_3_5",
        maxAgeBand: "PRESCHOOL_3_5",
        allowedEvents: ["milestone:first-match"]
      },
      cachePolicy: {
        revalidateAfterSeconds: 86400
      }
    });

    const milestoneEvent = telemetryEventSchema.parse({
      ts: "2026-04-19T18:00:10Z",
      type: "milestone",
      name: "first-match",
      value: 1
    });

    expect(launchResponse.manifest.entrypoint).toBe("index.html");
    expect(milestoneEvent.type).toBe("milestone");
  });

  it("validates report submission, telemetry batches, and moderation review payloads", () => {
    const report = createReportRequestSchema.parse({
      profileId: "prof_123abc",
      gameId: "shape-match",
      reason: "safety",
      details: "Unexpected free-form input is shown."
    });
    const telemetryBatch = telemetryBatchRequestSchema.parse({
      profileId: "prof_123abc",
      launchSessionId: "ls_123abc",
      schemaVersion: 1,
      events: [
        {
          ts: "2026-04-19T18:00:00Z",
          type: "session_start"
        },
        {
          ts: "2026-04-19T18:00:02Z",
          type: "milestone",
          name: "first-match",
          value: 1
        }
      ]
    });
    const moderationListing = listModerationGamesResponseSchema.parse({
      generatedAt: "2026-04-19T18:00:00Z",
      games: [
        {
          gameId: "shape-match",
          slug: "shape-match",
          title: "Shape Match",
          version: "1.0.0",
          status: "disabled",
          disabledAt: "2026-04-19T18:00:00Z",
          disabledReason: "Safety escalation",
          openReportCount: 2,
          totalReportCount: 3,
          latestReportAt: "2026-04-19T18:01:00Z",
          telemetry: {
            sessionStarts: 4,
            sessionEnds: 3,
            milestones: 8,
            lastEventAt: "2026-04-19T18:02:00Z"
          }
        }
      ]
    });
    const moderationAction = createModerationActionResponseSchema.parse({
      gameId: "shape-match",
      status: "queued",
      disabledAt: null,
      disabledReason: null
    });
    const moderationReports = listModerationReportsResponseSchema.parse({
      generatedAt: "2026-04-19T18:04:00Z",
      reports: [
        {
          reportId: "rep_123abc",
          profileId: "prof_123abc",
          gameId: "shape-match",
          gameTitle: "Shape Match",
          reason: "bug",
          details: "The round froze after the first match.",
          status: "open",
          submittedAt: "2026-04-19T18:03:00Z"
        }
      ]
    });
    const resolveReport = resolveModerationReportResponseSchema.parse({
      reportId: "rep_123abc",
      status: "resolved"
    });

    expect(report.reason).toBe("safety");
    expect(telemetryBatch.events).toHaveLength(2);
    expect(moderationListing.games[0]?.telemetry.sessionStarts).toBe(4);
    expect(moderationAction.status).toBe("queued");
    expect(moderationReports.reports[0]?.gameTitle).toBe("Shape Match");
    expect(resolveReport.status).toBe("resolved");
  });

  it("validates the game manifest contract", () => {
    const manifest = gameManifestSchema.parse({
      schemaVersion: 1,
      gameId: "shape-match",
      slug: "shape-match",
      title: "Shape Match",
      summary: "Match circles, squares, and triangles.",
      description: "A simple recognition game for preschoolers.",
      version: "1.0.0",
      runtime: "html5",
      entrypoint: "index.html",
      orientation: "landscape",
      defaultLocale: "en-US",
      supportedLocales: ["en-US"],
      minAgeBand: "PRESCHOOL_3_5",
      maxAgeBand: "EARLY_PRIMARY_6_8",
      categories: ["shapes", "visual-recognition"],
      offlineReady: true,
      compressedSizeBytes: 4812031,
      sha256: "a".repeat(64),
      iconPath: "assets/icon.svg",
      screenshotPaths: ["assets/ss-1.svg"],
      contentFlags: {
        externalLinks: false,
        ugc: false,
        chat: false,
        ads: false,
        purchases: false
      },
      telemetry: {
        allowedEvents: ["milestone:first-match"]
      },
      capabilities: ["saveState", "events", "audio"],
      assetLicenseDeclaration: {
        code: "MIT",
        art: "Original",
        audio: "Not used",
        fonts: "Not used"
      }
    });

    expect(manifest.slug).toBe("shape-match");
    expect(manifest.telemetry.allowedEvents).toContain("milestone:first-match");
  });

  it("rejects inverted age-band ranges in manifests and launch payloads", () => {
    expect(() =>
      gameManifestSchema.parse({
        schemaVersion: 1,
        gameId: "shape-match",
        slug: "shape-match",
        title: "Shape Match",
        summary: "Match circles, squares, and triangles.",
        description: "A simple recognition game for preschoolers.",
        version: "1.0.0",
        runtime: "html5",
        entrypoint: "index.html",
        orientation: "landscape",
        defaultLocale: "en-US",
        supportedLocales: ["en-US"],
        minAgeBand: "LATE_PRIMARY_9_10",
        maxAgeBand: "PRESCHOOL_3_5",
        categories: ["shapes"],
        offlineReady: true,
        compressedSizeBytes: 4812031,
        sha256: "a".repeat(64),
        iconPath: "assets/icon.svg",
        screenshotPaths: ["assets/ss-1.svg"],
        contentFlags: {
          externalLinks: false,
          ugc: false,
          chat: false,
          ads: false,
          purchases: false
        },
        telemetry: {
          allowedEvents: ["milestone:first-match"]
        },
        capabilities: ["saveState", "events"],
        assetLicenseDeclaration: {
          code: "MIT",
          art: "Original",
          audio: "Not used",
          fonts: "Not used"
        }
      })
    ).toThrow(/minAgeBand/i);

    expect(() =>
      launchSessionResponseSchema.parse({
        launchSessionId: "ls_123abc",
        gameId: "shape-match",
        version: "1.0.0",
        bundle: {
          bundleUrl: "https://cdn.example/games/shape-match/1.0.0/bundle.zip",
          sha256: "a".repeat(64),
          compressedSizeBytes: 4812031
        },
        manifest: {
          entrypoint: "index.html",
          minAgeBand: "LATE_PRIMARY_9_10",
          maxAgeBand: "PRESCHOOL_3_5",
          allowedEvents: ["milestone:first-match"]
        },
        cachePolicy: {
          revalidateAfterSeconds: 86400
        }
      })
    ).toThrow(/minAgeBand/i);
  });

  it("rejects manifest locale drift and mismatched ids", () => {
    expect(() =>
      gameManifestSchema.parse({
        schemaVersion: 1,
        gameId: "shape-match-v2",
        slug: "shape-match",
        title: "Shape Match",
        summary: "Match circles, squares, and triangles.",
        description: "A simple recognition game for preschoolers.",
        version: "1.0.0",
        runtime: "html5",
        entrypoint: "index.html",
        orientation: "landscape",
        defaultLocale: "en-US",
        supportedLocales: ["en-GB"],
        minAgeBand: "PRESCHOOL_3_5",
        maxAgeBand: "PRESCHOOL_3_5",
        categories: ["shapes"],
        offlineReady: true,
        compressedSizeBytes: 4812031,
        sha256: "a".repeat(64),
        iconPath: "assets/icon.svg",
        screenshotPaths: ["assets/ss-1.svg"],
        contentFlags: {
          externalLinks: false,
          ugc: false,
          chat: false,
          ads: false,
          purchases: false
        },
        telemetry: {
          allowedEvents: ["milestone:first-match"]
        },
        capabilities: ["saveState", "events"],
        assetLicenseDeclaration: {
          code: "MIT",
          art: "Original",
          audio: "Not used",
          fonts: "Not used"
        }
      })
    ).toThrow(/defaultLocale|gameId/i);
  });

  it("rejects manifest paths that escape the bundle root", () => {
    expect(() =>
      gameManifestSchema.parse({
        schemaVersion: 1,
        gameId: "shape-match",
        slug: "shape-match",
        title: "Shape Match",
        summary: "Match circles, squares, and triangles.",
        description: "A simple recognition game for preschoolers.",
        version: "1.0.0",
        runtime: "html5",
        entrypoint: "../outside.html",
        orientation: "landscape",
        defaultLocale: "en-US",
        supportedLocales: ["en-US"],
        minAgeBand: "PRESCHOOL_3_5",
        maxAgeBand: "PRESCHOOL_3_5",
        categories: ["shapes"],
        offlineReady: true,
        compressedSizeBytes: 4812031,
        sha256: "a".repeat(64),
        iconPath: "assets/icon.svg",
        screenshotPaths: ["assets/ss-1.svg"],
        contentFlags: {
          externalLinks: false,
          ugc: false,
          chat: false,
          ads: false,
          purchases: false
        },
        telemetry: {
          allowedEvents: ["milestone:first-match"]
        },
        capabilities: ["saveState", "events"],
        assetLicenseDeclaration: {
          code: "MIT",
          art: "Original",
          audio: "Not used",
          fonts: "Not used"
        }
      })
    ).toThrow(/bundle path/i);
  });

  it("generates an OpenAPI smoke document for the app-facing API", () => {
    const document = createOpenApiDocument("0.1.0-test");

    expect(document.info.title).toBe("EduGames Platform API");
    expect(document.paths["/v1/installations/register"]?.post?.operationId).toBe(
      "registerInstallation"
    );
    expect(document.paths["/v1/profiles"]?.post?.responses["201"]).toBeDefined();
    expect(document.paths["/v1/catalog"]?.get?.operationId).toBe("getCatalog");
    expect(document.paths["/v1/games/{slug}"]?.get?.operationId).toBe("getGameDetail");
    expect(document.paths["/v1/launch-sessions"]?.post?.responses["200"]).toBeDefined();
  });
});
