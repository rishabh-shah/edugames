import type { AgeBand, Cohort } from "@edugames/contracts";

export type InstallationRecord = {
  id: string;
  status: "active" | "blocked";
  appVersion: string;
  iosVersion: string;
  deviceClass: string;
  locale: string;
  cohort: Cohort;
  appAttestStatus: "disabled" | "eligible" | "enrolled" | "unsupported";
  createdAt: string;
  lastSeenAt: string;
};

export type InstallationSessionRecord = {
  id: string;
  installationId: string;
  refreshTokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
};

export type ProfileRecord = {
  id: string;
  installationId: string;
  ageBand: AgeBand;
  avatarId: string;
  createdAt: string;
  lastActiveAt: string;
};

type ContentFlagsRecord = {
  externalLinks: boolean;
  ugc: boolean;
  chat: boolean;
  ads: boolean;
  purchases: boolean;
};

export type PublishedGameRecord = {
  gameId: string;
  slug: string;
  version: string;
  title: string;
  summary: string;
  description: string;
  minAgeBand: AgeBand;
  maxAgeBand: AgeBand;
  iconUrl: string;
  screenshots: string[];
  categories: string[];
  offlineReady: boolean;
  contentFlags: ContentFlagsRecord;
  bundleUrl: string;
  sha256: string;
  compressedSizeBytes: number;
  entrypoint: string;
  allowedEvents: string[];
  cohort: Cohort;
  sectionKey: string;
  sectionTitle: string;
  rank: number;
  status: "live" | "disabled";
};

export type LaunchSessionRecord = {
  id: string;
  installationId: string;
  profileId: string;
  gameId: string;
  version: string;
  expiresAt: string;
  createdAt: string;
};

const defaultPublishedGames = (): PublishedGameRecord[] => [
  {
    gameId: "shape-match",
    slug: "shape-match",
    version: "1.0.0",
    title: "Shape Match",
    summary: "Match circles, squares, and triangles.",
    description: "A simple recognition game for preschoolers.",
    minAgeBand: "PRESCHOOL_3_5",
    maxAgeBand: "PRESCHOOL_3_5",
    iconUrl: "https://cdn.example/games/shape-match/1.0.0/assets/icon.png",
    screenshots: [
      "https://cdn.example/games/shape-match/1.0.0/assets/ss-1.png"
    ],
    categories: ["shapes", "visual-recognition"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/shape-match/1.0.0/bundle.zip",
    sha256: "a".repeat(64),
    compressedSizeBytes: 4812031,
    entrypoint: "index.html",
    allowedEvents: ["milestone:first-match", "milestone:round-complete"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 1,
    status: "live"
  }
];

export class InMemoryPlatformRepository {
  installations = new Map<string, InstallationRecord>();
  sessions = new Map<string, InstallationSessionRecord>();
  profiles = new Map<string, ProfileRecord>();
  publishedGames = new Map<string, PublishedGameRecord>();
  launchSessions = new Map<string, LaunchSessionRecord>();

  constructor() {
    for (const game of defaultPublishedGames()) {
      this.publishedGames.set(game.gameId, game);
    }
  }

  saveInstallation(record: InstallationRecord): InstallationRecord {
    this.installations.set(record.id, record);
    return record;
  }

  getInstallation(installationId: string): InstallationRecord | undefined {
    return this.installations.get(installationId);
  }

  saveSession(record: InstallationSessionRecord): InstallationSessionRecord {
    this.sessions.set(record.id, record);
    return record;
  }

  getSession(sessionId: string): InstallationSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  revokeSession(sessionId: string, revokedAt: string): void {
    const current = this.sessions.get(sessionId);

    if (current) {
      this.sessions.set(sessionId, {
        ...current,
        revokedAt
      });
    }
  }

  findActiveSessionByRefreshTokenHash(
    refreshTokenHash: string,
    nowIso: string
  ): InstallationSessionRecord | undefined {
    return [...this.sessions.values()].find(
      (session) =>
        session.refreshTokenHash === refreshTokenHash &&
        session.revokedAt === null &&
        session.expiresAt > nowIso
    );
  }

  saveProfile(record: ProfileRecord): ProfileRecord {
    this.profiles.set(record.id, record);
    return record;
  }

  listProfilesForInstallation(installationId: string): ProfileRecord[] {
    return [...this.profiles.values()]
      .filter((profile) => profile.installationId === installationId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  getProfile(profileId: string): ProfileRecord | undefined {
    return this.profiles.get(profileId);
  }

  deleteProfile(profileId: string): void {
    this.profiles.delete(profileId);
  }

  listPublishedGamesForCohort(cohort: Cohort): PublishedGameRecord[] {
    return [...this.publishedGames.values()]
      .filter((game) => game.status === "live" && game.cohort === cohort)
      .sort((left, right) => left.rank - right.rank);
  }

  getPublishedGameBySlug(
    slug: string,
    cohort: Cohort
  ): PublishedGameRecord | undefined {
    return this.listPublishedGamesForCohort(cohort).find((game) => game.slug === slug);
  }

  getPublishedGameByGameId(
    gameId: string,
    cohort: Cohort
  ): PublishedGameRecord | undefined {
    return this.listPublishedGamesForCohort(cohort).find((game) => game.gameId === gameId);
  }

  saveLaunchSession(record: LaunchSessionRecord): LaunchSessionRecord {
    this.launchSessions.set(record.id, record);
    return record;
  }
}
