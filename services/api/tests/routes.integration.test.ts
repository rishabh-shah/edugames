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
        firstName: "Ava",
        lastName: "Shah",
        age: 5,
        gender: "GIRL"
      }
    });

    expect(createProfile.statusCode).toBe(201);
    expect(createProfile.json().profile.profileId).toMatch(/^prof_/);
    expect(createProfile.json().profile.firstName).toBe("Ava");
    expect(createProfile.json().profile.ageBand).toBe("PRESCHOOL_3_5");
    expect(createProfile.json().profile.avatarId).toBe("starlight-otter");
    expect(createProfile.json().profile.createdAt).toBeTruthy();
    expect(createProfile.json().profile.lastActiveAt).toBeTruthy();

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
      url: `/v1/profiles/${createProfile.json().profile.profileId}`,
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
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: "GIRL"
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
      url: `/v1/profiles/${createdProfile.profile.profileId}`,
      headers: {
        authorization: `Bearer ${secondRegistration.accessToken}`
      }
    });

    expect(unauthenticated.statusCode).toBe(401);
    expect(malformedProfileDelete.statusCode).toBe(400);
    expect(crossInstallationDelete.statusCode).toBe(404);

    await app.close();
  });

  it("serves catalog, game detail, and launch metadata for allowed profiles", async () => {
    const app = createApp();
    const registration = (
      await app.inject({
        method: "POST",
        url: "/v1/installations/register",
        payload: {
          appVersion: "1.0.0",
          iosVersion: "26.4",
          deviceClass: "iPad14,3",
          locale: "en-US",
          supportsAppAttest: true
        }
      })
    ).json();
    const preschoolProfile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: {
          authorization: `Bearer ${registration.accessToken}`
        },
        payload: {
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: "GIRL"
        }
      })
    ).json();
    const latePrimaryProfile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: {
          authorization: `Bearer ${registration.accessToken}`
        },
        payload: {
          firstName: "Liam",
          lastName: "Shah",
          age: 10,
          gender: "BOY"
        }
      })
    ).json();
    const earlyPrimaryProfile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: {
          authorization: `Bearer ${registration.accessToken}`
        },
        payload: {
          firstName: "Noah",
          lastName: "Shah",
          age: 7,
          gender: "BOY"
        }
      })
    ).json();

    const preschoolCatalog = await app.inject({
      method: "GET",
      url: `/v1/catalog?profileId=${preschoolProfile.profile.profileId}`,
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      }
    });
    const earlyPrimaryCatalog = await app.inject({
      method: "GET",
      url: `/v1/catalog?profileId=${earlyPrimaryProfile.profile.profileId}`,
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      }
    });
    const latePrimaryCatalog = await app.inject({
      method: "GET",
      url: `/v1/catalog?profileId=${latePrimaryProfile.profile.profileId}`,
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      }
    });
    const gameDetail = await app.inject({
      method: "GET",
      url: `/v1/games/set-sizes-shapes?profileId=${preschoolProfile.profile.profileId}`,
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      }
    });
    const launchSession = await app.inject({
      method: "POST",
      url: "/v1/launch-sessions",
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      },
      payload: {
        profileId: preschoolProfile.profile.profileId,
        gameId: "shape-match"
      }
    });
    const blockedLaunch = await app.inject({
      method: "POST",
      url: "/v1/launch-sessions",
      headers: {
        authorization: `Bearer ${registration.accessToken}`
      },
      payload: {
        profileId: latePrimaryProfile.profile.profileId,
        gameId: "shape-match"
      }
    });

    expect(preschoolCatalog.statusCode).toBe(200);
    expect(preschoolCatalog.json().sections[0].items.map((item) => item.slug)).toEqual([
      "shape-match",
      "set-sizes-shapes"
    ]);

    expect(earlyPrimaryCatalog.statusCode).toBe(200);
    expect(earlyPrimaryCatalog.json().sections[0].items.map((item) => item.slug)).toEqual([
      "shape-match",
      "set-sizes-shapes",
      "triple-number-memory",
      "game-of-sums",
      "game-of-differences"
    ]);

    expect(latePrimaryCatalog.statusCode).toBe(200);
    expect(latePrimaryCatalog.json().sections).toEqual([]);

    expect(gameDetail.statusCode).toBe(200);
    expect(gameDetail.json().slug).toBe("set-sizes-shapes");
    expect(gameDetail.json().title).toBe("Set Sizes Shapes");
    expect(gameDetail.json().screenshots[0]).toMatch(/set-sizes-shapes/);

    expect(launchSession.statusCode).toBe(200);
    expect(launchSession.json().gameId).toBe("shape-match");
    expect(launchSession.json().bundle.bundleUrl).toMatch(/bundle\.zip$/);

    expect(blockedLaunch.statusCode).toBe(403);

    await app.close();
  });

  it("accepts report submission and telemetry ingestion for authenticated installations", async () => {
    const app = createApp();
    const registration = (
      await app.inject({
        method: "POST",
        url: "/v1/installations/register",
        payload: {
          appVersion: "1.0.0",
          iosVersion: "26.4",
          deviceClass: "iPad14,3",
          locale: "en-US",
          supportsAppAttest: true
        }
      })
    ).json();
    const authHeader = {
      authorization: `Bearer ${registration.accessToken}`
    };
    const profile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: authHeader,
        payload: {
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: "GIRL"
        }
      })
    ).json();
    const launchSession = (
      await app.inject({
        method: "POST",
        url: "/v1/launch-sessions",
        headers: authHeader,
        payload: {
          profileId: profile.profile.profileId,
          gameId: "shape-match"
        }
      })
    ).json();

    const reportResponse = await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: authHeader,
      payload: {
        profileId: profile.profile.profileId,
        gameId: "shape-match",
        reason: "bug",
        details: "The round froze after the first match."
      }
    });
    const telemetryResponse = await app.inject({
      method: "POST",
      url: "/v1/telemetry/batches",
      headers: authHeader,
      payload: {
        profileId: profile.profile.profileId,
        launchSessionId: launchSession.launchSessionId,
        schemaVersion: 1,
        events: [
          {
            ts: "2026-04-19T18:00:00Z",
            type: "session_start"
          },
          {
            ts: "2026-04-19T18:00:01Z",
            type: "milestone",
            name: "first-match",
            value: 1
          }
        ]
      }
    });

    expect(reportResponse.statusCode).toBe(201);
    expect(reportResponse.json()).toEqual({
      reportId: expect.stringMatching(/^rep_/),
      status: "open"
    });
    expect(telemetryResponse.statusCode).toBe(202);
    expect(telemetryResponse.json()).toEqual({ accepted: 2 });

    await app.close();
  });

  it("supports moderation review and kill-switch flows for games", async () => {
    const app = createApp({
      config: {
        adminApiKey: "admin-secret"
      }
    });
    const registration = (
      await app.inject({
        method: "POST",
        url: "/v1/installations/register",
        payload: {
          appVersion: "1.0.0",
          iosVersion: "26.4",
          deviceClass: "iPad14,3",
          locale: "en-US",
          supportsAppAttest: true
        }
      })
    ).json();
    const authHeader = {
      authorization: `Bearer ${registration.accessToken}`
    };
    const adminHeader = {
      "x-admin-api-key": "admin-secret"
    };
    const profile = (
      await app.inject({
        method: "POST",
        url: "/v1/profiles",
        headers: authHeader,
        payload: {
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: "GIRL"
        }
      })
    ).json();
    await app.inject({
      method: "POST",
      url: "/v1/reports",
      headers: authHeader,
      payload: {
        profileId: profile.profile.profileId,
        gameId: "shape-match",
        reason: "safety",
        details: "Disable until reviewed."
      }
    });

    const reviewBeforeDisable = await app.inject({
      method: "GET",
      url: "/v1/admin/games",
      headers: adminHeader
    });
    const launchBeforeApproval = await app.inject({
      method: "POST",
      url: "/v1/launch-sessions",
      headers: authHeader,
      payload: {
        profileId: profile.profile.profileId,
        gameId: "counting-kites"
      }
    });
    const queuedApproval = await app.inject({
      method: "POST",
      url: "/v1/admin/games/counting-kites/approve",
      headers: adminHeader
    });
    const disableGame = await app.inject({
      method: "POST",
      url: "/v1/admin/games/shape-match/disable",
      headers: adminHeader,
      payload: {
        reason: "Safety escalation"
      }
    });
    const catalogAfterDisable = await app.inject({
      method: "GET",
      url: `/v1/catalog?profileId=${profile.profile.profileId}`,
      headers: authHeader
    });
    const detailAfterDisable = await app.inject({
      method: "GET",
      url: `/v1/games/shape-match?profileId=${profile.profile.profileId}`,
      headers: authHeader
    });
    const launchAfterDisable = await app.inject({
      method: "POST",
      url: "/v1/launch-sessions",
      headers: authHeader,
      payload: {
        profileId: profile.profile.profileId,
        gameId: "shape-match"
      }
    });
    const enableGame = await app.inject({
      method: "POST",
      url: "/v1/admin/games/shape-match/enable",
      headers: adminHeader
    });
    const reportsBeforeResolve = await app.inject({
      method: "GET",
      url: "/v1/admin/reports",
      headers: adminHeader
    });
    const reportId = reportsBeforeResolve.json().reports[0]?.reportId;
    const resolveReport = await app.inject({
      method: "POST",
      url: `/v1/admin/reports/${reportId}/resolve`,
      headers: adminHeader
    });

    expect(reviewBeforeDisable.statusCode).toBe(200);
    expect(reviewBeforeDisable.json().games).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gameId: "shape-match",
          status: "live",
          openReportCount: 1
        }),
        expect.objectContaining({
          gameId: "counting-kites",
          status: "queued"
        })
      ])
    );
    expect(launchBeforeApproval.statusCode).toBe(404);
    expect(queuedApproval.statusCode).toBe(200);
    expect(queuedApproval.json()).toEqual({
      gameId: "counting-kites",
      status: "live",
      disabledAt: null,
      disabledReason: null
    });

    expect(disableGame.statusCode).toBe(200);
    expect(disableGame.json()).toEqual({
      gameId: "shape-match",
      status: "disabled",
      disabledAt: expect.any(String),
      disabledReason: "Safety escalation"
    });

    expect(catalogAfterDisable.statusCode).toBe(200);
    expect(catalogAfterDisable.json().sections).toEqual([
      expect.objectContaining({
        key: "featured",
        items: [
          expect.objectContaining({
            gameId: "set-sizes-shapes",
            slug: "set-sizes-shapes"
          })
        ]
      }),
      expect.objectContaining({
        key: "new-and-noteworthy",
        items: [
          expect.objectContaining({
            gameId: "counting-kites",
            slug: "counting-kites"
          })
        ]
      })
    ]);
    expect(detailAfterDisable.statusCode).toBe(404);
    expect(launchAfterDisable.statusCode).toBe(403);

    expect(enableGame.statusCode).toBe(200);
    expect(enableGame.json()).toEqual({
      gameId: "shape-match",
      status: "live",
      disabledAt: null,
      disabledReason: null
    });
    expect(reportsBeforeResolve.statusCode).toBe(200);
    expect(reportsBeforeResolve.json().reports).toEqual([
      expect.objectContaining({
        gameId: "shape-match",
        status: "open",
        reason: "safety"
      })
    ]);
    expect(resolveReport.statusCode).toBe(200);
    expect(resolveReport.json()).toEqual({
      reportId,
      status: "resolved"
    });

    await app.close();
  });
});
