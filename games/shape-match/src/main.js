import { createEduGameSdk } from "./vendor/edugames-sdk.js";

import {
  SHAPE_LIBRARY,
  advanceCelebration,
  createInitialGameState,
  createProgressSnapshot,
  createTextSnapshot,
  placeSelectedShape,
  selectTrayShape,
  startGame
} from "./game-logic.js";

const GAME_ID = "shape-match";
const GAME_VERSION = "0.1.0";
const createPassiveNode = () => ({
  dataset: {},
  hidden: false,
  textContent: ""
});

const drawRoundedCard = (context, x, y, width, height, fillStyle, strokeStyle) => {
  context.save();
  context.fillStyle = fillStyle;
  context.strokeStyle = strokeStyle;
  context.lineWidth = 4;
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, width, height, 24);
    context.fill();
    context.stroke();
  } else {
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
  }
  context.restore();
};

const drawShape = (context, shapeId, centerX, centerY, size, options = {}) => {
  const palette = SHAPE_LIBRARY[shapeId];
  const fillStyle = options.fillStyle ?? palette.color;
  const strokeStyle = options.strokeStyle ?? "#234";
  const isGhost = options.isGhost ?? false;
  const scale = options.scale ?? 1;
  const radius = size * scale;

  context.save();
  context.fillStyle = fillStyle;
  context.strokeStyle = strokeStyle;
  context.lineWidth = 6;
  context.globalAlpha = isGhost ? 0.18 : 1;

  if (shapeId === "circle") {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  } else if (shapeId === "square") {
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
    context.strokeRect(
      centerX - radius,
      centerY - radius,
      radius * 2,
      radius * 2
    );
  } else if (shapeId === "triangle") {
    context.beginPath();
    context.moveTo(centerX, centerY - radius * 1.2);
    context.lineTo(centerX - radius * 1.1, centerY + radius);
    context.lineTo(centerX + radius * 1.1, centerY + radius);
    context.closePath();
    context.fill();
    context.stroke();
  } else if (shapeId === "star") {
    const points = 5;
    const innerRadius = radius * 0.45;

    context.beginPath();
    for (let pointIndex = 0; pointIndex < points * 2; pointIndex += 1) {
      const angle = (Math.PI / points) * pointIndex - Math.PI / 2;
      const currentRadius = pointIndex % 2 === 0 ? radius : innerRadius;
      const x = centerX + Math.cos(angle) * currentRadius;
      const y = centerY + Math.sin(angle) * currentRadius;

      if (pointIndex === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fill();
    context.stroke();
  }

  context.restore();
};

const createLayout = (canvas, state) => {
  const width = canvas.width;
  const height = canvas.height;
  const activeRound = state.rounds[state.roundIndex];
  const targetCount = activeRound.targets.length;
  const trayCount = activeRound.trayShapeIds.length;
  const cardWidth = Math.min(180, (width - 240) / Math.max(targetCount, trayCount));
  const cardHeight = 168;
  const targetGap = 28;
  const trayGap = 28;
  const targetTotalWidth = targetCount * cardWidth + (targetCount - 1) * targetGap;
  const trayTotalWidth = trayCount * cardWidth + (trayCount - 1) * trayGap;
  const targetStartX = (width - targetTotalWidth) / 2;
  const trayStartX = (width - trayTotalWidth) / 2;

  return {
    targets: activeRound.targets.map((target, index) => ({
      ...target,
      x: targetStartX + index * (cardWidth + targetGap),
      y: 132,
      width: cardWidth,
      height: cardHeight
    })),
    tray: activeRound.trayShapeIds.map((shapeId, index) => ({
      shapeId,
      x: trayStartX + index * (cardWidth + trayGap),
      y: height - 232,
      width: cardWidth,
      height: cardHeight
    }))
  };
};

const getCardCenter = (card) => ({
  x: card.x + card.width / 2,
  y: card.y + card.height / 2
});

const pointInCard = (pointX, pointY, card) =>
  pointX >= card.x &&
  pointX <= card.x + card.width &&
  pointY >= card.y &&
  pointY <= card.y + card.height;

const noop = () => {};

export const createShapeMatchApp = ({
  documentObject = globalThis.document,
  windowObject = globalThis,
  sdk = createEduGameSdk({
    gameId: GAME_ID,
    globalObject: globalThis
  })
} = {}) => {
  const appShell = documentObject.getElementById("shape-match-app") ?? createPassiveNode();
  const canvas = documentObject.getElementById("game-canvas");
  const startButton = documentObject.getElementById("start-button");
  const restartButton = documentObject.getElementById("restart-button");
  const exitButton = documentObject.getElementById("exit-button");
  const promptNode = documentObject.getElementById("prompt-text") ?? createPassiveNode();
  const progressNode = documentObject.getElementById("progress-state") ?? createPassiveNode();
  const targetsNode = documentObject.getElementById("target-state") ?? createPassiveNode();
  const completionNode =
    documentObject.getElementById("completion-state") ?? createPassiveNode();
  const statusNode = documentObject.getElementById("status-text") ?? createPassiveNode();
  const context = canvas.getContext("2d");

  const postDebugLog = (message, details = {}) => {
    try {
      windowObject.webkit?.messageHandlers?.edugames?.postMessage({
        type: "debug-log",
        gameId: GAME_ID,
        message,
        details
      });
    } catch {
      // Ignore logging failures so runtime behavior stays unchanged.
    }
  };

  let state = createInitialGameState();
  let lastLayout = createLayout(canvas, state);

  const persistProgress = () => {
    Promise.resolve(sdk.saveState(createProgressSnapshot(state))).catch(noop);
  };

  const setStatus = () => {
    const snapshot = createTextSnapshot(state);
    const promptCopy =
      state.mode === "complete"
        ? "Garden complete! Every shape found its home."
        : snapshot.round.prompt;

    windowObject.__shapeMatchState = snapshot;
    appShell.dataset.mode = state.mode;
    appShell.dataset.round = String(snapshot.round.index);
    promptNode.dataset.mode = state.mode;
    promptNode.textContent = promptCopy;
    progressNode.dataset.round = String(snapshot.round.index);
    progressNode.dataset.totalRounds = String(snapshot.round.total);
    progressNode.dataset.sessionStars = String(snapshot.sessionStars);
    progressNode.textContent = `Round ${snapshot.round.index} of ${snapshot.round.total} · Stars ${snapshot.sessionStars}`;
    targetsNode.dataset.targets = JSON.stringify(snapshot.targets);
    targetsNode.dataset.selectedShapeId = snapshot.selectedShapeId ?? "";
    targetsNode.textContent = snapshot.targets
      .map((target) => `${target.shapeId}:${target.matched ? "matched" : "open"}`)
      .join(" | ");
    completionNode.dataset.visible = state.mode === "complete" ? "true" : "false";
    completionNode.hidden = state.mode !== "complete";
    completionNode.textContent =
      state.mode === "complete"
        ? `You finished with ${snapshot.sessionStars} stars.`
        : "";
    statusNode.textContent = state.feedbackMessage;
  };

  const render = () => {
    lastLayout = createLayout(canvas, state);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const skyGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, "#eff8ff");
    skyGradient.addColorStop(1, "#fff8df");
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#d7f4ce";
    context.fillRect(0, canvas.height - 110, canvas.width, 110);

    context.fillStyle = "#27403d";
    context.font = "700 42px 'Avenir Next', 'Trebuchet MS', sans-serif";
    context.fillText("Shape Match Garden", 56, 70);

    context.fillStyle = "#496465";
    context.font = "600 26px 'Avenir Next', 'Trebuchet MS', sans-serif";
    context.fillText(state.feedbackMessage, 56, 108);

    context.fillStyle = "#27403d";
    context.font = "700 28px 'Avenir Next', 'Trebuchet MS', sans-serif";
    context.fillText(`Stars: ${state.sessionStars}`, canvas.width - 220, 72);
    context.fillText(
      `Round ${state.roundIndex + 1} of ${state.rounds.length}`,
      canvas.width - 300,
      110
    );

    for (const target of lastLayout.targets) {
      drawRoundedCard(context, target.x, target.y, target.width, target.height, "#ffffff", "#d4ecff");
      const center = getCardCenter(target);
      const matched = state.rounds[state.roundIndex].matchedTargetIds.includes(target.id);
      drawShape(context, target.shapeId, center.x, center.y, 42, {
        fillStyle: matched ? SHAPE_LIBRARY[target.shapeId].color : "#ffffff",
        strokeStyle: "#6b8f9b",
        isGhost: !matched
      });

      if (matched) {
        context.fillStyle = "#27403d";
        context.font = "700 22px 'Avenir Next', 'Trebuchet MS', sans-serif";
        context.fillText("Matched!", target.x + 32, target.y + target.height - 24);
      }
    }

    for (const trayItem of lastLayout.tray) {
      const selected = state.selectedShapeId === trayItem.shapeId;
      const alreadyMatched = state.rounds[state.roundIndex].matchedTargetIds.includes(
        `target-${trayItem.shapeId}`
      );
      drawRoundedCard(
        context,
        trayItem.x,
        trayItem.y,
        trayItem.width,
        trayItem.height,
        selected ? "#fff4b8" : "#ffffff",
        selected ? "#e5b300" : "#d8e2ec"
      );
      const center = getCardCenter(trayItem);
      drawShape(context, trayItem.shapeId, center.x, center.y, 42, {
        fillStyle: SHAPE_LIBRARY[trayItem.shapeId].color,
        strokeStyle: "#27403d",
        isGhost: alreadyMatched
      });
    }

    if (state.mode === "intro" || state.mode === "complete") {
      drawRoundedCard(context, 330, 220, 620, 210, "#ffffffdd", "#f3d77e");
      context.fillStyle = "#27403d";
      context.font = "700 34px 'Avenir Next', 'Trebuchet MS', sans-serif";
      context.fillText(
        state.mode === "intro" ? "Tap Start to begin!" : "Garden complete!",
        438,
        286
      );
      context.font = "600 24px 'Avenir Next', 'Trebuchet MS', sans-serif";
      context.fillText("Pick a shape, then tap the matching outline.", 398, 334);
      context.fillText("Play best in landscape on iPad or desktop.", 408, 372);
    }

    if (state.mode === "celebration" || state.showCelebrationBurst) {
      const sparkleY = 150 + Math.sin(Date.now() / 180) * 8;
      drawShape(context, "star", 1180, sparkleY, 26, {
        fillStyle: "#ffd55e",
        strokeStyle: "#d89c00"
      });
      drawShape(context, "star", 1080, sparkleY + 50, 18, {
        fillStyle: "#ffd55e",
        strokeStyle: "#d89c00"
      });
      drawShape(context, "star", 1138, sparkleY + 82, 14, {
        fillStyle: "#ffd55e",
        strokeStyle: "#d89c00"
      });
    }

    setStatus();
  };

  const emitCompletionEvents = (previousState, nextState) => {
    if (previousState.sessionStars !== nextState.sessionStars) {
      sdk.emitEvent("shape_matched", 1);
      persistProgress();
    }

    if (previousState.mode !== "celebration" && nextState.mode === "celebration") {
      sdk.emitEvent("round_completed", 1);
    }

    if (previousState.mode !== "complete" && nextState.mode === "complete") {
      sdk.emitEvent("game_completed", 1);
      persistProgress();
    }
  };

  const applyState = (nextState) => {
    const previousState = state;
    state = nextState;
    emitCompletionEvents(previousState, nextState);
    render();
  };

  const chooseTrayShape = (shapeId) => {
    applyState(selectTrayShape(state, shapeId));
  };

  const placeOnTarget = (targetId) => {
    applyState(placeSelectedShape(state, targetId));
  };

  const advanceTime = (elapsedMs) => {
    if (state.mode === "celebration") {
      applyState(advanceCelebration(state, elapsedMs));
      return;
    }

    render();
  };

  const handleCanvasClick = (clientX, clientY) => {
    const bounds = canvas.getBoundingClientRect();
    const x = ((clientX - bounds.left) / bounds.width) * canvas.width;
    const y = ((clientY - bounds.top) / bounds.height) * canvas.height;

    const trayHit = lastLayout.tray.find((item) => pointInCard(x, y, item));
    if (trayHit) {
      chooseTrayShape(trayHit.shapeId);
      return;
    }

    const targetHit = lastLayout.targets.find((item) => pointInCard(x, y, item));
    if (targetHit) {
      placeOnTarget(targetHit.id);
    }
  };

  const toggleFullscreen = () => {
    const fullscreenElement = documentObject.fullscreenElement;

    if (fullscreenElement) {
      documentObject.exitFullscreen?.();
      return;
    }

    canvas.requestFullscreen?.();
  };

  const handleKeydown = (event) => {
    if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    }
  };

  const start = () => {
    postDebugLog("start button clicked", { mode: state.mode });

    try {
      applyState(startGame(state));
      postDebugLog("start applied state", { mode: state.mode });
      sdk.emitEvent("game_started", 1);
      persistProgress();
    } catch (error) {
      postDebugLog("start failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const restart = () => {
    applyState(startGame(state));
    persistProgress();
  };

  const requestExit = () => {
    sdk.requestExit();
    state = {
      ...state,
      feedbackMessage: "An adult can choose another game from the shelf."
    };
    render();
  };

  const init = async () => {
    postDebugLog("init started");

    try {
      const savedProgress = await sdk.loadState();
      postDebugLog("loadState resolved", {
        hasSavedProgress: savedProgress !== null
      });
      state = createInitialGameState({
        savedProgress
      });

      sdk.ready({
        version: GAME_VERSION,
        inputModes: ["touch", "mouse"],
        offlineReady: true
      });

      canvas.addEventListener("click", (event) => {
        postDebugLog("canvas clicked", {
          clientX: event.clientX,
          clientY: event.clientY
        });
        handleCanvasClick(event.clientX, event.clientY);
      });
      startButton.addEventListener("click", start);
      restartButton.addEventListener("click", restart);
      exitButton.addEventListener("click", requestExit);
      windowObject.addEventListener("keydown", handleKeydown);

      windowObject.render_game_to_text = () =>
        JSON.stringify(createTextSnapshot(state));
      windowObject.advanceTime = (elapsedMs) => {
        advanceTime(elapsedMs);
      };
      windowObject.__shapeMatchApp = api;

      render();
      postDebugLog("init finished", { mode: state.mode });
    } catch (error) {
      postDebugLog("init failed", {
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };

  const api = {
    init,
    chooseTrayShape,
    placeOnTarget,
    advanceTime,
    getState() {
      return state;
    },
    getLayout() {
      return lastLayout;
    },
    render
  };

  return api;
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const root = document.getElementById("shape-match-app");

  if (root) {
    const app = createShapeMatchApp({
      documentObject: document,
      windowObject: window,
      sdk: createEduGameSdk({
        gameId: GAME_ID,
        globalObject: window
      })
    });

    window.__shapeMatchApp = app;
    void app.init();
  }
}
