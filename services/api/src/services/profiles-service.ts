import type {
  AgeBand,
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
    const ageBand = profileAgeToAgeBand(payload.age);
    const avatarId = defaultAvatarIdForGender(payload.gender);

    const profile = {
      id: profileId,
      installationId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      age: payload.age,
      gender: payload.gender,
      ageBand,
      avatarId,
      createdAt: now,
      lastActiveAt: now
    };

    this.repository.saveProfile(profile);

    return {
      profile: {
        profileId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age,
        gender: profile.gender,
        ageBand: profile.ageBand,
        avatarId: profile.avatarId,
        createdAt: profile.createdAt,
        lastActiveAt: profile.lastActiveAt
      }
    };
  }

  list(installationId: string): ListProfilesResponse {
    return {
      profiles: this.repository.listProfilesForInstallation(installationId).map((profile) => ({
        profileId: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        age: profile.age,
        gender: profile.gender,
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

const profileAgeToAgeBand = (age: number): AgeBand => {
  if (age <= 2) {
    return "TODDLER_1_2";
  }

  if (age <= 5) {
    return "PRESCHOOL_3_5";
  }

  if (age <= 8) {
    return "EARLY_PRIMARY_6_8";
  }

  return "LATE_PRIMARY_9_10";
};

const defaultAvatarIdForGender = (
  gender: CreateProfileRequest["gender"]
): string => {
  switch (gender) {
    case "BOY":
      return "rocket-fox";
    case "GIRL":
      return "starlight-otter";
    case "NONBINARY":
      return "comet-panda";
    case "PREFER_NOT_TO_SAY":
      return "balloon-bear";
  }
};
