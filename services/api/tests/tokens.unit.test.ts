import { describe, expect, it } from "vitest";

import { createAccessToken, verifyAccessToken } from "../src/domain/tokens.js";

describe("access token utilities", () => {
  it("signs and verifies installation access tokens", () => {
    const token = createAccessToken(
      {
        sub: "inst_123abc",
        sid: "sess_123abc",
        cohort: "general"
      },
      "secret",
      1_700_000_000,
      900
    );

    const claims = verifyAccessToken(token, "secret", 1_700_000_100);

    expect(claims?.sub).toBe("inst_123abc");
    expect(claims?.sid).toBe("sess_123abc");
  });

  it("rejects expired or tampered tokens", () => {
    const token = createAccessToken(
      {
        sub: "inst_123abc",
        sid: "sess_123abc",
        cohort: "general"
      },
      "secret",
      100,
      60
    );

    expect(verifyAccessToken(token, "secret", 200)).toBeNull();
    expect(verifyAccessToken(`${token}tampered`, "secret", 120)).toBeNull();
  });
});
