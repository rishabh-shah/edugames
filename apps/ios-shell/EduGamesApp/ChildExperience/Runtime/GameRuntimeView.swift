import SwiftUI
import UIKit
import WebKit
import OSLog

struct GameRuntimeView: View {
  @Bindable var model: AppModel
  @State private var isRuntimeReady = false

  var body: some View {
    Group {
      if
        let launchDetails = model.activeLaunchDetails,
        let selectedProfile = model.selectedProfile
      {
        VStack(spacing: 0) {
          HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
              Text(launchDetails.detail.title)
                .font(.title2.bold())
              Text("Playing as \(selectedProfile.displayTitle)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
              if let playTimeSession = model.playTimeSession {
                Text(playTimeSession.remainingLabel)
                  .font(.caption.monospacedDigit().weight(.semibold))
                  .foregroundStyle(.secondary)
                  .accessibilityIdentifier("playtime-remaining-label")
              }
              Text(isRuntimeReady ? "Runtime ready" : "Loading game...")
                .font(.caption.weight(.semibold))
                .foregroundStyle(isRuntimeReady ? .green : .secondary)
                .accessibilityIdentifier(
                  isRuntimeReady ? "runtime-ready-indicator" : "runtime-loading-indicator"
                )
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 10) {
              if let playTimeSession = model.playTimeSession {
                switch playTimeSession.warningState {
                case .none:
                  EmptyView()
                case .fiveMinutesRemaining:
                  warningBadge(
                    text: "5 minutes left",
                    color: Color.orange,
                    identifier: "playtime-warning-five-minutes"
                  )
                case .oneMinuteRemaining:
                  warningBadge(
                    text: "1 minute left",
                    color: Color.red,
                    identifier: "playtime-warning-one-minute"
                  )
                }
              }

              HStack(spacing: 12) {
                Button("Add Time") {
                  model.requestPlayTimeExtension()
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("extend-playtime-button")

                Button("Report Problem") {
                  model.requestRuntimeReport()
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("report-problem-button")

                Button("Exit Game") {
                  model.exitActiveGame()
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier("exit-runtime-button")
              }
            }
          }
          .padding(.horizontal, 24)
          .padding(.vertical, 18)
          .background(Color.white.opacity(0.92))

          GameRuntimeWebView(
            launchDetails: launchDetails,
            profileId: selectedProfile.id,
            saveStateRepository: model.saveStateRepository,
            onRuntimeReady: {
              isRuntimeReady = true
            },
            onTelemetryEvent: { name, value in
              model.recordRuntimeEvent(name: name, value: value)
            },
            onRequestExit: {
              model.exitActiveGame()
            }
          )
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("game-runtime-view")
        .background(Color(red: 0.95, green: 0.96, blue: 0.99))
      } else {
        ProgressView("Preparing game runtime…")
          .frame(maxWidth: .infinity, maxHeight: .infinity)
          .accessibilityIdentifier("runtime-loading-indicator")
      }
    }
    .navigationTitle("Runtime")
    .navigationBarTitleDisplayMode(.inline)
    .task(id: model.activeLaunchDetails?.launchSession.launchSessionId) {
      isRuntimeReady = false
    }
  }

  @ViewBuilder
  private func warningBadge(text: String, color: Color, identifier: String) -> some View {
    Text(text)
      .font(.caption.weight(.bold))
      .padding(.horizontal, 10)
      .padding(.vertical, 8)
      .background(color.opacity(0.16), in: Capsule())
      .foregroundStyle(color)
      .accessibilityIdentifier(identifier)
  }
}

private struct GameRuntimeWebView: UIViewRepresentable {
  let launchDetails: GameLaunchDetails
  let profileId: String
  let saveStateRepository: SaveStateRepository
  let onRuntimeReady: @MainActor () -> Void
  let onTelemetryEvent: @MainActor (String, Int) -> Void
  let onRequestExit: @MainActor () -> Void

  func makeCoordinator() -> Coordinator {
    Coordinator(
      launchDetails: launchDetails,
      profileId: profileId,
      saveStateRepository: saveStateRepository,
      onRuntimeReady: onRuntimeReady,
      onTelemetryEvent: onTelemetryEvent,
      onRequestExit: onRequestExit
    )
  }

  func makeUIView(context: Context) -> WKWebView {
    let controller = WKUserContentController()
    controller.add(context.coordinator, name: Coordinator.runtimeMessageHandlerName)
    controller.add(context.coordinator, name: Coordinator.bridgeMessageHandlerName)
    controller.addUserScript(
      WKUserScript(
        source: Coordinator.injectedBridgeScript,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: true
      )
    )

    let configuration = WKWebViewConfiguration()
    configuration.userContentController = controller
    configuration.allowsInlineMediaPlayback = true

    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = context.coordinator
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.backgroundColor = UIColor.clear
    webView.isOpaque = false
    webView.accessibilityIdentifier = "game-runtime-webview"

    let entrypointURL = launchDetails.installedBundle.entrypointURL
    Coordinator.logger.info(
      "makeUIView loading entrypoint=\(entrypointURL.path, privacy: .public) readAccess=\(launchDetails.installedBundle.installDirectoryURL.path, privacy: .public)"
    )
    webView.loadFileURL(
      entrypointURL,
      allowingReadAccessTo: launchDetails.installedBundle.installDirectoryURL
    )
    return webView
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    context.coordinator.launchDetails = launchDetails
    context.coordinator.profileId = profileId
    Coordinator.logger.info(
      "updateUIView launchSessionID=\(launchDetails.launchSession.launchSessionId, privacy: .public) url=\(webView.url?.absoluteString ?? "nil", privacy: .public)"
    )
  }

  static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
    webView.configuration.userContentController.removeScriptMessageHandler(
      forName: Coordinator.runtimeMessageHandlerName
    )
    webView.configuration.userContentController.removeScriptMessageHandler(
      forName: Coordinator.bridgeMessageHandlerName
    )
  }

  final class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    static let logger = Logger(
      subsystem: "com.edugames.ios-shell",
      category: "GameRuntimeWebView"
    )

    static let runtimeMessageHandlerName = "edugames"
    static let bridgeMessageHandlerName = "edugamesBridge"
    static let injectedBridgeScript = """
    (() => {
      const postDebugLog = (message, details = null) => {
        try {
          window.webkit.messageHandlers.edugames.postMessage({
            type: "debug-log",
            gameId: "shape-match",
            message,
            details
          });
        } catch {
          // Ignore debug bridge failures.
        }
      };

      window.addEventListener("error", (event) => {
        postDebugLog("window error", {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        const reason = event.reason;
        postDebugLog("unhandled rejection", {
          reason: typeof reason === "string" ? reason : String(reason)
        });
      });

      const originalConsoleError = console.error.bind(console);
      console.error = (...args) => {
        postDebugLog("console.error", {
          args: args.map((value) =>
            typeof value === "string" ? value : String(value)
          )
        });
        originalConsoleError(...args);
      };

      if (window.eduGamesBridge) {
        return;
      }

      const callbacks = new Map();
      let nextCallId = 1;

      window.__edugamesBridgeCallbacks = {
        resolve(callId, value) {
          const callback = callbacks.get(callId);
          if (!callback) {
            return;
          }

          callbacks.delete(callId);
          callback.resolve(value);
        },
        reject(callId, message) {
          const callback = callbacks.get(callId);
          if (!callback) {
            return;
          }

          callbacks.delete(callId);
          callback.reject(new Error(message));
        }
      };

      const invokeNative = (method, payload) =>
        new Promise((resolve, reject) => {
          const callId = nextCallId++;
          callbacks.set(callId, { resolve, reject });

          window.webkit.messageHandlers.edugamesBridge.postMessage({
            callId,
            method,
            payload
          });
        });

      window.eduGamesBridge = {
        loadState() {
          return invokeNative("loadState", null);
        },
        saveState(state) {
          return invokeNative("saveState", state);
        }
      };
    })();
    """

    var launchDetails: GameLaunchDetails
    var profileId: String
    private let saveStateRepository: SaveStateRepository
    private let onRuntimeReady: @MainActor () -> Void
    private let onTelemetryEvent: @MainActor (String, Int) -> Void
    private let onRequestExit: @MainActor () -> Void

    init(
      launchDetails: GameLaunchDetails,
      profileId: String,
      saveStateRepository: SaveStateRepository,
      onRuntimeReady: @escaping @MainActor () -> Void,
      onTelemetryEvent: @escaping @MainActor (String, Int) -> Void,
      onRequestExit: @escaping @MainActor () -> Void
    ) {
      self.launchDetails = launchDetails
      self.profileId = profileId
      self.saveStateRepository = saveStateRepository
      self.onRuntimeReady = onRuntimeReady
      self.onTelemetryEvent = onTelemetryEvent
      self.onRequestExit = onRequestExit
    }

    func userContentController(
      _ userContentController: WKUserContentController,
      didReceive message: WKScriptMessage
    ) {
      switch message.name {
      case Self.runtimeMessageHandlerName:
        handleRuntimeMessage(message.body)
      case Self.bridgeMessageHandlerName:
        handleBridgeMessage(message.body, webView: message.webView)
      default:
        break
      }
    }

    private func handleRuntimeMessage(_ body: Any) {
      guard
        let payload = body as? [String: Any],
        let type = payload["type"] as? String
      else {
        return
      }

      switch type {
      case "ready":
        Self.logger.info(
          "received runtime ready message gameID=\(self.launchDetails.launchSession.gameId, privacy: .public)"
        )
        Task { @MainActor in
          onRuntimeReady()
        }
      case "request-exit":
        Self.logger.info(
          "received runtime exit request gameID=\(self.launchDetails.launchSession.gameId, privacy: .public)"
        )
        Task { @MainActor in
          onRequestExit()
        }
      case "event":
        if let name = payload["name"] as? String {
          let value = payload["value"] as? Int ?? 1
          Self.logger.info(
            "received runtime event name=\(name, privacy: .public) value=\(value)"
          )
          Task { @MainActor in
            onTelemetryEvent(name, value)
          }
        }
      case "debug-log":
        let message = payload["message"] as? String ?? "unknown"
        let detailsDescription: String
        if let details = payload["details"] {
          if JSONSerialization.isValidJSONObject(details),
             let data = try? JSONSerialization.data(withJSONObject: details),
             let json = String(data: data, encoding: .utf8) {
            detailsDescription = json
          } else {
            detailsDescription = String(describing: details)
          }
        } else {
          detailsDescription = "null"
        }
        Self.logger.info(
          "received runtime debug-log message=\(message, privacy: .public) details=\(detailsDescription, privacy: .public)"
        )
      case "save-state":
        if let state = payload["state"] {
          try? persistState(state)
        }
      default:
        break
      }
    }

    private func handleBridgeMessage(_ body: Any, webView: WKWebView?) {
      guard
        let payload = body as? [String: Any],
        let callId = payload["callId"] as? Int,
        let method = payload["method"] as? String,
        let webView
      else {
        return
      }

      do {
        switch method {
        case "loadState":
          let saveState = try saveStateRepository.loadState(
            profileId: profileId,
            gameId: launchDetails.launchSession.gameId,
            version: launchDetails.launchSession.version
          )
          resolve(callId: callId, json: saveState?.payloadJSON ?? "null", webView: webView)
        case "saveState":
          try persistState(payload["payload"] ?? NSNull())
          resolve(callId: callId, json: "null", webView: webView)
        default:
          reject(callId: callId, message: "Unsupported bridge method: \(method)", webView: webView)
        }
      } catch {
        reject(callId: callId, message: String(describing: error), webView: webView)
      }
    }

    private func persistState(_ value: Any) throws {
      let data = try JSONSerialization.data(withJSONObject: value)
      guard let payloadJSON = String(data: data, encoding: .utf8) else {
        throw CocoaError(.coderInvalidValue)
      }

      try saveStateRepository.saveState(
        LocalSaveState(
          profileId: profileId,
          gameId: launchDetails.launchSession.gameId,
          version: launchDetails.launchSession.version,
          payloadJSON: payloadJSON,
          updatedAt: ISO8601DateFormatter().string(from: Date())
        )
      )
    }

    private func resolve(callId: Int, json: String, webView: WKWebView) {
      evaluateJavaScript(
        "window.__edugamesBridgeCallbacks.resolve(\(callId), \(json));",
        webView: webView
      )
    }

    private func reject(callId: Int, message: String, webView: WKWebView) {
      let escapedMessage = message
        .replacingOccurrences(of: "\\", with: "\\\\")
        .replacingOccurrences(of: "\"", with: "\\\"")
      evaluateJavaScript(
        "window.__edugamesBridgeCallbacks.reject(\(callId), \"\(escapedMessage)\");",
        webView: webView
      )
    }

    private func evaluateJavaScript(_ script: String, webView: WKWebView) {
      if Thread.isMainThread {
        webView.evaluateJavaScript(script)
        return
      }

      DispatchQueue.main.async {
        webView.evaluateJavaScript(script)
      }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
      Self.logger.info(
        "webView didFinish url=\(webView.url?.absoluteString ?? "nil", privacy: .public)"
      )
      webView.evaluateJavaScript(
        """
        JSON.stringify({
          href: window.location.href,
          readyState: document.readyState,
          hasStartButton: !!document.getElementById("start-button"),
          hasShapeMatchApp: !!window.__shapeMatchApp,
          hasBridge: !!window.eduGamesBridge,
          mainScriptTag: !!document.querySelector('script[src="./src/main.js"]')
        })
        """
      ) { result, error in
        if let error {
          Self.logger.error(
            "runtime sanity check failed error=\(String(describing: error), privacy: .public)"
          )
          return
        }

        let payload = (result as? String) ?? "nil"
        Self.logger.info("runtime sanity check payload=\(payload, privacy: .public)")
      }
      Task { @MainActor in
        onRuntimeReady()
      }
    }

    func webView(
      _ webView: WKWebView,
      didFail navigation: WKNavigation!,
      withError error: Error
    ) {
      Self.logger.error(
        "webView didFail url=\(webView.url?.absoluteString ?? "nil", privacy: .public) error=\(String(describing: error), privacy: .public)"
      )
    }

    func webView(
      _ webView: WKWebView,
      didFailProvisionalNavigation navigation: WKNavigation!,
      withError error: Error
    ) {
      Self.logger.error(
        "webView didFailProvisionalNavigation url=\(webView.url?.absoluteString ?? "nil", privacy: .public) error=\(String(describing: error), privacy: .public)"
      )
    }
  }
}
