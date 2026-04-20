import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  AgeBand,
  Cohort,
  GameModerationStatus,
  ReportReason,
  TelemetryEvent
} from "@edugames/contracts";

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
  firstName: string;
  lastName: string;
  age: number;
  gender: "BOY" | "GIRL" | "NONBINARY" | "PREFER_NOT_TO_SAY";
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
  status: GameModerationStatus;
  disabledAt: string | null;
  disabledReason: string | null;
  updatedAt: string;
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

export type ReportRecord = {
  id: string;
  installationId: string;
  profileId: string;
  gameId: string;
  reason: ReportReason;
  details: string | null;
  status: "open" | "resolved";
  createdAt: string;
};

export type TelemetryBatchRecord = {
  id: string;
  installationId: string;
  profileId: string;
  launchSessionId: string;
  gameId: string;
  schemaVersion: number;
  receivedAt: string;
  events: TelemetryEvent[];
};

type LocalBundleFixtureConfig = {
  gameId: string;
  archiveStem: string;
  expandedDirectoryName: string;
  distDirectory: string;
};

const createLocalBundleFixtureConfig = (
  gameId: string,
  archiveStem: string,
  expandedDirectoryName: string,
  relativeDistDirectory: string
): LocalBundleFixtureConfig => ({
  gameId,
  archiveStem,
  expandedDirectoryName,
  distDirectory: join(
    dirname(fileURLToPath(import.meta.url)),
    relativeDistDirectory
  )
});

const localBundleFixtures: LocalBundleFixtureConfig[] = [
  createLocalBundleFixtureConfig(
    "shape-match",
    "shape-match-fixture",
    "shape-match-fixture-bundle",
    "../../../../games/shape-match/dist"
  ),
  createLocalBundleFixtureConfig(
    "set-sizes-shapes",
    "set-sizes-shapes-fixture",
    "set-sizes-shapes-fixture-bundle",
    "../../../../games/set-sizes-shapes/dist"
  ),
  createLocalBundleFixtureConfig(
    "triple-number-memory",
    "triple-number-memory-fixture",
    "triple-number-memory-fixture-bundle",
    "../../../../games/triple-number-memory/dist"
  ),
  createLocalBundleFixtureConfig(
    "game-of-sums",
    "game-of-sums-fixture",
    "game-of-sums-fixture-bundle",
    "../../../../games/game-of-sums/dist"
  ),
  createLocalBundleFixtureConfig(
    "game-of-differences",
    "game-of-differences-fixture",
    "game-of-differences-fixture-bundle",
    "../../../../games/game-of-differences/dist"
  )
];

const buildFixtureArchiveManifest = (
  sourceDirectory: string,
  archiveStem: string,
  expandedDirectoryName: string
): Buffer => {
  const files = listRegularFiles(sourceDirectory);
  const manifestLines = files.map((filePath) => {
    const relativePath = relative(sourceDirectory, filePath).replaceAll("\\", "/");
    const fileData = readFileSync(filePath);
    const checksum = createHash("sha256").update(fileData).digest("hex");

    return `file=${expandedDirectoryName}/${relativePath} sha256=${checksum} bytes=${fileData.length}`;
  });

  return Buffer.from(
    [`archive=${archiveStem}`, ...manifestLines].join("\n"),
    "utf8"
  );
};

const listRegularFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      filePaths.push(...listRegularFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      filePaths.push(entryPath);
    }
  }

  return filePaths.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
};

const resolveLocalBundleMetadata = (
  fixture: LocalBundleFixtureConfig
): Pick<
  PublishedGameRecord,
  "sha256" | "compressedSizeBytes"
> | null => {
  if (!existsSync(fixture.distDirectory) || !statSync(fixture.distDirectory).isDirectory()) {
    return null;
  }

  const archiveData = buildFixtureArchiveManifest(
    fixture.distDirectory,
    fixture.archiveStem,
    fixture.expandedDirectoryName
  );

  return {
    sha256: createHash("sha256").update(archiveData).digest("hex"),
    compressedSizeBytes: archiveData.length
  };
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
    maxAgeBand: "EARLY_PRIMARY_6_8",
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
    ...(resolveLocalBundleMetadata(localBundleFixtures[0]!) ?? {
      sha256: "7e57f3f260e6567cbbbaab355ff1c415d8f03a7e1d1abee75d7e98c502a85c4e",
      compressedSizeBytes: 1626
    }),
    entrypoint: "index.html",
    allowedEvents: ["milestone:first-match", "milestone:round-complete"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 1,
    status: "live",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  },
  {
    gameId: "set-sizes-shapes",
    slug: "set-sizes-shapes",
    version: "0.1.0",
    title: "Set Sizes Shapes",
    summary: "Spot how many shapes are on screen before the timer runs out.",
    description:
      "A fast number-sense game where players estimate moving shape groups at a glance.",
    minAgeBand: "PRESCHOOL_3_5",
    maxAgeBand: "EARLY_PRIMARY_6_8",
    iconUrl: "https://cdn.example/games/set-sizes-shapes/0.1.0/assets/icon.svg",
    screenshots: [
      "https://cdn.example/games/set-sizes-shapes/0.1.0/assets/ss-1.svg"
    ],
    categories: ["counting", "number-sense", "visual-recognition"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/set-sizes-shapes/0.1.0/bundle.zip",
    ...(resolveLocalBundleMetadata(localBundleFixtures[1]!) ?? {
      sha256: "d".repeat(64),
      compressedSizeBytes: 2048
    }),
    entrypoint: "index.html",
    allowedEvents: ["game_started", "ui_interacted", "game_exited"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 2,
    status: "live",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  },
  {
    gameId: "triple-number-memory",
    slug: "triple-number-memory",
    version: "0.1.0",
    title: "Triple Number Memory",
    summary: "Match numbers across digits, dots, and words in a memory challenge.",
    description:
      "A memory game that helps children connect numerals, dot groups, and number words.",
    minAgeBand: "EARLY_PRIMARY_6_8",
    maxAgeBand: "EARLY_PRIMARY_6_8",
    iconUrl: "https://cdn.example/games/triple-number-memory/0.1.0/assets/icon.svg",
    screenshots: [
      "https://cdn.example/games/triple-number-memory/0.1.0/assets/ss-1.svg"
    ],
    categories: ["memory", "numbers", "reading"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/triple-number-memory/0.1.0/bundle.zip",
    ...(resolveLocalBundleMetadata(localBundleFixtures[2]!) ?? {
      sha256: "e".repeat(64),
      compressedSizeBytes: 2048
    }),
    entrypoint: "index.html",
    allowedEvents: ["game_started", "ui_interacted", "game_exited"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 3,
    status: "live",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  },
  {
    gameId: "game-of-sums",
    slug: "game-of-sums",
    version: "0.1.0",
    title: "Game of Sums",
    summary: "Build number pairs that add up to the target and clear the board.",
    description:
      "A solo-friendly arithmetic challenge focused on addition facts and target matching.",
    minAgeBand: "EARLY_PRIMARY_6_8",
    maxAgeBand: "EARLY_PRIMARY_6_8",
    iconUrl: "https://cdn.example/games/game-of-sums/0.1.0/assets/icon.svg",
    screenshots: [
      "https://cdn.example/games/game-of-sums/0.1.0/assets/ss-1.svg"
    ],
    categories: ["math", "addition", "strategy"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/game-of-sums/0.1.0/bundle.zip",
    ...(resolveLocalBundleMetadata(localBundleFixtures[3]!) ?? {
      sha256: "f".repeat(64),
      compressedSizeBytes: 2048
    }),
    entrypoint: "index.html",
    allowedEvents: ["game_started", "ui_interacted", "game_exited"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 4,
    status: "live",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  },
  {
    gameId: "game-of-differences",
    slug: "game-of-differences",
    version: "0.1.0",
    title: "Game of Differences",
    summary: "Choose number pairs whose difference matches the target card.",
    description:
      "A subtraction-focused strategy game that rewards flexible number thinking in solo play.",
    minAgeBand: "EARLY_PRIMARY_6_8",
    maxAgeBand: "EARLY_PRIMARY_6_8",
    iconUrl: "https://cdn.example/games/game-of-differences/0.1.0/assets/icon.svg",
    screenshots: [
      "https://cdn.example/games/game-of-differences/0.1.0/assets/ss-1.svg"
    ],
    categories: ["math", "subtraction", "strategy"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/game-of-differences/0.1.0/bundle.zip",
    ...(resolveLocalBundleMetadata(localBundleFixtures[4]!) ?? {
      sha256: "1".repeat(64),
      compressedSizeBytes: 2048
    }),
    entrypoint: "index.html",
    allowedEvents: ["game_started", "ui_interacted", "game_exited"],
    cohort: "general",
    sectionKey: "featured",
    sectionTitle: "Featured",
    rank: 5,
    status: "live",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  },
  {
    gameId: "counting-kites",
    slug: "counting-kites",
    version: "0.1.0",
    title: "Counting Kites",
    summary: "Count bright kites and tap the right answer in a breezy sky.",
    description: "A calm counting game waiting in the moderation queue.",
    minAgeBand: "PRESCHOOL_3_5",
    maxAgeBand: "EARLY_PRIMARY_6_8",
    iconUrl: "https://cdn.example/games/counting-kites/0.1.0/assets/icon.png",
    screenshots: [
      "https://cdn.example/games/counting-kites/0.1.0/assets/ss-1.png"
    ],
    categories: ["counting", "number-sense"],
    offlineReady: true,
    contentFlags: {
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    },
    bundleUrl: "https://cdn.example/games/counting-kites/0.1.0/bundle.zip",
    sha256: "b".repeat(64),
    compressedSizeBytes: 3973120,
    entrypoint: "index.html",
    allowedEvents: ["milestone:first-correct-answer"],
    cohort: "general",
    sectionKey: "new-and-noteworthy",
    sectionTitle: "New and Noteworthy",
    rank: 2,
    status: "queued",
    disabledAt: null,
    disabledReason: null,
    updatedAt: "2026-04-19T18:00:00.000Z"
  }
];

export class InMemoryPlatformRepository {
  installations = new Map<string, InstallationRecord>();
  sessions = new Map<string, InstallationSessionRecord>();
  profiles = new Map<string, ProfileRecord>();
  publishedGames = new Map<string, PublishedGameRecord>();
  launchSessions = new Map<string, LaunchSessionRecord>();
  reports = new Map<string, ReportRecord>();
  telemetryBatches = new Map<string, TelemetryBatchRecord>();

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
    this.refreshLocalBundleMetadataIfNeeded();
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

  listPublishedGames(): PublishedGameRecord[] {
    this.refreshLocalBundleMetadataIfNeeded();
    return [...this.publishedGames.values()].sort((left, right) => left.rank - right.rank);
  }

  getPublishedGameRecord(gameId: string): PublishedGameRecord | undefined {
    this.refreshLocalBundleMetadataIfNeeded();
    return this.publishedGames.get(gameId);
  }

  updatePublishedGameStatus(
    gameId: string,
    status: GameModerationStatus,
    updatedAt: string,
    disabledReason: string | null
  ): PublishedGameRecord | undefined {
    const current = this.publishedGames.get(gameId);

    if (!current) {
      return undefined;
    }

    const nextRecord: PublishedGameRecord = {
      ...current,
      status,
      disabledAt: status === "disabled" ? updatedAt : null,
      disabledReason: status === "disabled" ? disabledReason : null,
      updatedAt
    };

    this.publishedGames.set(gameId, nextRecord);

    return nextRecord;
  }

  saveLaunchSession(record: LaunchSessionRecord): LaunchSessionRecord {
    this.launchSessions.set(record.id, record);
    return record;
  }

  getLaunchSession(launchSessionId: string): LaunchSessionRecord | undefined {
    return this.launchSessions.get(launchSessionId);
  }

  saveReport(record: ReportRecord): ReportRecord {
    this.reports.set(record.id, record);
    return record;
  }

  listReports(): ReportRecord[] {
    return [...this.reports.values()].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  }

  updateReportStatus(
    reportId: string,
    status: ReportRecord["status"]
  ): ReportRecord | undefined {
    const current = this.reports.get(reportId);

    if (!current) {
      return undefined;
    }

    const nextRecord: ReportRecord = {
      ...current,
      status
    };

    this.reports.set(reportId, nextRecord);
    return nextRecord;
  }

  saveTelemetryBatch(record: TelemetryBatchRecord): TelemetryBatchRecord {
    this.telemetryBatches.set(record.id, record);
    return record;
  }

  listTelemetryBatches(): TelemetryBatchRecord[] {
    return [...this.telemetryBatches.values()].sort((left, right) =>
      left.receivedAt.localeCompare(right.receivedAt)
    );
  }

  private refreshLocalBundleMetadataIfNeeded(): void {
    for (const fixture of localBundleFixtures) {
      const current = this.publishedGames.get(fixture.gameId);

      if (!current) {
        continue;
      }

      const liveMetadata = resolveLocalBundleMetadata(fixture);

      if (!liveMetadata) {
        continue;
      }

      if (
        current.sha256 === liveMetadata.sha256 &&
        current.compressedSizeBytes === liveMetadata.compressedSizeBytes
      ) {
        continue;
      }

      this.publishedGames.set(fixture.gameId, {
        ...current,
        ...liveMetadata
      });
    }
  }
}
