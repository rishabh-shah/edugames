import type {
  CreateProfileRequest,
  CreateProfileResponse,
  ListProfilesResponse
} from "@edugames/contracts";

import { createPrefixedId } from "../domain/ids.js";
import { ApiError } from "../errors.js";
import type { InMemoryPlatformRepository } from "../repositories/in-memory-platform-repository.js";

type Clock = {
  now: () => Date;
};

export class ProfilesService {
  constructor(
    private readonly repository: InMemoryPlatformRepository,
    private readonly clock: Clock
  ) {}

  create(
    installationId: string,
    payload: CreateProfileRequest
  ): CreateProfileResponse {
    const now = this.clock.now().toISOString();
    const profileId = createPrefixedId("prof");

    this.repository.saveProfile({
      id: profileId,
      installationId,
      ageBand: payload.ageBand,
      avatarId: payload.avatarId,
      createdAt: now,
      lastActiveAt: now
    });

    return {
      profileId
    };
  }

  list(installationId: string): ListProfilesResponse {
    return {
      profiles: this.repository.listProfilesForInstallation(installationId).map((profile) => ({
        profileId: profile.id,
        ageBand: profile.ageBand,
        avatarId: profile.avatarId
      }))
    };
  }

  delete(installationId: string, profileId: string): { deleted: true } {
    const profile = this.repository.getProfile(profileId);

    if (!profile || profile.installationId !== installationId) {
      throw new ApiError(404, "Profile not found.");
    }

    this.repository.deleteProfile(profileId);

    return {
      deleted: true
    };
  }
}
