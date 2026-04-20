import Foundation
import Observation
import OSLog

enum ShellRoute: Equatable {
  case bootstrap
  case profiles
  case catalog
  case gameDetail
  case runtime
  case parentZone
}

@MainActor
@Observable
final class AppModel {
  private static let logger = Logger(
    subsystem: "com.edugames.ios-shell",
    category: "AppModel"
  )

  var route: ShellRoute = .bootstrap
  var isBootstrapping = false
  var bootstrapErrorMessage: String?
  var profiles: [ChildProfile] = []
  var selectedProfile: ChildProfile?
  var catalog: CatalogResponse?
  var selectedGame: CatalogGame?
  var gameDetail: GameDetailResponse?
  var activeLaunchDetails: GameLaunchDetails?
  var isCreateProfileFormPresented = false
  var isCreatingProfile = false
  var parentGateChallenge: ParentGateChallenge?
  var parentGateErrorMessage: String?
  var isParentGatePresented = false
  var isPlayTimeExtensionPickerPresented = false
  var isReportIssuePresented = false
  var reportSubmissionErrorMessage: String?
  var playTimeSession: ActivePlayTimeSession?
  private(set) var hasStartedBootstrap = false

  @ObservationIgnored private var gameDetailRequestID: UUID?
  private var playTimeSettingsByProfileID: [String: ParentPlayTimeSettings] = [:]
  @ObservationIgnored private var parentZoneReturnRoute: ShellRoute = .profiles
  @ObservationIgnored private var parentGateDestination: ParentGateDestination?
  @ObservationIgnored private var playTimeTickerTask: Task<Void, Never>?
  @ObservationIgnored private var isSceneActive = true
  @ObservationIgnored private var activeTelemetryBatch: ActiveTelemetryBatch?
  @ObservationIgnored private var reportIssueContext: ReportIssueContext?

  @ObservationIgnored private let bootstrapService: BootstrapService
  @ObservationIgnored private let runtimeLaunchService: GameRuntimeLaunchService?
  @ObservationIgnored private let playTimeSettingsRepository: PlayTimeSettingsRepository
  @ObservationIgnored private let parentGateChallengeFactory: ParentGateChallengeFactory
  @ObservationIgnored private let playTimeTickIntervalNanoseconds: UInt64
  @ObservationIgnored private let playTimeAdvancePerTickSeconds: Int

  let saveStateRepository: SaveStateRepository

  init(
    bootstrapService: BootstrapService,
    runtimeLaunchService: GameRuntimeLaunchService? = nil,
    saveStateRepository: SaveStateRepository = InMemorySaveStateRepository(),
    playTimeSettingsRepository: PlayTimeSettingsRepository = InMemoryPlayTimeSettingsRepository(),
    parentGateChallengeFactory: ParentGateChallengeFactory = ArithmeticParentGateChallengeFactory(),
    playTimeTickIntervalNanoseconds: UInt64 = 1_000_000_000,
    playTimeAdvancePerTickSeconds: Int = 1
  ) {
    self.bootstrapService = bootstrapService
    self.runtimeLaunchService = runtimeLaunchService
    self.saveStateRepository = saveStateRepository
    self.playTimeSettingsRepository = playTimeSettingsRepository
    self.parentGateChallengeFactory = parentGateChallengeFactory
    self.playTimeTickIntervalNanoseconds = playTimeTickIntervalNanoseconds
    self.playTimeAdvancePerTickSeconds = playTimeAdvancePerTickSeconds
  }

  static func live(processInfo: ProcessInfo = .processInfo) -> AppModel {
    let resetLocalData = processInfo.environment["EDUGAMES_RESET_LOCAL_DATA"] == "1"
    let useFixtures = processInfo.environment["EDUGAMES_USE_FIXTURES"] == "1"

    let fileSessionStore = FileSessionStore(filename: "installation-session.json")
    let sessionStore: SessionStore

    if resetLocalData {
      let keychain = KeychainSessionStore(fallbackStore: fileSessionStore)
      try? keychain.clear()
      try? fileSessionStore.clear()
      sessionStore = keychain
    } else {
      sessionStore = KeychainSessionStore(fallbackStore: fileSessionStore)
    }

    let database: AppDatabase

    do {
      database = try AppDatabase.makeLive(resetLocalData: resetLocalData)
    } catch {
      preconditionFailure("Unable to initialize the local iOS shell database: \(error)")
    }

    let profileRepository = SQLiteProfileRepository(database: database)
    let bundleCacheRepository = SQLiteBundleCacheRepository(database: database)
    let saveStateRepository = SQLiteSaveStateRepository(database: database)
    let playTimeSettingsRepository = SQLitePlayTimeSettingsRepository(database: database)
    let apiClient: PlatformAPIClient

    if useFixtures {
      apiClient = FixturePlatformAPIClient()
    } else {
      let baseURLString = processInfo.environment["EDUGAMES_API_BASE_URL"] ?? "http://127.0.0.1:3000"

      guard let baseURL = URL(string: baseURLString) else {
        preconditionFailure("Invalid EDUGAMES_API_BASE_URL: \(baseURLString)")
      }

      apiClient = LivePlatformAPIClient(baseURL: baseURL)
    }

    let timingConfiguration = playTimeTimingConfiguration(from: processInfo)
    let gateFactory: ParentGateChallengeFactory

    if processInfo.environment["EDUGAMES_PARENT_GATE_TEST_MODE"] == "1" {
      gateFactory = FixedParentGateChallengeFactory()
    } else {
      gateFactory = ArithmeticParentGateChallengeFactory()
    }

    return AppModel(
      bootstrapService: BootstrapService(
        apiClient: apiClient,
        sessionStore: sessionStore,
        profileRepository: profileRepository
      ),
      runtimeLaunchService: GameRuntimeLaunchService(
        apiClient: apiClient,
        bundleInstallService: BundleInstallService(
          cacheRepository: bundleCacheRepository
        )
      ),
      saveStateRepository: saveStateRepository,
      playTimeSettingsRepository: playTimeSettingsRepository,
      parentGateChallengeFactory: gateFactory,
      playTimeTickIntervalNanoseconds: timingConfiguration.intervalNanoseconds,
      playTimeAdvancePerTickSeconds: timingConfiguration.advancePerTickSeconds
    )
  }

  func bootstrapIfNeeded() async {
    guard !hasStartedBootstrap else {
      return
    }

    hasStartedBootstrap = true
    await bootstrap()
  }

  func bootstrap() async {
    stopPlayTimeTicker(clearSession: true)
    route = .bootstrap
    bootstrapErrorMessage = nil
    isBootstrapping = true

    defer {
      isBootstrapping = false
    }

    do {
      let snapshot = try await bootstrapService.bootstrap()
      profiles = snapshot.profiles
      selectedProfile = nil
      selectedGame = nil
      catalog = nil
      gameDetail = nil
      activeLaunchDetails = nil
      await loadPlayTimeSettingsCache()
      if snapshot.didResetLocalProfiles {
        bootstrapErrorMessage = "The local API restarted, so saved profiles were reset. Create a new profile to continue."
      }
      route = .profiles
    } catch {
      bootstrapErrorMessage = "Unable to connect to the EduGames shell services. Check the local API and try again."
    }
  }

  func createProfile(_ input: CreateChildProfileInput) async {
    Self.logger.info(
      "createProfile started firstName=\(input.normalizedFirstName, privacy: .public) age=\(input.age)"
    )
    isCreatingProfile = true

    defer {
      isCreatingProfile = false
    }

    do {
      profiles = try await bootstrapService.createProfile(input)
      Self.logger.info(
        "createProfile succeeded firstName=\(input.normalizedFirstName, privacy: .public) profileCount=\(self.profiles.count)"
      )
      await loadPlayTimeSettingsCache()
      bootstrapErrorMessage = nil
      isCreateProfileFormPresented = false
      route = .profiles
    } catch {
      Self.logger.error(
        "createProfile failed firstName=\(input.normalizedFirstName, privacy: .public) error=\(String(describing: error), privacy: .public)"
      )
      bootstrapErrorMessage = "Could not create a profile right now."
    }
  }

  func selectProfile(_ profile: ChildProfile) async {
    selectedProfile = profile
    selectedGame = nil
    gameDetail = nil
    activeLaunchDetails = nil
    gameDetailRequestID = nil
    bootstrapErrorMessage = nil

    do {
      catalog = try await bootstrapService.fetchCatalog(for: profile)
      route = .catalog
    } catch {
      if await handleAuthRecoveryIfNeeded(for: error) {
        return
      }

      bootstrapErrorMessage = "Could not load the catalog right now."
    }
  }

  func selectGame(_ game: CatalogGame) async {
    guard let selectedProfile else {
      bootstrapErrorMessage = "Choose a profile before opening a game."
      return
    }

    let requestID = UUID()
    gameDetailRequestID = requestID
    selectedGame = game
    gameDetail = nil
    bootstrapErrorMessage = nil

    do {
      let detail = try await bootstrapService.fetchGameDetail(
        for: game,
        profile: selectedProfile
      )

      guard gameDetailRequestID == requestID else {
        return
      }

      gameDetail = detail
      route = .gameDetail
    } catch {
      if await handleAuthRecoveryIfNeeded(for: error) {
        return
      }

      guard gameDetailRequestID == requestID else {
        return
      }

      bootstrapErrorMessage = "Could not load this game right now."
    }
  }

  func launchSelectedGame() async {
    guard let selectedProfile, let selectedGame, let runtimeLaunchService else {
      bootstrapErrorMessage = "This game is not ready to launch yet."
      return
    }

    Self.logger.info(
      "launchSelectedGame started profileID=\(selectedProfile.id, privacy: .public) gameID=\(selectedGame.gameId, privacy: .public)"
    )
    bootstrapErrorMessage = nil
    activeLaunchDetails = nil
    route = .runtime
    Self.logger.info(
      "launchSelectedGame route set to runtime gameID=\(selectedGame.gameId, privacy: .public)"
    )

    do {
      let session = try await bootstrapService.currentSession()
      Self.logger.info(
        "launchSelectedGame resolved session installationID=\(session.installationId, privacy: .public)"
      )
      activeLaunchDetails = try await runtimeLaunchService.prepareLaunch(
        session: session,
        request: GameLaunchRequest(profile: selectedProfile, game: selectedGame)
      )
      if let activeLaunchDetails {
        Self.logger.info(
          "launchSelectedGame prepared launchSessionID=\(activeLaunchDetails.launchSession.launchSessionId, privacy: .public) entrypoint=\(activeLaunchDetails.installedBundle.entrypointURL.path, privacy: .public)"
        )
      } else {
        Self.logger.error(
          "launchSelectedGame completed without activeLaunchDetails gameID=\(selectedGame.gameId, privacy: .public)"
        )
      }
      gameDetailRequestID = nil
      beginTelemetrySession(
        profileId: selectedProfile.id,
        launchSessionId: activeLaunchDetails?.launchSession.launchSessionId
      )
      startPlayTimeTracking(for: selectedProfile)
      Self.logger.info(
        "launchSelectedGame finished successfully gameID=\(selectedGame.gameId, privacy: .public)"
      )
    } catch {
      Self.logger.error(
        "launchSelectedGame failed gameID=\(selectedGame.gameId, privacy: .public) error=\(String(describing: error), privacy: .public)"
      )
      if await handleAuthRecoveryIfNeeded(for: error) {
        return
      }

      route = .gameDetail
      bootstrapErrorMessage = "Could not start this game right now."
    }
  }

  func backToCatalog() {
    if route == .runtime {
      finishActiveRuntime(message: nil)
    } else {
      stopPlayTimeTicker(clearSession: true)
      route = .catalog
      activeLaunchDetails = nil
      bootstrapErrorMessage = nil
    }

    gameDetailRequestID = nil
    reportSubmissionErrorMessage = nil
  }

  func exitActiveGame() {
    finishActiveRuntime(message: nil)
    gameDetailRequestID = nil
    reportSubmissionErrorMessage = nil
  }

  func backToProfiles() {
    flushActiveTelemetry(includeSessionEnd: true)
    stopPlayTimeTicker(clearSession: true)
    route = .profiles
    catalog = nil
    selectedProfile = nil
    selectedGame = nil
    gameDetail = nil
    activeLaunchDetails = nil
    gameDetailRequestID = nil
    bootstrapErrorMessage = nil
    reportSubmissionErrorMessage = nil
  }

  func playTimeLimit(for profile: ChildProfile) -> PlayTimeLimit {
    playTimeSettingsByProfileID[profile.id]?.playTimeLimit ?? .minutes30
  }

  func setPlayTimeLimit(_ limit: PlayTimeLimit, for profile: ChildProfile) {
    let settings = ParentPlayTimeSettings(profileId: profile.id, playTimeLimit: limit)

    playTimeSettingsByProfileID[profile.id] = settings

    Task {
      do {
        try await savePlayTimeSettings(settings)
        bootstrapErrorMessage = nil
      } catch {
        playTimeSettingsByProfileID[profile.id] = nil
        bootstrapErrorMessage = "Could not save the new play time setting."
      }
    }
  }

  func requestParentZoneAccess() {
    requestParentZoneAccess(returningTo: route == .catalog ? .catalog : .profiles)
  }

  func requestParentZoneAccess(returningTo returnRoute: ShellRoute) {
    parentZoneReturnRoute = returnRoute
    parentGateDestination = .parentZone
    parentGateChallenge = parentGateChallengeFactory.makeChallenge()
    parentGateErrorMessage = nil
    isParentGatePresented = true
  }

  func closeParentZone() {
    route = parentZoneReturnRoute
  }

  func dismissParentGate() {
    isParentGatePresented = false
    parentGateChallenge = nil
    parentGateErrorMessage = nil
    parentGateDestination = nil
  }

  func submitParentGateAnswer(_ answer: Int) {
    guard let parentGateChallenge else {
      return
    }

    guard answer == parentGateChallenge.answer else {
      parentGateErrorMessage = "That answer didn’t match. Try again."
      return
    }

    let destination = parentGateDestination
    dismissParentGate()

    switch destination {
    case .parentZone:
      route = .parentZone
    case .extendPlayTime:
      isPlayTimeExtensionPickerPresented = true
    case .reportIssue:
      isReportIssuePresented = true
    case nil:
      break
    }
  }

  func requestPlayTimeExtension() {
    guard playTimeSession != nil else {
      return
    }

    parentGateDestination = .extendPlayTime
    parentGateChallenge = parentGateChallengeFactory.makeChallenge()
    parentGateErrorMessage = nil
    isParentGatePresented = true
  }

  var reportIssueGameTitle: String {
    reportIssueContext?.gameTitle ?? "this game"
  }

  func requestRuntimeReport() {
    guard
      route == .runtime,
      let selectedProfile,
      let selectedGame
    else {
      return
    }

    reportIssueContext = ReportIssueContext(
      profileId: selectedProfile.id,
      gameId: selectedGame.gameId,
      gameTitle: selectedGame.title
    )
    parentGateDestination = .reportIssue
    parentGateChallenge = parentGateChallengeFactory.makeChallenge()
    parentGateErrorMessage = nil
    reportSubmissionErrorMessage = nil
    isParentGatePresented = true
  }

  func dismissReportIssue() {
    isReportIssuePresented = false
    reportSubmissionErrorMessage = nil
    reportIssueContext = nil
  }

  func submitRuntimeReport(
    reason: ReportReason,
    details: String
  ) async {
    guard let reportIssueContext else {
      dismissReportIssue()
      return
    }

    do {
      _ = try await bootstrapService.submitReport(
        profileId: reportIssueContext.profileId,
        gameId: reportIssueContext.gameId,
        reason: reason,
        details: details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
          ? nil
          : details.trimmingCharacters(in: .whitespacesAndNewlines)
      )
      dismissReportIssue()
      bootstrapErrorMessage = nil
    } catch {
      if await handleAuthRecoveryIfNeeded(for: error) {
        dismissReportIssue()
        return
      }

      reportSubmissionErrorMessage = "Could not send the report right now."
    }
  }

  func dismissPlayTimeExtensionPicker() {
    isPlayTimeExtensionPickerPresented = false
  }

  func extendActivePlaySession(by limit: PlayTimeLimit) {
    guard var playTimeSession else {
      dismissPlayTimeExtensionPicker()
      return
    }

    playTimeSession.extend(by: limit)
    self.playTimeSession = playTimeSession
    isPlayTimeExtensionPickerPresented = false
    bootstrapErrorMessage = nil
  }

  func updateSceneActivity(isActive: Bool) {
    isSceneActive = isActive
  }

  func advancePlayTimeForTesting(by seconds: Int) {
    advancePlayTime(by: seconds)
  }

  func setSceneActiveForTesting(_ isActive: Bool) {
    updateSceneActivity(isActive: isActive)
  }

  func recordRuntimeEvent(name: String, value: Int = 1) {
    guard var activeTelemetryBatch else {
      return
    }

    let normalizedName = name.hasPrefix("milestone:")
      ? String(name.dropFirst("milestone:".count))
      : name

    activeTelemetryBatch.events.append(
      .milestone(
        named: normalizedName,
        value: value,
        at: Self.timestamp()
      )
    )
    self.activeTelemetryBatch = activeTelemetryBatch
  }

  private func startPlayTimeTracking(for profile: ChildProfile) {
    playTimeSession = ActivePlayTimeSession(baseLimit: playTimeLimit(for: profile))
    startPlayTimeTicker()
  }

  private func beginTelemetrySession(
    profileId: String,
    launchSessionId: String?
  ) {
    guard let launchSessionId else {
      activeTelemetryBatch = nil
      return
    }

    activeTelemetryBatch = ActiveTelemetryBatch(
      profileId: profileId,
      launchSessionId: launchSessionId,
      events: [
        .sessionStart(at: Self.timestamp())
      ]
    )
  }

  private func startPlayTimeTicker() {
    playTimeTickerTask?.cancel()
    playTimeTickerTask = Task { [weak self] in
      guard let self else {
        return
      }

      while !Task.isCancelled {
        try? await Task.sleep(nanoseconds: playTimeTickIntervalNanoseconds)

        guard !Task.isCancelled else {
          return
        }

        await MainActor.run {
          self.advancePlayTime(by: self.playTimeAdvancePerTickSeconds)
        }
      }
    }
  }

  private func advancePlayTime(by seconds: Int) {
    guard
      route == .runtime,
      activeLaunchDetails != nil,
      isSceneActive,
      var playTimeSession
    else {
      return
    }

    let expired = playTimeSession.advance(by: seconds)
    self.playTimeSession = playTimeSession

    guard expired else {
      return
    }

    finishActiveRuntime(
      message: "Play time is up. Ask a parent to extend time in Parent Zone."
    )
  }

  private func stopPlayTimeTicker(clearSession: Bool) {
    playTimeTickerTask?.cancel()
    playTimeTickerTask = nil

    if clearSession {
      playTimeSession = nil
    }
  }

  private func loadPlayTimeSettingsCache() async {
    var loadedSettings: [String: ParentPlayTimeSettings] = [:]

    for profile in profiles {
      if let settings = try? await loadPlayTimeSettings(profileId: profile.id) {
        loadedSettings[profile.id] = settings
      }
    }

    playTimeSettingsByProfileID = loadedSettings
  }

  private func loadPlayTimeSettings(profileId: String) async throws -> ParentPlayTimeSettings? {
    let repository = playTimeSettingsRepository

    return try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          continuation.resume(returning: try repository.loadSettings(profileId: profileId))
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func savePlayTimeSettings(_ settings: ParentPlayTimeSettings) async throws {
    let repository = playTimeSettingsRepository

    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try repository.saveSettings(settings)
          continuation.resume(returning: ())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private static func playTimeTimingConfiguration(
    from processInfo: ProcessInfo
  ) -> (intervalNanoseconds: UInt64, advancePerTickSeconds: Int) {
    let configuredSecondsPerMinute = Double(
      processInfo.environment["EDUGAMES_DEBUG_SECONDS_PER_MINUTE"] ?? ""
    ) ?? 60
    let clampedSecondsPerMinute = max(0.1, configuredSecondsPerMinute)
    let tickIntervalSeconds = min(1.0, clampedSecondsPerMinute)
    let advancePerTickSeconds = max(
      1,
      Int(((tickIntervalSeconds * 60) / clampedSecondsPerMinute).rounded())
    )

    return (UInt64(tickIntervalSeconds * 1_000_000_000), advancePerTickSeconds)
  }

  private func finishActiveRuntime(message: String?) {
    flushActiveTelemetry(includeSessionEnd: true)
    stopPlayTimeTicker(clearSession: true)
    activeLaunchDetails = nil
    route = .catalog
    bootstrapErrorMessage = message
  }

  private func handleAuthRecoveryIfNeeded(for error: Error) async -> Bool {
    do {
      guard try await bootstrapService.recoverFromAuthFailureIfNeeded(from: error) else {
        return false
      }
    } catch {
      Self.logger.error(
        "handleAuthRecoveryIfNeeded failed to recover error=\(String(describing: error), privacy: .public)"
      )
      return false
    }

    Self.logger.info("handleAuthRecoveryIfNeeded reset local shell state after auth failure")
    flushActiveTelemetry(includeSessionEnd: false)
    stopPlayTimeTicker(clearSession: true)
    profiles = []
    selectedProfile = nil
    catalog = nil
    selectedGame = nil
    gameDetail = nil
    activeLaunchDetails = nil
    gameDetailRequestID = nil
    reportIssueContext = nil
    reportSubmissionErrorMessage = nil
    route = .profiles
    bootstrapErrorMessage = "The local API restarted, so saved profiles were reset. Create a new profile to continue."
    return true
  }

  private func flushActiveTelemetry(includeSessionEnd: Bool) {
    guard var activeTelemetryBatch else {
      return
    }

    self.activeTelemetryBatch = nil

    if includeSessionEnd {
      activeTelemetryBatch.events.append(.sessionEnd(at: Self.timestamp()))
    }

    let telemetryBatch = activeTelemetryBatch

    Task {
      try? await bootstrapService.ingestTelemetryBatch(
        profileId: telemetryBatch.profileId,
        launchSessionId: telemetryBatch.launchSessionId,
        events: telemetryBatch.events
      )
    }
  }

  private static func timestamp() -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: Date())
  }
}

private enum ParentGateDestination {
  case parentZone
  case extendPlayTime
  case reportIssue
}

private struct ActiveTelemetryBatch {
  let profileId: String
  let launchSessionId: String
  var events: [TelemetryEventPayload]
}

private struct ReportIssueContext {
  let profileId: String
  let gameId: String
  let gameTitle: String
}

private struct FixedParentGateChallengeFactory: ParentGateChallengeFactory {
  func makeChallenge() -> ParentGateChallenge {
    ParentGateChallenge(
      prompt: "For parents: what is 7 + 5?",
      answer: 12,
      choices: [11, 12, 13]
    )
  }
}
