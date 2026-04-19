import Foundation
import Observation
import Testing

@testable import EduGamesShellCore

@MainActor
struct ParentZoneAndPlayTimeTests {
  @Test("parent zone access stays gated until the adult answers correctly")
  func parentZoneRequiresCorrectGateAnswer() async throws {
    let model = try makeModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: InMemoryPlayTimeSettingsRepository()
    )

    await model.bootstrap()
    model.requestParentZoneAccess()

    #expect(model.isParentGatePresented)
    #expect(model.route == .profiles)

    model.submitParentGateAnswer(11)

    #expect(model.route == .profiles)
    #expect(model.parentGateErrorMessage == "That answer didn’t match. Try again.")

    model.submitParentGateAnswer(12)

    #expect(model.route == .parentZone)
    #expect(model.isParentGatePresented == false)
  }

  @Test("changing a profile play-time limit invalidates observed parent zone state")
  func changingPlayTimeLimitInvalidatesObservedState() async throws {
    let model = try makeModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: InMemoryPlayTimeSettingsRepository()
    )

    await model.bootstrap()

    let profile = try #require(model.profiles.first)
    let invalidation = ObservationInvalidationRecorder()

    withObservationTracking {
      _ = model.playTimeLimit(for: profile)
    } onChange: {
      invalidation.didInvalidate = true
    }

    model.setPlayTimeLimit(.minutes45, for: profile)

    #expect(model.playTimeLimit(for: profile) == .minutes45)
    #expect(invalidation.didInvalidate)
  }

  @Test("launching a game uses the saved per-profile play time limit")
  func launchingUsesSavedPerProfilePlayTimeLimit() async throws {
    let settingsRepository = InMemoryPlayTimeSettingsRepository(
      settings: [
        ParentPlayTimeSettings(
          profileId: "prof_fixture_01",
          playTimeLimit: .minutes45
        )
      ]
    )
    let model = try makeLaunchReadyModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: settingsRepository
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    #expect(model.playTimeSession?.baseLimit == .minutes45)
    #expect(model.playTimeSession?.remainingSeconds == 45 * 60)
  }

  @Test("play time warning thresholds appear at five minutes and one minute remaining, then expire back to catalog")
  func playTimeWarningsAndExpiry() async throws {
    let settingsRepository = InMemoryPlayTimeSettingsRepository(
      settings: [
        ParentPlayTimeSettings(
          profileId: "prof_fixture_01",
          playTimeLimit: .minutes15
        )
      ]
    )
    let model = try makeLaunchReadyModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: settingsRepository
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    model.advancePlayTimeForTesting(by: 10 * 60)

    #expect(model.playTimeSession?.warningState == .fiveMinutesRemaining)

    model.advancePlayTimeForTesting(by: 4 * 60)

    #expect(model.playTimeSession?.warningState == .oneMinuteRemaining)

    model.advancePlayTimeForTesting(by: 60)

    #expect(model.route == .catalog)
    #expect(model.activeLaunchDetails == nil)
    #expect(model.playTimeSession == nil)
    #expect(model.bootstrapErrorMessage == "Play time is up. Ask a parent to extend time in Parent Zone.")
  }

  @Test("only active foreground gameplay consumes play time")
  func playTimePausesOutsideActiveGameplay() async throws {
    let settingsRepository = InMemoryPlayTimeSettingsRepository(
      settings: [
        ParentPlayTimeSettings(
          profileId: "prof_fixture_01",
          playTimeLimit: .minutes15
        )
      ]
    )
    let model = try makeLaunchReadyModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: settingsRepository
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()

    model.setSceneActiveForTesting(false)
    model.advancePlayTimeForTesting(by: 120)

    #expect(model.playTimeSession?.remainingSeconds == 15 * 60)

    model.setSceneActiveForTesting(true)
    model.advancePlayTimeForTesting(by: 120)

    #expect(model.playTimeSession?.remainingSeconds == 13 * 60)
  }

  @Test("session extension requires the adult gate and adds more time once approved")
  func gatedSessionExtensionAddsMoreTime() async throws {
    let settingsRepository = InMemoryPlayTimeSettingsRepository(
      settings: [
        ParentPlayTimeSettings(
          profileId: "prof_fixture_01",
          playTimeLimit: .minutes15
        )
      ]
    )
    let model = try makeLaunchReadyModel(
      gateChallengeFactory: FixedParentGateChallengeFactory(),
      playTimeSettingsRepository: settingsRepository
    )

    await model.bootstrap()
    await model.selectProfile(model.profiles[0])
    await model.selectGame(model.catalog?.sections[0].items[0] ?? CatalogResponse.sample.sections[0].items[0])
    await model.launchSelectedGame()
    model.advancePlayTimeForTesting(by: 14 * 60)

    let remainingBeforeExtension = try #require(model.playTimeSession?.remainingSeconds)

    model.requestPlayTimeExtension()
    #expect(model.isParentGatePresented)

    model.submitParentGateAnswer(12)

    #expect(model.isPlayTimeExtensionPickerPresented)

    model.extendActivePlaySession(by: .minutes30)

    #expect(model.playTimeSession?.remainingSeconds == remainingBeforeExtension + (30 * 60))
    #expect(model.playTimeSession?.totalAllocatedMinutes == 45)
  }

  private func makeModel(
    gateChallengeFactory: ParentGateChallengeFactory,
    playTimeSettingsRepository: PlayTimeSettingsRepository
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

    return AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: sessionStore,
        profileRepository: profileRepository
      ),
      runtimeLaunchService: nil,
      saveStateRepository: InMemorySaveStateRepository(),
      playTimeSettingsRepository: playTimeSettingsRepository,
      parentGateChallengeFactory: gateChallengeFactory
    )
  }

  private func makeLaunchReadyModel(
    gateChallengeFactory: ParentGateChallengeFactory,
    playTimeSettingsRepository: PlayTimeSettingsRepository
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
      apiClient: FixturePlatformAPIClient(),
      bundleInstallService: BundleInstallService(
        cacheRepository: SQLiteBundleCacheRepository(database: database),
        installRootURL: FileManager.default.temporaryDirectory
          .appendingPathComponent(UUID().uuidString, isDirectory: true)
      )
    )

    return AppModel(
      bootstrapService: BootstrapService(
        apiClient: FixturePlatformAPIClient(),
        sessionStore: sessionStore,
        profileRepository: profileRepository
      ),
      runtimeLaunchService: launchService,
      saveStateRepository: InMemorySaveStateRepository(),
      playTimeSettingsRepository: playTimeSettingsRepository,
      parentGateChallengeFactory: gateChallengeFactory
    )
  }
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

private final class ObservationInvalidationRecorder: @unchecked Sendable {
  var didInvalidate = false
}
