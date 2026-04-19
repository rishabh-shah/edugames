import { describe, expect, it } from "vitest";

import { createShapeMatchApp } from "../src/main.js";

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

const createEnvironment = () => {
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
    parent: null,
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {}
    }
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
    statusNode,
    targetsNode,
    windowObject
  };
};

describe("shape-match runtime wiring", () => {
  it("boots the app, reports readiness, and exposes text hooks", async () => {
    const env = createEnvironment();
    const transportMessages = [];
    const saveStates = [];
    const app = createShapeMatchApp({
      documentObject: env.documentObject,
      windowObject: env.windowObject,
      sdk: {
        async loadState() {
          return {
            bestSessionStars: 3,
            sessionsCompleted: 1
          };
        },
        ready(metadata) {
          transportMessages.push({
            type: "ready",
            metadata
          });
        },
        emitEvent(name, value) {
          transportMessages.push({
            type: "event",
            name,
            value
          });
        },
        async saveState(state) {
          saveStates.push(state);
        },
        requestExit() {
          transportMessages.push({
            type: "request-exit"
          });
        }
      }
    });

    await app.init();

    expect(transportMessages[0]).toMatchObject({
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
    expect(env.statusNode.textContent).toMatch(/tap start/i);

    env.startButton.click();
    app.chooseTrayShape("circle");
    app.placeOnTarget("target-circle");
    app.chooseTrayShape("square");
    app.placeOnTarget("target-square");

    expect(saveStates.at(-1)).toMatchObject({
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
    expect(transportMessages.at(-1)).toEqual({
      type: "request-exit"
    });
  });
});
