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

    const created = service.create("inst_123abc", {
      firstName: "Ava",
      lastName: "Shah",
      age: 5,
      gender: "GIRL"
    });

    const response = service.list("inst_123abc");

    expect(created.profile.profileId).toMatch(/^prof_/);
    expect(created.profile.firstName).toBe("Ava");
    expect(created.profile.lastName).toBe("Shah");
    expect(created.profile.age).toBe(5);
    expect(created.profile.gender).toBe("GIRL");
    expect(created.profile.ageBand).toBe("PRESCHOOL_3_5");
    expect(created.profile.avatarId).toBe("starlight-otter");
    expect(created.profile.createdAt).toBe("2026-04-19T18:00:00.000Z");
    expect(created.profile.lastActiveAt).toBe("2026-04-19T18:00:00.000Z");
    expect(response.profiles).toHaveLength(1);
    expect(response.profiles[0]?.firstName).toBe("Ava");
    expect(response.profiles[0]?.avatarId).toBe("starlight-otter");
  });

  it("rejects deletion outside the owning installation", () => {
    const repository = new InMemoryPlatformRepository();
    const service = new ProfilesService(repository, fixedClock);
    const created = service.create("inst_123abc", {
      firstName: "Liam",
      lastName: "Shah",
      age: 6,
      gender: "BOY"
    });

    expect(() => service.delete("inst_other", created.profile.profileId)).toThrow(ApiError);
  });
});
