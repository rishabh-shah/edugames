const createFallbackLocalStorage = () => {
  const memory = new Map();

  return {
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    }
  };
};

const createBridgeStateStore = (bridge) => ({
  async load() {
    return bridge.loadState();
  },
  async save(state) {
    await bridge.saveState(state);
  }
});

const createLocalStateStore = (globalObject, gameId) => {
  const storage = globalObject?.localStorage ?? createFallbackLocalStorage();
  const key = `edugames:${gameId}:save-state`;

  return {
    async load() {
      const rawValue = storage.getItem(key);

      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue);
    },
    async save(state) {
      storage.setItem(key, JSON.stringify(state));
    }
  };
};

const createStateStore = (globalObject, gameId) => {
  const bridge = globalObject?.eduGamesBridge;

  if (bridge?.loadState && bridge?.saveState) {
    return createBridgeStateStore(bridge);
  }

  return createLocalStateStore(globalObject, gameId);
};

const createMessageTransport = (globalObject) => {
  const messages = [];

  return {
    messages,
    post(message) {
      messages.push(message);

      if (globalObject?.webkit?.messageHandlers?.edugames) {
        globalObject.webkit.messageHandlers.edugames.postMessage(message);
        return;
      }

      if (globalObject?.parent && globalObject.parent !== globalObject) {
        globalObject.parent.postMessage(
          {
            source: "edugames-game",
            ...message
          },
          "*"
        );
      }
    }
  };
};

export const createEduGameSdk = ({
  gameId,
  globalObject = globalThis,
  storage = createStateStore(globalObject, gameId),
  transport = createMessageTransport(globalObject)
}) => {
  if (!gameId) {
    throw new Error("Expected a stable gameId when creating the EduGames SDK.");
  }

  return {
    async loadState() {
      return storage.load();
    },
    async saveState(state) {
      await storage.save(state);
      transport.post({
        type: "save-state",
        gameId,
        state
      });
    },
    ready(metadata = {}) {
      transport.post({
        type: "ready",
        gameId,
        metadata
      });
    },
    emitEvent(name, value = 1) {
      transport.post({
        type: "event",
        gameId,
        name,
        value
      });
    },
    requestExit() {
      transport.post({
        type: "request-exit",
        gameId
      });
    }
  };
};
