export type ApiConfig = {
  jwtSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
};

export const defaultApiConfig: ApiConfig = {
  jwtSecret: "edugames-dev-secret",
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 90 * 24 * 60 * 60
};
