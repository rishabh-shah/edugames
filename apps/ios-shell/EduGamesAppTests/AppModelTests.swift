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
      runtimeLaunchService: launchService
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
