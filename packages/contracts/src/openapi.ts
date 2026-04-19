import {
  catalogResponseSchema,
  gameDetailResponseSchema
} from "./catalog.js";
import {
  createProfileRequestSchema,
  createProfileResponseSchema,
  deleteProfileResponseSchema,
  listProfilesResponseSchema
} from "./profiles.js";
import {
  refreshInstallationRequestSchema,
  refreshInstallationResponseSchema,
  registerInstallationRequestSchema,
  registerInstallationResponseSchema
} from "./installations.js";
import {
  createReportRequestSchema,
  createReportResponseSchema
} from "./reports.js";
import {
  createModerationActionResponseSchema,
  listModerationGamesResponseSchema,
  listModerationReportsResponseSchema,
  moderationReasonRequestSchema,
  resolveModerationReportResponseSchema
} from "./moderation.js";
import {
  launchSessionRequestSchema,
  launchSessionResponseSchema
} from "./launch.js";
import {
  telemetryBatchRequestSchema,
  telemetryBatchResponseSchema
} from "./telemetry.js";
type OpenApiSchemaRef = {
  $ref: string;
};

type OpenApiOperation = {
  operationId: string;
  requestBody?: {
    required: true;
    content: {
      "application/json": {
        schema: OpenApiSchemaRef;
      };
    };
  };
  responses: Record<
    string,
    {
      description: string;
      content?: {
        "application/json": {
          schema: OpenApiSchemaRef;
        };
      };
    }
  >;
};

type OpenApiDocument = {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Partial<Record<"get" | "post" | "delete", OpenApiOperation>>>;
  components: {
    schemas: Record<string, { title: string; description: string }>;
  };
};

const schemaEntries = {
  RegisterInstallationRequest: registerInstallationRequestSchema,
  RegisterInstallationResponse: registerInstallationResponseSchema,
  RefreshInstallationRequest: refreshInstallationRequestSchema,
  RefreshInstallationResponse: refreshInstallationResponseSchema,
  CreateProfileRequest: createProfileRequestSchema,
  CreateProfileResponse: createProfileResponseSchema,
  ListProfilesResponse: listProfilesResponseSchema,
  DeleteProfileResponse: deleteProfileResponseSchema,
  CatalogResponse: catalogResponseSchema,
  GameDetailResponse: gameDetailResponseSchema,
  LaunchSessionRequest: launchSessionRequestSchema,
  LaunchSessionResponse: launchSessionResponseSchema,
  CreateReportRequest: createReportRequestSchema,
  CreateReportResponse: createReportResponseSchema,
  TelemetryBatchRequest: telemetryBatchRequestSchema,
  TelemetryBatchResponse: telemetryBatchResponseSchema,
  ListModerationGamesResponse: listModerationGamesResponseSchema,
  ListModerationReportsResponse: listModerationReportsResponseSchema,
  ModerationReasonRequest: moderationReasonRequestSchema,
  ModerationActionResponse: createModerationActionResponseSchema,
  ResolveModerationReportResponse: resolveModerationReportResponseSchema
};

const ref = (name: keyof typeof schemaEntries): OpenApiSchemaRef => ({
  $ref: `#/components/schemas/${name}`
});

export const createOpenApiDocument = (version = "0.1.0"): OpenApiDocument => ({
  openapi: "3.1.0",
  info: {
    title: "EduGames Platform API",
    version
  },
  paths: {
    "/v1/installations/register": {
      post: {
        operationId: "registerInstallation",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("RegisterInstallationRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Installation registered",
            content: {
              "application/json": {
                schema: ref("RegisterInstallationResponse")
              }
            }
          }
        }
      }
    },
    "/v1/installations/refresh": {
      post: {
        operationId: "refreshInstallationSession",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("RefreshInstallationRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Installation session refreshed",
            content: {
              "application/json": {
                schema: ref("RefreshInstallationResponse")
              }
            }
          }
        }
      }
    },
    "/v1/profiles": {
      get: {
        operationId: "listProfiles",
        responses: {
          "200": {
            description: "Profiles for the authenticated installation",
            content: {
              "application/json": {
                schema: ref("ListProfilesResponse")
              }
            }
          }
        }
      },
      post: {
        operationId: "createProfile",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("CreateProfileRequest")
            }
          }
        },
        responses: {
          "201": {
            description: "Profile created",
            content: {
              "application/json": {
                schema: ref("CreateProfileResponse")
              }
            }
          }
        }
      }
    },
    "/v1/profiles/{profileId}": {
      delete: {
        operationId: "deleteProfile",
        responses: {
          "200": {
            description: "Profile deleted",
            content: {
              "application/json": {
                schema: ref("DeleteProfileResponse")
              }
            }
          }
        }
      }
    },
    "/v1/catalog": {
      get: {
        operationId: "getCatalog",
        responses: {
          "200": {
            description: "Catalog for the selected profile",
            content: {
              "application/json": {
                schema: ref("CatalogResponse")
              }
            }
          }
        }
      }
    },
    "/v1/games/{slug}": {
      get: {
        operationId: "getGameDetail",
        responses: {
          "200": {
            description: "Game detail for the selected profile",
            content: {
              "application/json": {
                schema: ref("GameDetailResponse")
              }
            }
          }
        }
      }
    },
    "/v1/launch-sessions": {
      post: {
        operationId: "createLaunchSession",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("LaunchSessionRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Launch session created",
            content: {
              "application/json": {
                schema: ref("LaunchSessionResponse")
              }
            }
          }
        }
      }
    },
    "/v1/reports": {
      post: {
        operationId: "createReport",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("CreateReportRequest")
            }
          }
        },
        responses: {
          "201": {
            description: "Report submitted",
            content: {
              "application/json": {
                schema: ref("CreateReportResponse")
              }
            }
          }
        }
      }
    },
    "/v1/telemetry/batches": {
      post: {
        operationId: "ingestTelemetryBatch",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("TelemetryBatchRequest")
            }
          }
        },
        responses: {
          "202": {
            description: "Telemetry batch accepted",
            content: {
              "application/json": {
                schema: ref("TelemetryBatchResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/games": {
      get: {
        operationId: "listModerationGames",
        responses: {
          "200": {
            description: "Games listed for moderation review",
            content: {
              "application/json": {
                schema: ref("ListModerationGamesResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/games/{gameId}/disable": {
      post: {
        operationId: "disableGame",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("ModerationReasonRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Game disabled",
            content: {
              "application/json": {
                schema: ref("ModerationActionResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/games/{gameId}/approve": {
      post: {
        operationId: "approveGame",
        responses: {
          "200": {
            description: "Queued game approved and made live",
            content: {
              "application/json": {
                schema: ref("ModerationActionResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/games/{gameId}/enable": {
      post: {
        operationId: "enableGame",
        responses: {
          "200": {
            description: "Game enabled",
            content: {
              "application/json": {
                schema: ref("ModerationActionResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/reports": {
      get: {
        operationId: "listModerationReports",
        responses: {
          "200": {
            description: "Reports listed for moderation review",
            content: {
              "application/json": {
                schema: ref("ListModerationReportsResponse")
              }
            }
          }
        }
      }
    },
    "/v1/admin/reports/{reportId}/resolve": {
      post: {
        operationId: "resolveReport",
        responses: {
          "200": {
            description: "Report marked resolved",
            content: {
              "application/json": {
                schema: ref("ResolveModerationReportResponse")
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: Object.fromEntries(
      Object.keys(schemaEntries).map((name) => [
        name,
        {
          title: name,
          description: `Schema generated from the ${name} contract definition.`
        }
      ])
    )
  }
});
