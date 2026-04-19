import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("EduGames API routes", () => {
  it("serves health and readiness endpoints", async () => {
    const app = createApp();

    const health = await app.inject({
      method: "GET",
      url: "/healthz"
    });
    const ready = await app.inject({
      method: "GET",
      url: "/readyz"
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: "ready" });

    await app.close();
  });

  it("supports installation registration, refresh, and profile lifecycle", async () => {
    const app = createApp();
    const registerResponse = await app.inject({
      method: "POST",
      url: "/v1/installations/register",
      payload: {
        appVersion: "1.0.0",
        iosVersion: "26.4",
        deviceClass: "iPad14,3",
        locale: "en-US",
        supportsAppAttest: true
      }
    });
    const registration = registerResponse.json();
    const authHeader = {
      authorization: `Bearer ${registration.accessToken}`
    };

    expect(registerResponse.statusCode).toBe(200);
    expect(registration.installationId).toMatch(/^inst_/);

    const createProfile = await app.inject({
      method: "POST",
      url: "/v1/profiles",
      headers: authHeader,
      payload: {
        ageBand: "PRESCHOOL_3_5",
        avatarId: "fox-red"
      }
    });

    expect(createProfile.statusCode).toBe(201);
    expect(createProfile.json().profileId).toMatch(/^prof_/);

    const listProfiles = await app.inject({
      method: "GET",
      url: "/v1/profiles",
      headers: authHeader
    });

    expect(listProfiles.statusCode).toBe(200);
    expect(listProfiles.json().profiles).toHaveLength(1);

    const refreshResponse = await app.inject({
      method: "POST",
      url: "/v1/installations/refresh",
      payload: {
        refreshToken: registration.refreshToken
      }
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json().refreshToken).not.toBe(registration.refreshToken);

    const staleAccessTokenRequest = await app.inject({
      method: "GET",
      url: "/v1/profiles",
      headers: authHeader
    });

    expect(staleAccessTokenRequest.statusCode).toBe(401);

    const refreshedAuthHeader = {
      authorization: `Bearer ${refreshResponse.json().accessToken}`
    };

    const deleteProfile = await app.inject({
      method: "DELETE",
      url: `/v1/profiles/${createProfile.json().profileId}`,
      headers: refreshedAuthHeader
    });

    expect(deleteProfile.statusCode).toBe(200);
    expect(deleteProfile.json()).toEqual({ deleted: true });

    await app.close();
  });

  it("rejects unauthenticated and cross-installation profile access", async () => {
    const app = createApp();
    const firstRegistration = (
      await app.inject({
        method: "POST",
        url: "/v1/installations/register",
        payload: {
          appVersion: "1.0.0",
          iosVersion: "26.4",
          deviceClass: "iPad14,3",
          locale: "en-US",
          supportsAppAttest: false
        }
      })
    ).json();
    const secondRegistration = (
      await app.inject({
        method: "POST",
        url: "/v1/installations/register",
        payload: {
          appVersion: "1.0.0",
          iosVersion: "26.4",
          deviceClass: "iPad14,3",
          locale: "en-US",
          supportsAppAttest: false
        }
      })
    ).json();
    const createdProfile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: {
          authorization: `Bearer ${firstRegistration.accessToken}`
        },
        payload: {
          ageBand: "PRESCHOOL_3_5",
          avatarId: "fox-red"
        }
      })
    ).json();

    const unauthenticated = await app.inject({
      method: "GET",
      url: "/v1/profiles"
    });
    const malformedProfileDelete = await app.inject({
      method: "DELETE",
      url: "/v1/profiles/not-a-profile-id",
      headers: {
        authorization: `Bearer ${firstRegistration.accessToken}`
      }
    });
    const crossInstallationDelete = await app.inject({
      method: "DELETE",
      url: `/v1/profiles/${createdProfile.profileId}`,
      headers: {
        authorization: `Bearer ${secondRegistration.accessToken}`
      }
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(malformedProfileDelete.statusCode).toBe(400);
    expect(crossInstallationDelete.statusCode).toBe(404);

    await app.close();
  });
});
