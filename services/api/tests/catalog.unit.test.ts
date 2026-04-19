import { describe, expect, it } from "vitest";

import { InMemoryPlatformRepository } from "../src/repositories/in-memory-platform-repository.js";
import { CatalogService } from "../src/services/catalog-service.js";

describe("CatalogService", () => {
  it("lists only catalog entries that match the profile age band", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_shared01",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "fox-red",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });
    repository.saveProfile({
      id: "prof_lateprimary01",
      installationId: "inst_shared01",
      ageBand: "LATE_PRIMARY_9_10",
      avatarId: "owl-blue",
      createdAt: "2026-04-19T18:00:00.000Z",
      lastActiveAt: "2026-04-19T18:00:00.000Z"
    });

    const service = new CatalogService(repository, {
      now: () => new Date("2026-04-19T18:00:00.000Z")
    });

    const preschoolCatalog = service.list("inst_shared01", "prof_preschool01");
    const latePrimaryCatalog = service.list("inst_shared01", "prof_lateprimary01");

    expect(preschoolCatalog.sections[0]?.items.map((item) => item.slug)).toEqual([
      "shape-match"
    ]);
    expect(latePrimaryCatalog.sections).toEqual([
      {
        key: "featured",
        title: "Featured",
        items: []
      }
    ]);
  });

  it("rejects profile lookups outside the authenticated installation", () => {
    const repository = new InMemoryPlatformRepository();

    repository.saveProfile({
      id: "prof_preschool01",
      installationId: "inst_owner01",
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
});
