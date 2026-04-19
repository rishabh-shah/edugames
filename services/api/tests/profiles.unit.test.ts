import { describe, expect, it } from "vitest";

import { ApiError } from "../src/errors.js";
import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { ProfilesService } from "../src/services/profiles-service.js";

const fixedClock = {
  now: () => new Date("2026-04-19T18:00:00.000Z")
};

describe("ProfilesService", () => {
  it("creates and lists profiles for an installation", () => {
    const repository = new InMemoryPlatformRepository();
    const service = new ProfilesService(repository, fixedClock);

    service.create("inst_123abc", {
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red"
    });

    const response = service.list("inst_123abc");

    expect(response.profiles).toHaveLength(1);
    expect(response.profiles[0]?.avatarId).toBe("fox-red");
  });

  it("rejects deletion outside the owning installation", () => {
    const repository = new InMemoryPlatformRepository();
    const service = new ProfilesService(repository, fixedClock);
    const created = service.create("inst_123abc", {
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red"
    });

    expect(() => service.delete("inst_other", created.profileId)).toThrow(ApiError);
  });
});
