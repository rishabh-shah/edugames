/**
 * @typedef {{ getItem(key: string): string | null; setItem(key: string, value: string): void }} StorageLike
 * @typedef {{ postMessage(message: Record<string, unknown>): void }} NativeMessageHandler
 * @typedef {{ postMessage(message: unknown, targetOrigin: string): void }} ParentWindowLike
 * @typedef {{
 *   localStorage?: StorageLike;
 *   parent?: ParentWindowLike;
 *   webkit?: { messageHandlers?: { edugames?: NativeMessageHandler } };
 * }} EduGameGlobal
 * @typedef {{ load(): Promise<unknown>; save(state: unknown): Promise<void> }} StateStore
 * @typedef {{ messages: Record<string, unknown>[]; post(message: Record<string, unknown>): void }} MessageTransport
 * @typedef {{
 *   gameId: string;
 *   globalObject?: EduGameGlobal;
 *   storage?: StateStore;
 *   transport?: MessageTransport;
 * }} EduGameSdkOptions
 */

const createFallbackLocalStorage = () => {
  /** @type {Map<string, string>} */
  const memory = new Map();

  /** @type {StorageLike} */
  return {
    getItem(/** @type {string} */ key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(/** @type {string} */ key, /** @type {string} */ value) {
      memory.set(key, value);
    }
  };
};

/**
 * @param {EduGameGlobal | undefined} globalObject
 * @param {string} gameId
 * @returns {StateStore}
 */
export const createLocalStateStore = (globalObject, gameId) => {
  const storage = globalObject?.localStorage ?? createFallbackLocalStorage();
  const key = `edugames:${gameId}:save-state`;

  return {
    async load() {
      const rawValue = storage.getItem(key);

      if (!rawValue) {
        return null;
      }

      try {
        return JSON.parse(rawValue);
      } catch {
        return null;
      }
    },
    /**
     * @param {unknown} state
     * @returns {Promise<void>}
     */
    async save(state) {
      storage.setItem(key, JSON.stringify(state));
    }
  };
};

/**
 * @param {EduGameGlobal | undefined} globalObject
 * @returns {MessageTransport}
 */
export const createMessageTransport = (globalObject) => {
  /** @type {Record<string, unknown>[]} */
  const messages = [];

  return {
    messages,
    /**
     * @param {Record<string, unknown>} message
     */
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

/**
 * @param {EduGameSdkOptions} options
 */
export const createEduGameSdk = ({
  gameId,
  globalObject = globalThis,
  storage = createLocalStateStore(globalObject, gameId),
  transport = createMessageTransport(globalObject)
}) => {
  if (!gameId) {
    throw new Error("Expected a stable gameId when creating the EduGames SDK.");
  }

  return {
    async loadState() {
      return storage.load();
    },
    /**
     * @param {unknown} state
     * @returns {Promise<void>}
     */
    async saveState(state) {
      await storage.save(state);
      transport.post({
        type: "save-state",
        gameId,
        state
      });
    },
    /**
     * @param {Record<string, unknown>} [metadata]
     */
    ready(metadata = {}) {
      transport.post({
        type: "ready",
        gameId,
        metadata
      });
    },
    /**
     * @param {string} name
     * @param {number} [value]
     */
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
