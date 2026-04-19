import Testing

@testable import EduGamesShellCore

@MainActor
struct BootstrapServiceTests {
  @Test("bootstrap registers a session when none exists")
  func bootstrapRegistersAndLoadsProfiles() async throws {
    let sessionStore = InMemorySessionStore()
    let profileRepository = InMemoryProfileRepository()
    let service = BootstrapService(
      apiClient: FixturePlatformAPIClient(),
      sessionStore: sessionStore,
      profileRepository: profileRepository
    )

    let snapshot = try await service.bootstrap()

    #expect(snapshot.session.installationId == "inst_fixture_ios")
    #expect(snapshot.profiles.isEmpty)
    #expect(try sessionStore.loadSession() == snapshot.session)
  }

  @Test("create profile persists locally after bootstrap")
  func createProfilePersistsToRepository() async throws {
    let sessionStore = InMemorySessionStore()
    let profileRepository = InMemoryProfileRepository()
    let service = BootstrapService(
      apiClient: FixturePlatformAPIClient(),
      sessionStore: sessionStore,
      profileRepository: profileRepository
    )

    _ = try await service.bootstrap()
    let profiles = try await service.createProfile(.presets[0])

    #expect(profiles.count == 1)
    #expect(profiles[0].ageBand == "PRESCHOOL_3_5")
    #expect(try profileRepository.fetchProfiles().count == 1)
  }
}
