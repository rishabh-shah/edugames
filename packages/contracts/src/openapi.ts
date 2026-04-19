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
  DeleteProfileResponse: deleteProfileResponseSchema
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
