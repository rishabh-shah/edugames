import Foundation
import Testing

@testable import EduGamesShellCore

@MainActor
struct AppModelTests {
  @Test("bootstrap transitions the shell to the profile picker")
  func bootstrapShowsProfiles() async {
    let model = AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: InMemorySessionStore(),
        profileRepository: InMemoryProfileRepository()
      )
    )

    await model.bootstrap()

    #expect(model.route == .profiles)
    #expect(model.bootstrapErrorMessage == nil)
    #expect(model.profiles.isEmpty)
  }

  @Test("selecting a profile loads the catalog")
  func selectingProfileLoadsCatalog() async {
    let sessionStore = InMemorySessionStore()
    let repository = InMemoryProfileRepository(
      profiles: [
        ChildProfile(
          id: "prof_fixture_01",
          ageBand: "PRESCHOOL_3_5",
          avatarId: "balloon-bear",
          createdAt: "2026-04-19T19:10:00Z",
          lastActiveAt: "2026-04-19T19:10:00Z"
        )
      ]
    )
    let model = AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: sessionStore,
        profileRepository: repository
      )
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])

    #expect(model.route == .catalog)
    #expect(model.catalog?.sections.first?.items.first?.gameId == "shape-match")
  }

  @Test("creating a profile clears an old error banner on success")
  func createProfileClearsExistingError() async {
    let model = AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: InMemorySessionStore(),
        profileRepository: InMemoryProfileRepository()
      )
    )

    await model.bootstrap()
    model.bootstrapErrorMessage = "Old error"

    await model.createProfile(.presets[0])

    #expect(model.bootstrapErrorMessage == nil)
    #expect(model.profiles.count == 1)
  }

  @Test("returning to profiles clears a stale catalog error")
  func backToProfilesClearsExistingError() async {
    let model = AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: InMemorySessionStore(),
        profileRepository: InMemoryProfileRepository()
      )
    )

    model.route = .catalog
    model.catalog = .sample
    model.bootstrapErrorMessage = "Could not load the catalog right now."

    model.backToProfiles()

    #expect(model.route == .profiles)
    #expect(model.catalog == nil)
    #expect(model.bootstrapErrorMessage == nil)
  }

  @Test("selecting a catalog game loads its detail screen")
  func selectingCatalogGameLoadsDetail() async throws {
    let model = try makeLaunchReadyModel()

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])

    #expect(model.route == .gameDetail)
    #expect(model.selectedGame?.gameId == "shape-match")
    #expect(model.gameDetail?.gameId == "shape-match")
    #expect(model.bootstrapErrorMessage == nil)
  }

  @Test("launching a selected game prepares the runtime and exit returns to catalog")
  func launchingSelectedGameShowsRuntimeAndExitsCleanly() async throws {
    let model = try makeLaunchReadyModel()

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    #expect(model.route == .runtime)
    #expect(model.activeLaunchDetails?.launchSession.gameId == "shape-match")
    #expect(model.activeLaunchDetails?.installedBundle.entrypointURL.lastPathComponent == "index.html")

    model.exitActiveGame()

    #expect(model.route == .catalog)
    #expect(model.activeLaunchDetails == nil)
    #expect(model.bootstrapErrorMessage == nil)
  }

  @Test("launching and exiting uploads session telemetry including runtime milestones")
  func exitingRuntimeFlushesTelemetry() async throws {
    let recordingClient = RecordingPlatformAPIClient()
    let model = try makeModel(
      bootstrapAPIClient: recordingClient,
      runtimeAPIClient: recordingClient
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    model.recordRuntimeEvent(name: "milestone:first-match", value: 1)
    model.exitActiveGame()
    await recordingClient.waitForTelemetryBatch(count: 1)

    #expect(recordingClient.telemetryBatches.count == 1)
    #expect(recordingClient.telemetryBatches[0].profileId == "prof_fixture_01")
    #expect(recordingClient.telemetryBatches[0].events.map(\.type) == [
      "session_start",
      "milestone",
      "session_end"
    ])
    #expect(recordingClient.telemetryBatches[0].events[1].name == "first-match")
  }

  @Test("runtime reports stay behind the parent gate and submit through the bootstrap client")
  func runtimeReportFlowSubmitsAfterParentGate() async throws {
    let recordingClient = RecordingPlatformAPIClient()
    let model = try makeModel(
      bootstrapAPIClient: recordingClient,
      runtimeAPIClient: recordingClient
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    model.requestRuntimeReport()

    #expect(model.isParentGatePresented)
    #expect(model.isReportIssuePresented == false)

    model.submitParentGateAnswer(12)

    #expect(model.isReportIssuePresented)

    await model.submitRuntimeReport(
      reason: .bug,
      details: "The round froze after the first match."
    )

    #expect(recordingClient.submittedReports.count == 1)
    #expect(recordingClient.submittedReports[0].gameId == "shape-match")
    #expect(recordingClient.submittedReports[0].reason == .bug)
    #expect(model.isReportIssuePresented == false)
    #expect(model.reportSubmissionErrorMessage == nil)
  }

  @Test("the latest game selection wins when detail requests finish out of order")
  func latestGameSelectionWinsOutOfOrderResponses() async throws {
    let apiClient = DelayedDetailPlatformAPIClient()
    let model = try makeModel(
      bootstrapAPIClient: apiClient,
      runtimeAPIClient: apiClient
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])

    let games = try #require(model.catalog?.sections.first?.items)
    let firstGame = games[0]
    let secondGame = games[1]

    let firstSelection = Task { await model.selectGame(firstGame) }
    let secondSelection = Task { await model.selectGame(secondGame) }

    await apiClient.waitForPendingDetailRequests(count: 2)

    apiClient.resumeDetail(
      slug: secondGame.slug,
      with: GameDetailResponse.sampleDetail(
        gameId: secondGame.gameId,
        slug: secondGame.slug,
        title: secondGame.title
      )
    )
    _ = await secondSelection.value

    apiClient.resumeDetail(
      slug: firstGame.slug,
      with: GameDetailResponse.sampleDetail(
        gameId: firstGame.gameId,
        slug: firstGame.slug,
        title: firstGame.title
      )
    )
    _ = await firstSelection.value

    #expect(model.selectedGame?.gameId == secondGame.gameId)
    #expect(model.gameDetail?.gameId == secondGame.gameId)
    #expect(model.gameDetail?.slug == secondGame.slug)
    #expect(model.route == .gameDetail)
  }

  @Test("launching enters the runtime loading state before bundle prep finishes")
  func launchShowsRuntimeLoadingStateBeforePreparationFinishes() async throws {
    let apiClient = DelayedLaunchPlatformAPIClient()
    let model = try makeModel(
      bootstrapAPIClient: apiClient,
      runtimeAPIClient: apiClient
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])

    let launchTask = Task {
      await model.launchSelectedGame()
    }

    await apiClient.waitForPendingLaunchRequest()

    #expect(model.route == .runtime)
    #expect(model.activeLaunchDetails == nil)
    #expect(model.bootstrapErrorMessage == nil)

    apiClient.resumeLaunch(with: LaunchSessionResponse.fixture)
    _ = await launchTask.value

    #expect(model.activeLaunchDetails?.launchSession.gameId == "shape-match")
  }

  private func makeLaunchReadyModel() throws -> AppModel {
    try makeModel(
      bootstrapAPIClient: FixturePlatformAPIClient(),
      runtimeAPIClient: FixturePlatformAPIClient()
    )
  }

  private func makeModel(
    bootstrapAPIClient: PlatformAPIClient,
    runtimeAPIClient: PlatformAPIClient
  ) throws -> AppModel {
    let sessionStore = InMemorySessionStore()
    try sessionStore.saveSession(
      InstallationSession(
        installationId: "inst_fixture_ios",
        accessToken: "access_fixture_token_1234567890abcdefghijklmnop",
        refreshToken: "refresh_fixture_token_1234567890abcdefghijklmnop"
      )
    )

    let profileRepository = InMemoryProfileRepository(
      profiles: [
        ChildProfile(
          id: "prof_fixture_01",
          ageBand: "PRESCHOOL_3_5",
          avatarId: "balloon-bear",
          createdAt: "2026-04-19T19:10:00Z",
          lastActiveAt: "2026-04-19T19:10:00Z"
        )
      ]
    )
    let database = try AppDatabase()
    let launchService = GameRuntimeLaunchService(
      apiClient: runtimeAPIClient,
      bundleInstallService: BundleInstallService(
        cacheRepository: SQLiteBundleCacheRepository(database: database),
        installRootURL: FileManager.default.temporaryDirectory
          .appendingPathComponent(UUID().uuidString, isDirectory: true)
      )
    )

    return AppModel(
      bootstrapService: BootstrapService(
        apiClient: bootstrapAPIClient,
        sessionStore: sessionStore,
        profileRepository: profileRepository
      ),
      runtimeLaunchService: launchService,
      parentGateChallengeFactory: StableParentGateChallengeFactory()
    )
  }
}

@MainActor
private final class DelayedDetailPlatformAPIClient: PlatformAPIClient {
  private var detailContinuations: [String: CheckedContinuation<GameDetailResponse, Error>] = [:]

  func registerInstallation() async throws -> InstallationSession {
    InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_fixture_token_1234567890abcdefghijklmnop",
      refreshToken: "refresh_fixture_token_1234567890abcdefghijklmnop"
    )
  }

  func createProfile(
    session: InstallationSession,
    ageBand: String,
    avatarId: String
  ) async throws -> ChildProfile {
    ChildProfile(
      id: "prof_fixture_01",
      ageBand: ageBand,
      avatarId: avatarId,
      createdAt: "2026-04-19T19:10:00Z",
      lastActiveAt: "2026-04-19T19:10:00Z"
    )
  }

  func fetchCatalog(
    session: InstallationSession,
    profileId: String
  ) async throws -> CatalogResponse {
    CatalogResponse(
      generatedAt: CatalogResponse.sample.generatedAt,
      sections: [
        CatalogSection(
          key: "featured",
          title: "Featured",
          items: [
            CatalogResponse.sample.sections[0].items[0],
            CatalogGame(
              gameId: "counting-kites",
              slug: "counting-kites",
              version: "0.1.0",
              title: "Counting Kites",
              summary: "Count the kites before they float away.",
              ageBand: "PRESCHOOL_3_5",
              iconUrl: "https://cdn.example/games/counting-kites/0.1.0/assets/icon.svg",
              cached: false
            )
          ]
        )
      ]
    )
  }

  func fetchGameDetail(
    session: InstallationSession,
    profileId: String,
    slug: String
  ) async throws -> GameDetailResponse {
    try await withCheckedThrowingContinuation { continuation in
      detailContinuations[slug] = continuation
    }
  }

  func createLaunchSession(
    session: InstallationSession,
    profileId: String,
    gameId: String
  ) async throws -> LaunchSessionResponse {
    LaunchSessionResponse.fixture
  }

  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    ReportSubmissionResponse(reportId: "rep_fixture_123abc", status: "open")
  }

  func ingestTelemetryBatch(
    session: InstallationSession,
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse {
    TelemetryBatchResponse(accepted: events.count)
  }

  func waitForPendingDetailRequests(count: Int) async {
    while detailContinuations.count < count {
      await Task.yield()
    }
  }

  func resumeDetail(slug: String, with detail: GameDetailResponse) {
    detailContinuations.removeValue(forKey: slug)?.resume(returning: detail)
  }
}

@MainActor
private final class DelayedLaunchPlatformAPIClient: PlatformAPIClient {
  private var launchContinuation: CheckedContinuation<LaunchSessionResponse, Error>?

  func registerInstallation() async throws -> InstallationSession {
    InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_fixture_token_1234567890abcdefghijklmnop",
      refreshToken: "refresh_fixture_token_1234567890abcdefghijklmnop"
    )
  }

  func createProfile(
    session: InstallationSession,
    ageBand: String,
    avatarId: String
  ) async throws -> ChildProfile {
    ChildProfile(
      id: "prof_fixture_01",
      ageBand: ageBand,
      avatarId: avatarId,
      createdAt: "2026-04-19T19:10:00Z",
      lastActiveAt: "2026-04-19T19:10:00Z"
    )
  }

  func fetchCatalog(
    session: InstallationSession,
    profileId: String
  ) async throws -> CatalogResponse {
    CatalogResponse.sample
  }

  func fetchGameDetail(
    session: InstallationSession,
    profileId: String,
    slug: String
  ) async throws -> GameDetailResponse {
    GameDetailResponse.sample
  }

  func createLaunchSession(
    session: InstallationSession,
    profileId: String,
    gameId: String
  ) async throws -> LaunchSessionResponse {
    try await withCheckedThrowingContinuation { continuation in
      launchContinuation = continuation
    }
  }

  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    ReportSubmissionResponse(reportId: "rep_fixture_123abc", status: "open")
  }

  func ingestTelemetryBatch(
    session: InstallationSession,
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse {
    TelemetryBatchResponse(accepted: events.count)
  }

  func waitForPendingLaunchRequest() async {
    while launchContinuation == nil {
      await Task.yield()
    }
  }

  func resumeLaunch(with launchSession: LaunchSessionResponse) {
    launchContinuation?.resume(returning: launchSession)
    launchContinuation = nil
  }
}

@MainActor
private final class RecordingPlatformAPIClient: PlatformAPIClient {
  struct SubmittedReport {
    let profileId: String
    let gameId: String
    let reason: ReportReason
    let details: String?
  }

  struct SubmittedTelemetryBatch {
    let profileId: String
    let launchSessionId: String
    let events: [TelemetryEventPayload]
  }

  private(set) var submittedReports: [SubmittedReport] = []
  private(set) var telemetryBatches: [SubmittedTelemetryBatch] = []

  func registerInstallation() async throws -> InstallationSession {
    InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_fixture_token_1234567890abcdefghijklmnop",
      refreshToken: "refresh_fixture_token_1234567890abcdefghijklmnop"
    )
  }

  func createProfile(
    session: InstallationSession,
    ageBand: String,
    avatarId: String
  ) async throws -> ChildProfile {
    ChildProfile(
      id: "prof_fixture_01",
      ageBand: ageBand,
      avatarId: avatarId,
      createdAt: "2026-04-19T19:10:00Z",
      lastActiveAt: "2026-04-19T19:10:00Z"
    )
  }

  func fetchCatalog(
    session: InstallationSession,
    profileId: String
  ) async throws -> CatalogResponse {
    CatalogResponse.sample
  }

  func fetchGameDetail(
    session: InstallationSession,
    profileId: String,
    slug: String
  ) async throws -> GameDetailResponse {
    GameDetailResponse.sample
  }

  func createLaunchSession(
    session: InstallationSession,
    profileId: String,
    gameId: String
  ) async throws -> LaunchSessionResponse {
    LaunchSessionResponse.fixture
  }

  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    submittedReports.append(
      SubmittedReport(
        profileId: profileId,
        gameId: gameId,
        reason: reason,
        details: details
      )
    )

    return ReportSubmissionResponse(
      reportId: "rep_recorded_123abc",
      status: "open"
    )
  }

  func ingestTelemetryBatch(
    session: InstallationSession,
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse {
    telemetryBatches.append(
      SubmittedTelemetryBatch(
        profileId: profileId,
        launchSessionId: launchSessionId,
        events: events
      )
    )

    return TelemetryBatchResponse(accepted: events.count)
  }

  func waitForTelemetryBatch(count: Int) async {
    while telemetryBatches.count < count {
      await Task.yield()
    }
  }
}

private struct StableParentGateChallengeFactory: ParentGateChallengeFactory {
  func makeChallenge() -> ParentGateChallenge {
    ParentGateChallenge(
      prompt: "For parents: what is 7 + 5?",
      answer: 12,
      choices: [11, 12, 13]
    )
  }
}

private extension GameDetailResponse {
  static func sampleDetail(
    gameId: String,
    slug: String,
    title: String
  ) -> GameDetailResponse {
    GameDetailResponse(
      gameId: gameId,
      slug: slug,
      title: title,
      summary: "Sample summary for \(title).",
      description: "Sample description for \(title).",
      version: "1.0.0",
      ageBand: "PRESCHOOL_3_5",
      screenshots: [],
      categories: ["sample"],
      offlineReady: true,
      contentFlags: GameContentFlags(
        externalLinks: false,
        ugc: false,
        chat: false,
        ads: false,
        purchases: false
      )
    )
  }
}
