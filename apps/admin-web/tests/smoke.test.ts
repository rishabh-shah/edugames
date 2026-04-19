import { describe, expect, it } from "vitest";

import { adminDashboardFixtures } from "../src/index";

describe("admin web fixtures", () => {
  it("provides seeded moderation queue data", () => {
    expect(adminDashboardFixtures.games.length).toBeGreaterThan(0);
    expect(adminDashboardFixtures.games[0]?.status).toBe("queued");
  });
});
