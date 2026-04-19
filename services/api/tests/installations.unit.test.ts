import { describe, expect, it } from "vitest";

import { defaultApiConfig } from "../src/config.js";
import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { InstallationsService } from "../src/services/installations-service.js";

const fixedNow = new Date("2026-04-19T18:00:00.000Z");
const fixedClock = {
  now: () => fixedNow
};

describe("InstallationsService", () => {
  it("registers an installation and creates a rotatable session", () => {
    const repository = new InMemoryPlatformRepository();
    const service = new InstallationsService(repository, defaultApiConfig, fixedClock);

    const registration = service.register({
      appVersion: "1.0.0",
      iosVersion: "26.4",
      deviceClass: "iPad14,3",
      locale: "en-US",
      supportsAppAttest: true
    });

    const refreshed = service.refresh({
      refreshToken: registration.refreshToken
    });

    expect(registration.installationId).toMatch(/^inst_/);
    expect(refreshed.refreshToken).not.toBe(registration.refreshToken);
    expect(repository.installations.size).toBe(1);
  });
});
