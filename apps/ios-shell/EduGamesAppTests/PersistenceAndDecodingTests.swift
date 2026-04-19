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
}
