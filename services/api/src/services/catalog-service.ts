import { ageBandOrder, type CatalogResponse, type GameDetailResponse } from "@edugames/contracts";

import { ApiError } from "../errors.js";
import type {
  InMemoryPlatformRepository,
  ProfileRecord,
  PublishedGameRecord
} from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

const isAgeBandWithinRange = (
  profileAgeBand: ProfileRecord["ageBand"],
  minAgeBand: PublishedGameRecord["minAgeBand"],
  maxAgeBand: PublishedGameRecord["maxAgeBand"]
): boolean =>
  ageBandOrder[profileAgeBand] >= ageBandOrder[minAgeBand] &&
  ageBandOrder[profileAgeBand] <= ageBandOrder[maxAgeBand];

export class CatalogService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  list(installationId: string, profileId: string): CatalogResponse {
    const profile = this.getOwnedProfile(installationId, profileId);
    const cohort = this.repository.getInstallation(installationId)?.cohort ?? "general";
    const games = this.repository
      .listPublishedGames()
      .filter((game) => game.cohort === cohort);
    const sectionMap = new Map<string, { key: string; title: string; items: CatalogResponse["sections"][number]["items"] }>();

    for (const game of games) {
      if (!sectionMap.has(game.sectionKey)) {
        sectionMap.set(game.sectionKey, {
          key: game.sectionKey,
          title: game.sectionTitle,
          items: []
        });
      }

      if (
        game.status === "live" &&
        isAgeBandWithinRange(profile.ageBand, game.minAgeBand, game.maxAgeBand)
      ) {
        sectionMap.get(game.sectionKey)?.items.push({
          gameId: game.gameId,
          slug: game.slug,
          version: game.version,
          title: game.title,
          summary: game.summary,
          ageBand: game.minAgeBand,
          iconUrl: game.iconUrl,
          cached: false
        });
      }
    }

    return {
      generatedAt: this.clock.now().toISOString(),
      sections: [...sectionMap.values()].filter((section) => section.items.length > 0)
    };
  }

  getGameDetail(
    installationId: string,
    profileId: string,
    slug: string
  ): GameDetailResponse {
    const profile = this.getOwnedProfile(installationId, profileId);
    const cohort = this.repository.getInstallation(installationId)?.cohort ?? "general";
    const game = this.repository.getPublishedGameBySlug(slug, cohort);

    if (!game || !isAgeBandWithinRange(profile.ageBand, game.minAgeBand, game.maxAgeBand)) {
      throw new ApiError(404, "Game not found.");
    }

    return {
      gameId: game.gameId,
      slug: game.slug,
      title: game.title,
      summary: game.summary,
      description: game.description,
      version: game.version,
      ageBand: game.minAgeBand,
      screenshots: game.screenshots,
      categories: game.categories,
      offlineReady: game.offlineReady,
      contentFlags: game.contentFlags
    };
  }

  private getOwnedProfile(installationId: string, profileId: string): ProfileRecord {
    const profile = this.repository.getProfile(profileId);

    if (!profile || profile.installationId !== installationId) {
      throw new ApiError(404, "Profile not found.");
    }

    return profile;
  }
}
