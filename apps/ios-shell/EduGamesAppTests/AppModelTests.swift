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
}
