import { createEduGameSdk } from "./vendor/edugames-sdk.js";

const GAME_ID = "set-sizes-shapes";
const GAME_TITLE = "Set Sizes Shapes";
const sdk = createEduGameSdk({
  gameId: GAME_ID,
  globalObject: globalThis
});

let started = false;

const emitStartIfNeeded = () => {
  if (started) {
    return;
  }

  started = true;
  sdk.emitEvent("game_started");
};

const installExitButton = () => {
  const existingButton = document.getElementById("edugames-exit-button");

  if (existingButton) {
    return existingButton;
  }

  const button = document.createElement("button");
  button.id = "edugames-exit-button";
  button.type = "button";
  button.textContent = "Exit";
  Object.assign(button.style, {
    position: "fixed",
    top: "18px",
    right: "18px",
    zIndex: "9999",
    display: "block",
    padding: "14px 18px",
    borderRadius: "999px",
    border: "0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#1f2937",
    background: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.18)",
    cursor: "pointer"
  });
  button.addEventListener("click", () => {
    sdk.emitEvent("game_exited");
    sdk.requestExit();
  });
  document.body.append(button);

  return button;
};

const installInteractionHooks = () => {
  document.addEventListener(
    "pointerdown",
    () => {
      emitStartIfNeeded();
      sdk.emitEvent("ui_interacted");
    },
    {
      capture: true,
      passive: true
    }
  );

  globalThis.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      sdk.emitEvent("game_exited");
      sdk.requestExit();
    }
  });
};

const installLegacyMouseUpHandlers = () => {
  for (const element of document.querySelectorAll("[data-edugames-mouseup]")) {
    const action = element.getAttribute("data-edugames-mouseup");

    if (!action) {
      continue;
    }

    element.addEventListener("mouseup", () => {
      Function(action)();
    });
  }
};

const installLegacyClickHandlers = () => {
  for (const element of document.querySelectorAll("[data-edugames-click]")) {
    const action = element.getAttribute("data-edugames-click");

    if (!action) {
      continue;
    }

    element.addEventListener("click", () => {
      Function(action)();
    });
  }
};

const exposeDebugHooks = () => {
  globalThis.render_game_to_text = () =>
    (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
  globalThis.__edugamesGameId = GAME_ID;
};

globalThis.addEventListener("load", () => {
  installExitButton();
  installInteractionHooks();
  installLegacyMouseUpHandlers();
  installLegacyClickHandlers();
  exposeDebugHooks();
  sdk.ready({
    title: GAME_TITLE,
    version: "0.1.0"
  });
});
