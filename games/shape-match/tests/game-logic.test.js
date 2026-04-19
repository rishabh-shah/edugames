import { describe, expect, it } from "vitest";

import {
  advanceCelebration,
  createInitialGameState,
  placeSelectedShape,
  selectTrayShape,
  startGame
} from "../src/game-logic.js";

describe("shape-match game logic", () => {
  it("creates an intro state seeded from saved progress", () => {
    const state = createInitialGameState({
      savedProgress: {
        bestSessionStars: 7,
        sessionsCompleted: 2
      }
    });

    expect(state.mode).toBe("intro");
    expect(state.bestSessionStars).toBe(7);
    expect(state.sessionsCompleted).toBe(2);
    expect(state.rounds).toHaveLength(3);
  });

  it("starts the game with the first round active", () => {
    const state = startGame(createInitialGameState());

    expect(state.mode).toBe("playing");
    expect(state.roundIndex).toBe(0);
    expect(state.selectedShapeId).toBeNull();
    expect(state.rounds[0].trayShapeIds).toHaveLength(2);
  });

  it("awards a star and enters celebration when the last target is matched", () => {
    let state = startGame(createInitialGameState());

    state = selectTrayShape(state, "circle");
    state = placeSelectedShape(state, "target-circle");
    state = selectTrayShape(state, "square");
    state = placeSelectedShape(state, "target-square");

    expect(state.mode).toBe("celebration");
    expect(state.sessionStars).toBe(2);
    expect(state.rounds[0].matchedTargetIds).toEqual([
      "target-circle",
      "target-square"
    ]);
  });

  it("gives a gentle hint and no star for a mismatched placement", () => {
    let state = startGame(createInitialGameState());

    state = selectTrayShape(state, "square");
    state = placeSelectedShape(state, "target-circle");

    expect(state.mode).toBe("playing");
    expect(state.sessionStars).toBe(0);
    expect(state.feedbackMessage).toMatch(/try the circle/i);
    expect(state.selectedShapeId).toBeNull();
  });

  it("advances to the next round after the celebration timer", () => {
    let state = startGame(createInitialGameState());

    state = selectTrayShape(state, "circle");
    state = placeSelectedShape(state, "target-circle");
    state = selectTrayShape(state, "square");
    state = placeSelectedShape(state, "target-square");
    state = advanceCelebration(state, 1600);

    expect(state.mode).toBe("playing");
    expect(state.roundIndex).toBe(1);
    expect(state.rounds[1].matchedTargetIds).toEqual([]);
  });
});
