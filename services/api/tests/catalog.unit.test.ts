import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { CatalogService } from "../src/services/catalog-service.js";

describe("CatalogService", () => {
  it("lists only catalog entries that match the profile age band", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_shared01",
      firstName: "Ava",
      lastName: "Shah",
      age: 5,
      gender: "GIRL",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });
    repository.saveProfile({
      id: "prof_lateprimary01",
      installationId: "inst_shared01",
      firstName: "Liam",
      lastName: "Shah",
      age: 10,
      gender: "BOY",
      ageBand: "LATE_PRIMARY_9_10",
      avatarId: "owl-blue",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });
    repository.saveProfile({
      id: "prof_earlyprimary01",
      installationId: "inst_shared01",
      firstName: "Noah",
      lastName: "Shah",
      age: 7,
      gender: "BOY",
      ageBand: "EARLY_PRIMARY_6_8",
      avatarId: "otter-green",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new CatalogService(repository, {
      now: () => new Date("2026-04-19T18:00:00.000Z")
    });

    const preschoolCatalog = service.list("inst_shared01", "prof_preschool01");
    const earlyPrimaryCatalog = service.list("inst_shared01", "prof_earlyprimary01");
    const latePrimaryCatalog = service.list("inst_shared01", "prof_lateprimary01");

    expect(preschoolCatalog.sections[0]?.items.map((item) => item.slug)).toEqual([
      "shape-match",
      "set-sizes-shapes"
    ]);
    expect(earlyPrimaryCatalog.sections[0]?.items.map((item) => item.slug)).toEqual([
      "shape-match",
      "set-sizes-shapes",
      "triple-number-memory",
      "game-of-sums",
      "game-of-differences"
    ]);
    expect(latePrimaryCatalog.sections[0]?.items.map((item) => item.slug)).toEqual([
      "shape-match",
      "set-sizes-shapes",
      "triple-number-memory",
      "game-of-sums",
      "game-of-differences"
    ]);
  });

  it("rejects profile lookups outside the authenticated installation", () => {
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

    const service = new CatalogService(repository, {
      now: () => new Date("2026-04-19T18:00:00.000Z")
    });

    expect(() => service.list("inst_other01", "prof_preschool01")).toThrow(
      /profile/i
    );
  });

  it("omits disabled games from catalog results", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_shared01",
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
      "2026-04-19T18:05:00.000Z",
      "Kill switch"
    );

    const service = new CatalogService(repository, {
      now: () => new Date("2026-04-19T18:06:00.000Z")
    });

    expect(service.list("inst_shared01", "prof_preschool01").sections).toEqual([
      expect.objectContaining({
        key: "featured",
        items: [
          expect.objectContaining({
            gameId: "set-sizes-shapes",
            slug: "set-sizes-shapes"
          })
        ]
      })
    ]);
    expect(() =>
      service.getGameDetail("inst_shared01", "prof_preschool01", "shape-match")
    ).toThrow(/game not found/i);
  });
});
