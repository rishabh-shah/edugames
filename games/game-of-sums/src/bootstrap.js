import { createEduGameSdk } from "./vendor/edugames-sdk.js";

const GAME_ID = "game-of-sums";
const GAME_TITLE = "Game of Sums";
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

const selectDefaultEnglishLocale = () => {
  const languageScreen = document.getElementById("language");

  if (!languageScreen || languageScreen.style.display === "none") {
    return;
  }

  const englishButton = Array.from(languageScreen.querySelectorAll("button")).find((button) =>
    /english/i.test(button.textContent ?? "")
  );

  englishButton?.click();
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
  installInteractionHooks();
  installLegacyClickHandlers();
  selectDefaultEnglishLocale();
  exposeDebugHooks();
  sdk.ready({
    title: GAME_TITLE,
    version: "0.1.0"
  });
});
