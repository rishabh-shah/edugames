import Foundation
import Testing

@testable import EduGamesShellCore

@MainActor
struct PersistenceAndDecodingTests {
  private let fixtureSession = InstallationSession(
    installationId: "inst_fixture_ios",
    accessToken: "tok_fixture_installation",
    refreshToken: "ref_fixture_installation"
  )

  @Test("SQLite profile repository round-trips profiles")
  func profileRepositoryRoundTrip() throws {
    let database = try AppDatabase()
    let repository = SQLiteProfileRepository(database: database)
    let profile = ChildProfile(
      id: "prof_local_01",
      ageBand: "EARLY_PRIMARY_6_8",
      avatarId: "rocket-fox",
      createdAt: "2026-04-19T19:20:00Z",
      lastActiveAt: "2026-04-19T19:20:00Z"
    )

    try repository.saveProfile(profile)
    let profiles = try repository.fetchProfiles()

    #expect(profiles == [profile])
  }

  @Test("bootstrap succeeds with live keychain and SQLite stores")
  func bootstrapWithLiveStores() async throws {
    let sessionStore = KeychainSessionStore()
    try? sessionStore.clear()

    let database = try AppDatabase.makeLive(resetLocalData: true)
    let repository = SQLiteProfileRepository(database: database)
    let service = BootstrapService(
      apiClient: FixturePlatformAPIClient(),
      sessionStore: sessionStore,
      profileRepository: repository
    )

    let snapshot = try await service.bootstrap()

    #expect(snapshot.session.installationId == "inst_fixture_ios")
    #expect(snapshot.profiles.isEmpty)
    #expect(try sessionStore.loadSession() == snapshot.session)
  }

  @Test("keychain session store reads the simulator fallback when the keychain is empty")
  func keychainSessionStoreFallsBackWhenPrimaryReadIsEmpty() throws {
    let fallbackStore = InMemorySessionStore()
    try fallbackStore.saveSession(fixtureSession)
    let sessionStore = KeychainSessionStore(
      fallbackStore: fallbackStore,
      keychainClient: KeychainClient(
        loadData: { nil },
        saveData: { _ in },
        clearData: {}
      )
    )

    let session = try sessionStore.loadSession()

    #expect(session == fixtureSession)
  }

  @Test("keychain session store clears the simulator fallback after a successful primary clear")
  func keychainSessionStoreClearsFallbackWhenPrimaryClearSucceeds() throws {
    let fallbackStore = InMemorySessionStore()
    try fallbackStore.saveSession(fixtureSession)
    let sessionStore = KeychainSessionStore(
      fallbackStore: fallbackStore,
      keychainClient: KeychainClient(
        loadData: { nil },
        saveData: { _ in },
        clearData: {}
      )
    )

    try sessionStore.clear()

    #expect(try fallbackStore.loadSession() == nil)
  }

  @Test("catalog response decodes shared contract fixtures")
  func catalogFixtureDecoding() throws {
    let data = """
    {
      "generatedAt": "2026-04-19T19:00:00Z",
      "sections": [
        {
          "key": "featured",
          "title": "Featured",
          "items": [
            {
              "gameId": "shape-match",
              "slug": "shape-match",
              "version": "0.1.0",
              "title": "Shape Match Garden",
              "summary": "Match bright shapes into their cozy outlines in a calm garden scene.",
              "ageBand": "PRESCHOOL_3_5",
              "iconUrl": "https://cdn.example/games/shape-match/0.1.0/assets/icon.svg",
              "cached": false
            }
          ]
        }
      ]
    }
    """.data(using: .utf8)!

    let decoded = try JSONDecoder().decode(CatalogResponse.self, from: data)

    #expect(decoded.sections.count == 1)
    #expect(decoded.sections[0].items[0].title == "Shape Match Garden")
  }

  @Test("bundle checksum verification fails closed on a mismatched archive")
  func bundleChecksumVerificationFailsOnMismatch() throws {
    let fixtureArchiveURL = try #require(
      FixtureBundleResourceLocator.resourceURL(
        named: "shape-match-fixture",
        withExtension: "zip"
      )
    )
    let verifier = BundleArchiveChecksumVerifier()

    do {
      try verifier.verifyArchive(
        at: fixtureArchiveURL,
        expectedSHA256: String(repeating: "0", count: 64)
      )
      Issue.record("Expected checksum verification to fail for a mismatched archive.")
    } catch let error as BundleInstallError {
      guard case .checksumMismatch(let expected, let actual) = error else {
        Issue.record("Expected a checksum mismatch error, received \(error) instead.")
        return
      }

      #expect(expected == String(repeating: "0", count: 64))
      #expect(actual.count == 64)
    }
  }

  @Test("fixture bundle install persists cache metadata and exposes a local entrypoint")
  func fixtureBundleInstallPersistsCacheMetadata() throws {
    let database = try AppDatabase()
    let cacheRepository = SQLiteBundleCacheRepository(database: database)
    let installRootURL = FileManager.default.temporaryDirectory
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    let service = BundleInstallService(
      cacheRepository: cacheRepository,
      installRootURL: installRootURL
    )
    let launchSession = LaunchSessionResponse.fixture

    let installedBundle = try service.installBundle(from: launchSession)
    let cachedRecord = try cacheRepository.fetchRecord(
      gameId: launchSession.gameId,
      version: launchSession.version
    )

    #expect(FileManager.default.fileExists(atPath: installedBundle.entrypointURL.path))
    #expect(installedBundle.entrypointURL.lastPathComponent == "index.html")
    #expect(installedBundle.archiveURL.lastPathComponent == "shape-match-fixture.zip")
    #expect(cachedRecord?.sha256 == launchSession.bundle.sha256)
    #expect(cachedRecord?.entrypointRelativePath == launchSession.manifest.entrypoint)
    #expect(cachedRecord?.sourceURL == launchSession.bundle.bundleURL.absoluteString)
  }

  @Test("SQLite save-state repository round-trips local game state")
  func saveStateRepositoryRoundTrip() throws {
    let database = try AppDatabase()
    let repository = SQLiteSaveStateRepository(database: database)
    let saveState = LocalSaveState(
      profileId: "prof_local_01",
      gameId: "shape-match",
      version: "1.0.0",
      payloadJSON: #"{"progress":{"matches":4,"streak":2}}"#,
      updatedAt: "2026-04-19T19:30:00Z"
    )

    try repository.saveState(saveState)
    let loadedState = try repository.loadState(
      profileId: saveState.profileId,
      gameId: saveState.gameId,
      version: saveState.version
    )

    #expect(loadedState == saveState)
  }
}
