export const SHAPE_LIBRARY = {
  circle: {
    id: "circle",
    label: "Circle",
    color: "#ff7a8a",
    shadowColor: "#ffc8d1"
  },
  square: {
    id: "square",
    label: "Square",
    color: "#4aa6ff",
    shadowColor: "#c9e7ff"
  },
  triangle: {
    id: "triangle",
    label: "Triangle",
    color: "#f7c64b",
    shadowColor: "#ffedb4"
  },
  star: {
    id: "star",
    label: "Star",
    color: "#62c67e",
    shadowColor: "#d6f7df"
  }
};

export const ROUND_BLUEPRINTS = [
  {
    id: "garden-gate",
    prompt: "Match the two shapes at the top!",
    targetShapeIds: ["circle", "square"],
    trayShapeIds: ["square", "circle"]
  },
  {
    id: "sunny-path",
    prompt: "Match all three bright shapes!",
    targetShapeIds: ["triangle", "star", "circle"],
    trayShapeIds: ["circle", "triangle", "star"]
  },
  {
    id: "rainbow-finish",
    prompt: "Finish with every shape in the rainbow row!",
    targetShapeIds: ["square", "triangle", "circle", "star"],
    trayShapeIds: ["star", "square", "triangle", "circle"]
  }
];

const CELEBRATION_DURATION_MS = 1500;

const createRound = (blueprint) => ({
  id: blueprint.id,
  prompt: blueprint.prompt,
  targets: blueprint.targetShapeIds.map((shapeId) => ({
    id: `target-${shapeId}`,
    shapeId
  })),
  trayShapeIds: [...blueprint.trayShapeIds],
  matchedTargetIds: [],
  celebrationElapsedMs: 0
});

const cloneState = (state) => ({
  ...state,
  rounds: state.rounds.map((round) => ({
    ...round,
    targets: round.targets.map((target) => ({ ...target })),
    trayShapeIds: [...round.trayShapeIds],
    matchedTargetIds: [...round.matchedTargetIds]
  }))
});

export const createInitialGameState = ({
  savedProgress = null
} = {}) => ({
  mode: "intro",
  roundIndex: 0,
  rounds: ROUND_BLUEPRINTS.map(createRound),
  selectedShapeId: null,
  sessionStars: 0,
  bestSessionStars: savedProgress?.bestSessionStars ?? 0,
  sessionsCompleted: savedProgress?.sessionsCompleted ?? 0,
  feedbackMessage: "Tap Start to help the shapes find their homes.",
  showCelebrationBurst: false
});

export const startGame = (state) => ({
  ...createInitialGameState({
    savedProgress: {
      bestSessionStars: state.bestSessionStars,
      sessionsCompleted: state.sessionsCompleted
    }
  }),
  mode: "playing",
  feedbackMessage: ROUND_BLUEPRINTS[0].prompt
});

const getActiveRound = (state) => state.rounds[state.roundIndex];

export const selectTrayShape = (state, shapeId) => {
  if (state.mode !== "playing") {
    return state;
  }

  const activeRound = getActiveRound(state);

  if (!activeRound.trayShapeIds.includes(shapeId)) {
    return state;
  }

  const nextState = cloneState(state);
  const label = SHAPE_LIBRARY[shapeId]?.label ?? "shape";
  nextState.selectedShapeId = shapeId;
  nextState.feedbackMessage = `Great choice! Place the ${label}.`;
  return nextState;
};

export const placeSelectedShape = (state, targetId) => {
  if (state.mode !== "playing" || !state.selectedShapeId) {
    return state;
  }

  const activeRound = getActiveRound(state);
  const target = activeRound.targets.find((entry) => entry.id === targetId);

  if (!target || activeRound.matchedTargetIds.includes(targetId)) {
    return state;
  }

  const nextState = cloneState(state);
  const nextRound = getActiveRound(nextState);

  if (target.shapeId === state.selectedShapeId) {
    nextRound.matchedTargetIds.push(targetId);
    nextState.selectedShapeId = null;
    nextState.sessionStars += 1;
    nextState.bestSessionStars = Math.max(
      nextState.bestSessionStars,
      nextState.sessionStars
    );
    nextState.feedbackMessage = `Nice! The ${
      SHAPE_LIBRARY[target.shapeId].label
    } is in the right spot.`;

    if (nextRound.matchedTargetIds.length === nextRound.targets.length) {
      nextState.mode = "celebration";
      nextState.showCelebrationBurst = true;
      nextState.feedbackMessage = "Round complete! Watch the stars sparkle.";
    }

    return nextState;
  }

  nextState.selectedShapeId = null;
  nextState.feedbackMessage = `Almost there. Try the ${
    SHAPE_LIBRARY[target.shapeId].label
  }.`;
  return nextState;
};

export const advanceCelebration = (state, elapsedMs) => {
  if (state.mode !== "celebration") {
    return state;
  }

  const nextState = cloneState(state);
  const activeRound = getActiveRound(nextState);
  activeRound.celebrationElapsedMs += elapsedMs;

  if (activeRound.celebrationElapsedMs < CELEBRATION_DURATION_MS) {
    return nextState;
  }

  if (nextState.roundIndex === nextState.rounds.length - 1) {
    nextState.mode = "complete";
    nextState.sessionsCompleted += 1;
    nextState.showCelebrationBurst = false;
    nextState.feedbackMessage =
      "You did it! Every bright shape has a cozy home.";
    return nextState;
  }

  nextState.roundIndex += 1;
  nextState.mode = "playing";
  nextState.selectedShapeId = null;
  nextState.showCelebrationBurst = false;
  nextState.feedbackMessage = nextState.rounds[nextState.roundIndex].prompt;
  return nextState;
};

export const createProgressSnapshot = (state) => ({
  bestSessionStars: state.bestSessionStars,
  sessionsCompleted: state.sessionsCompleted
});

export const createTextSnapshot = (state) => {
  const activeRound = getActiveRound(state);

  return {
    coordinateSystem: "origin top-left; x increases right; y increases down",
    mode: state.mode,
    round: {
      index: state.roundIndex + 1,
      total: state.rounds.length,
      prompt: activeRound.prompt
    },
    sessionStars: state.sessionStars,
    bestSessionStars: state.bestSessionStars,
    sessionsCompleted: state.sessionsCompleted,
    selectedShapeId: state.selectedShapeId,
    feedbackMessage: state.feedbackMessage,
    trayShapes: activeRound.trayShapeIds.map((shapeId) => ({
      id: shapeId,
      label: SHAPE_LIBRARY[shapeId].label
    })),
    targets: activeRound.targets.map((target) => ({
      id: target.id,
      shapeId: target.shapeId,
      matched: activeRound.matchedTargetIds.includes(target.id)
    }))
  };
};
