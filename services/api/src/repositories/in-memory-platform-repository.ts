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

export class InMemoryPlatformRepository {
  installations = new Map<string, InstallationRecord>();
  sessions = new Map<string, InstallationSessionRecord>();
  profiles = new Map<string, ProfileRecord>();

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
}
