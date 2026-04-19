export type ApiConfig = {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  adminApiKey: string;
};

export const defaultApiConfig: ApiConfig = {
  jwtSecret: "edugames-dev-secret",
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 90 * 24 * 60 * 60,
  adminApiKey: "edugames-admin-dev-key"
};
