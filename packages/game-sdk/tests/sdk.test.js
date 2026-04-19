import { describe, expect, it } from "vitest";

import {
  createEduGameSdk,
  createLocalStateStore,
  createMessageTransport
} from "../src/index.js";

describe("game sdk", () => {
  it("persists and reloads save-state payloads", async () => {
    /** @type {{ localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void } }} */
    const fakeWindow = {};
    const storage = createLocalStateStore(fakeWindow, "shape-match");

    await storage.save({
      score: 2,
      round: 3
    });

    await expect(storage.load()).resolves.toEqual({
      score: 2,
      round: 3
    });
  });

  it("emits bridge messages for runtime events", async () => {
    /** @type {{ localStorage?: { getItem(key: string): string | null; setItem(key: string, value: string): void } }} */
    const fakeWindow = {};
    const transport = createMessageTransport(fakeWindow);
    const sdk = createEduGameSdk({
      gameId: "shape-match",
      globalObject: fakeWindow,
      transport
    });

    sdk.ready({
      version: "1.0.0"
    });
    sdk.emitEvent("milestone:first-match", 1);
    await sdk.saveState({
      score: 1
    });
    sdk.requestExit();

    expect(transport.messages).toEqual([
      {
        type: "ready",
        gameId: "shape-match",
        metadata: {
          version: "1.0.0"
        }
      },
      {
        type: "event",
        gameId: "shape-match",
        name: "milestone:first-match",
        value: 1
      },
      {
        type: "save-state",
        gameId: "shape-match",
        state: {
          score: 1
        }
      },
      {
        type: "request-exit",
        gameId: "shape-match"
      }
    ]);
  });

  it("treats malformed persisted state as empty progress", async () => {
    const fakeWindow = {
      localStorage: {
        getItem() {
          return "{not-json";
        },
        setItem() {}
      }
    };
    const storage = createLocalStateStore(fakeWindow, "shape-match");

    await expect(storage.load()).resolves.toBeNull();
  });
});
