import { describe, expect, it } from "vitest";

import { createShapeMatchApp } from "../src/main.js";
import { createEduGameSdk } from "../src/vendor/edugames-sdk.js";

const createCanvasContext = () => ({
  clearRect() {},
  fillRect() {},
  strokeRect() {},
  beginPath() {},
  closePath() {},
  arc() {},
  moveTo() {},
  lineTo() {},
  fill() {},
  stroke() {},
  roundRect() {},
  save() {},
  restore() {},
  translate() {},
  rotate() {},
  scale() {},
  setLineDash() {},
  fillText() {},
  strokeText() {},
  createLinearGradient() {
    return {
      addColorStop() {}
    };
  }
});

const createButton = () => {
  const listeners = new Map();

  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    click() {
      listeners.get("click")?.();
    }
  };
};

const createEnvironment = ({ bridge = null, storageSeed = {} } = {}) => {
  const canvasListeners = new Map();
  const canvas = {
    width: 1280,
    height: 720,
    addEventListener(type, handler) {
      canvasListeners.set(type, handler);
    },
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: 1280,
        height: 720
      };
    },
    getContext() {
      return createCanvasContext();
    }
  };
  const startButton = createButton();
  const restartButton = createButton();
  const exitButton = createButton();
  const appShell = {
    dataset: {}
  };
  const promptNode = {
    dataset: {},
    textContent: ""
  };
  const progressNode = {
    dataset: {},
    textContent: ""
  };
  const targetsNode = {
    dataset: {},
    textContent: ""
  };
  const completionNode = {
    dataset: {},
    hidden: true,
    textContent: ""
  };
  const statusNode = {
    textContent: ""
  };
  const listeners = new Map();
  const documentObject = {
    getElementById(id) {
      return {
        "shape-match-app": appShell,
        "game-canvas": canvas,
        "start-button": startButton,
        "restart-button": restartButton,
        "exit-button": exitButton,
        "prompt-text": promptNode,
        "progress-state": progressNode,
        "target-state": targetsNode,
        "completion-state": completionNode,
        "status-text": statusNode
      }[id];
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    }
  };
  const storage = new Map(Object.entries(storageSeed));
  const parentMessages = [];
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };
  const windowObject = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    requestAnimationFrame(handler) {
      handler(0);
      return 1;
    },
    cancelAnimationFrame() {},
    parent: {
      postMessage(message) {
        parentMessages.push(message);
      }
    },
    localStorage,
    eduGamesBridge: bridge
  };

  return {
    appShell,
    canvas,
    canvasListeners,
    completionNode,
    documentObject,
    exitButton,
    progressNode,
    promptNode,
    restartButton,
    startButton,
    localStorage,
    parentMessages,
    statusNode,
    storage,
    targetsNode,
    windowObject
  };
};

describe("shape-match runtime wiring", () => {
  it("boots the app, reports readiness, and exposes text hooks", async () => {
    const env = createEnvironment({
      storageSeed: {
        "edugames:shape-match:save-state": JSON.stringify({
          bestSessionStars: 3,
          sessionsCompleted: 1
        })
      }
    });
    const sdk = createEduGameSdk({
      gameId: "shape-match",
      globalObject: env.windowObject
    });
    const app = createShapeMatchApp({
      documentObject: env.documentObject,
      windowObject: env.windowObject,
      sdk
    });

    await app.init();

    expect(env.parentMessages[0]).toMatchObject({
      type: "ready"
    });
    expect(typeof env.windowObject.render_game_to_text).toBe("function");
    expect(typeof env.windowObject.advanceTime).toBe("function");
    expect(env.windowObject.__shapeMatchApp).toBe(app);
    expect(env.appShell.dataset.mode).toBe("intro");
    expect(env.promptNode.dataset.mode).toBe("intro");
    expect(env.progressNode.dataset.round).toBe("1");
    expect(JSON.parse(env.targetsNode.dataset.targets)).toHaveLength(2);
    expect(env.completionNode.dataset.visible).toBe("false");
    expect(env.windowObject.__shapeMatchState.mode).toBe("intro");
    expect(env.windowObject.__shapeMatchState.bestSessionStars).toBe(3);
    expect(env.statusNode.textContent).toMatch(/tap start/i);

    env.startButton.click();
    app.chooseTrayShape("circle");
    app.placeOnTarget("target-circle");
    app.chooseTrayShape("square");
    app.placeOnTarget("target-square");

    expect(JSON.parse(env.localStorage.getItem("edugames:shape-match:save-state"))).toMatchObject({
      bestSessionStars: 3,
      sessionsCompleted: 1
    });
    expect(
      JSON.parse(env.targetsNode.dataset.targets).every((target) => target.matched)
    ).toBe(true);

    app.advanceTime(1600);
    app.chooseTrayShape("triangle");
    app.placeOnTarget("target-triangle");
    app.chooseTrayShape("star");
    app.placeOnTarget("target-star");
    app.chooseTrayShape("circle");
    app.placeOnTarget("target-circle");
    app.advanceTime(1600);
    app.chooseTrayShape("square");
    app.placeOnTarget("target-square");
    app.chooseTrayShape("triangle");
    app.placeOnTarget("target-triangle");
    app.chooseTrayShape("circle");
    app.placeOnTarget("target-circle");
    app.chooseTrayShape("star");
    app.placeOnTarget("target-star");
    app.advanceTime(1600);

    expect(env.appShell.dataset.mode).toBe("complete");
    expect(env.completionNode.dataset.visible).toBe("true");
    expect(env.completionNode.hidden).toBe(false);
    expect(env.windowObject.__shapeMatchState.mode).toBe("complete");

    env.exitButton.click();
    expect(env.parentMessages.at(-1)).toMatchObject({
      type: "request-exit",
      gameId: "shape-match",
      source: "edugames-game"
    });
  });

  it("uses the native bridge when it is available", async () => {
    const bridgeLoadCalls = [];
    const bridgeSaveCalls = [];
    const env = createEnvironment({
      bridge: {
        async loadState() {
          bridgeLoadCalls.push("load");
          return {
            bestSessionStars: 4,
            sessionsCompleted: 2
          };
        },
        async saveState(state) {
          bridgeSaveCalls.push(state);
        }
      },
      storageSeed: {
        "edugames:shape-match:save-state": JSON.stringify({
          bestSessionStars: 1,
          sessionsCompleted: 9
        })
      }
    });
    const sdk = createEduGameSdk({
      gameId: "shape-match",
      globalObject: env.windowObject
    });
    const app = createShapeMatchApp({
      documentObject: env.documentObject,
      windowObject: env.windowObject,
      sdk
    });

    await app.init();

    expect(bridgeLoadCalls).toEqual(["load"]);
    expect(env.localStorage.getItem("edugames:shape-match:save-state")).toBe(
      JSON.stringify({
        bestSessionStars: 1,
        sessionsCompleted: 9
      })
    );
    expect(env.windowObject.__shapeMatchState.bestSessionStars).toBe(4);

    env.startButton.click();

    expect(bridgeSaveCalls.at(-1)).toMatchObject({
      bestSessionStars: 4,
      sessionsCompleted: 2
    });
  });

  it("falls back to localStorage when the bridge is absent", async () => {
    const env = createEnvironment({
      storageSeed: {
        "edugames:shape-match:save-state": JSON.stringify({
          bestSessionStars: 6,
          sessionsCompleted: 5
        })
      }
    });
    delete env.windowObject.eduGamesBridge;
    const sdk = createEduGameSdk({
      gameId: "shape-match",
      globalObject: env.windowObject
    });

    expect(await sdk.loadState()).toEqual({
      bestSessionStars: 6,
      sessionsCompleted: 5
    });

    await sdk.saveState({
      bestSessionStars: 7,
      sessionsCompleted: 6
    });

    expect(JSON.parse(env.localStorage.getItem("edugames:shape-match:save-state"))).toEqual({
      bestSessionStars: 7,
      sessionsCompleted: 6
    });
    expect(env.parentMessages.at(-1)).toMatchObject({
      type: "save-state",
      gameId: "shape-match"
    });
  });
});
