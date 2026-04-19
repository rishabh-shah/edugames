import { describe, expect, it } from "vitest";

import {
  ageBandSchema,
  createOpenApiDocument,
  gameManifestSchema,
  launchSessionResponseSchema,
  registerInstallationRequestSchema,
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

  it("validates the game manifest contract", () => {
    const manifest = gameManifestSchema.parse({
      slug: "shape-match",
      title: "Shape Match",
      summary: "Match circles, squares, and triangles.",
      description: "A simple recognition game for preschoolers.",
      version: "1.0.0",
      entrypoint: "index.html",
      minAgeBand: "PRESCHOOL_3_5",
      maxAgeBand: "EARLY_PRIMARY_6_8",
      categories: ["shapes", "visual-recognition"],
      screenshots: ["assets/ss-1.png"],
      contentFlags: {
        externalLinks: false,
        ugc: false,
        chat: false,
        ads: false,
        purchases: false
      },
      offlineReady: true,
      allowedEvents: ["milestone:first-match"],
      license: "MIT"
    });

    expect(manifest.slug).toBe("shape-match");
  });

  it("generates an OpenAPI smoke document for the app-facing API", () => {
    const document = createOpenApiDocument("0.1.0-test");

    expect(document.info.title).toBe("EduGames Platform API");
    expect(document.paths["/v1/installations/register"]?.post?.operationId).toBe(
      "registerInstallation"
    );
    expect(document.paths["/v1/profiles"]?.post?.responses["201"]).toBeDefined();
    expect(document.paths["/v1/launch-sessions"]).toBeUndefined();
  });
});
