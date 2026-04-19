import {
  createProfileRequestSchema,
  createProfileResponseSchema,
  deleteProfileResponseSchema,
  listProfilesResponseSchema,
  profileIdSchema,
  refreshInstallationRequestSchema,
  refreshInstallationResponseSchema,
  registerInstallationRequestSchema,
  registerInstallationResponseSchema
} from "@edugames/contracts";
import Fastify from "fastify";
import { ZodError } from "zod";

import { defaultApiConfig, type ApiConfig } from "./config.js";
import { ApiError } from "./errors.js";
import { requireInstallationAuth } from "./http/auth.js";
import { InMemoryPlatformRepository } from "./repositories/in-memory-platform-repository.js";
import { InstallationsService } from "./services/installations-service.js";
import { ProfilesService } from "./services/profiles-service.js";

type Clock = {
  now: () => Date;
};

export type CreateAppOptions = {
  config?: Partial<ApiConfig>;
  repository?: InMemoryPlatformRepository;
  clock?: Clock;
};

export const createApp = (options: CreateAppOptions = {}) => {
  const repository = options.repository ?? new InMemoryPlatformRepository();
  const clock = options.clock ?? {
    now: () => new Date()
  };
  const config: ApiConfig = {
    ...defaultApiConfig,
    ...options.config
  };
  const installationsService = new InstallationsService(repository, config, clock);
  const profilesService = new ProfilesService(repository, clock);
  const app = Fastify({
    logger: false
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];

      return reply.status(400).send({
        error: "Bad Request",
        message: firstIssue?.message ?? "Request validation failed."
      });
    }

    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: "Request Failed",
        message: error.message
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: "Internal Server Error",
      message: "An unexpected error occurred."
    });
  });

  app.get("/healthz", async () => ({
    status: "ok"
  }));

  app.get("/readyz", async () => ({
    status: "ready"
  }));

  app.post("/v1/installations/register", async (request, reply) => {
    const payload = registerInstallationRequestSchema.parse(request.body);
    const response = registerInstallationResponseSchema.parse(
      installationsService.register(payload)
    );

    return reply.status(200).send(response);
  });

  app.post("/v1/installations/refresh", async (request, reply) => {
    const payload = refreshInstallationRequestSchema.parse(request.body);
    const response = refreshInstallationResponseSchema.parse(
      installationsService.refresh(payload)
    );

    return reply.status(200).send(response);
  });

  app.addHook("preHandler", async (request) => {
    if (
      request.url.startsWith("/v1/profiles") ||
      request.url.startsWith("/v1/catalog") ||
      request.url.startsWith("/v1/games") ||
      request.url.startsWith("/v1/launch-sessions")
    ) {
      requireInstallationAuth(request, repository, config, clock.now());
    }
  });

  app.post("/v1/profiles", async (request, reply) => {
    const installationAuth = request.installationAuth;

    if (!installationAuth) {
      throw new ApiError(401, "Missing installation authentication.");
    }

    const payload = createProfileRequestSchema.parse(request.body);
    const response = createProfileResponseSchema.parse(
      profilesService.create(installationAuth.installationId, payload)
    );

    return reply.status(201).send(response);
  });

  app.get("/v1/profiles", async (request, reply) => {
    const installationAuth = request.installationAuth;

    if (!installationAuth) {
      throw new ApiError(401, "Missing installation authentication.");
    }

    const response = listProfilesResponseSchema.parse(
      profilesService.list(installationAuth.installationId)
    );

    return reply.status(200).send(response);
  });

  app.delete("/v1/profiles/:profileId", async (request, reply) => {
    const installationAuth = request.installationAuth;

    if (!installationAuth) {
      throw new ApiError(401, "Missing installation authentication.");
    }

    const profileId = (request.params as { profileId: string }).profileId;
    const parsedProfileId = profileIdSchema.parse(profileId);
    const response = deleteProfileResponseSchema.parse(
      profilesService.delete(installationAuth.installationId, parsedProfileId)
    );

    return reply.status(200).send(response);
  });

  return app;
};
