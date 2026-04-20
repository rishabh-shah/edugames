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
    #expect(snapshot.didResetLocalProfiles == false)
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
    let profiles = try await service.createProfile(.sample)

    #expect(profiles.count == 1)
    #expect(profiles[0].ageBand == "PRESCHOOL_3_5")
    #expect(try profileRepository.fetchProfiles().count == 1)
  }

  @Test("bootstrap refreshes a stored session and preserves local profiles")
  func bootstrapRefreshesStoredSession() async throws {
    let staleSession = InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_stale_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_stale_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let refreshedSession = InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_refreshed_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_refreshed_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let sessionStore = InMemorySessionStore()
    try sessionStore.saveSession(staleSession)
    let profileRepository = InMemoryProfileRepository(
      profiles: [
        ChildProfile(
          id: "prof_fixture_01",
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: .girl,
          ageBand: "PRESCHOOL_3_5",
          avatarId: "balloon-bear",
          createdAt: "2026-04-19T19:10:00Z",
          lastActiveAt: "2026-04-19T19:10:00Z"
        )
      ]
    )
    let apiClient = SessionRecoveryPlatformAPIClient(
      refreshedSession: refreshedSession
    )
    let service = BootstrapService(
      apiClient: apiClient,
      sessionStore: sessionStore,
      profileRepository: profileRepository
    )

    let snapshot = try await service.bootstrap()

    #expect(snapshot.session == refreshedSession)
    #expect(snapshot.didResetLocalProfiles == false)
    #expect(snapshot.profiles.count == 1)
    #expect(apiClient.refreshCallCount == 1)
    #expect(apiClient.registerCallCount == 0)
    #expect(try sessionStore.loadSession() == refreshedSession)
  }

  @Test("bootstrap re-registers and clears local profiles when a saved session is stale")
  func bootstrapReregistersAndClearsProfilesAfterAuthFailure() async throws {
    let staleSession = InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_stale_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_stale_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let replacementSession = InstallationSession(
      installationId: "inst_recovered_ios",
      accessToken: "access_recovered_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_recovered_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let sessionStore = InMemorySessionStore()
    try sessionStore.saveSession(staleSession)
    let profileRepository = InMemoryProfileRepository(
      profiles: [
        ChildProfile(
          id: "prof_fixture_01",
          firstName: "Ava",
          lastName: "Shah",
          age: 5,
          gender: .girl,
          ageBand: "PRESCHOOL_3_5",
          avatarId: "balloon-bear",
          createdAt: "2026-04-19T19:10:00Z",
          lastActiveAt: "2026-04-19T19:10:00Z"
        )
      ]
    )
    let apiClient = SessionRecoveryPlatformAPIClient(
      refreshedSession: replacementSession,
      refreshError: LivePlatformAPIClientError.httpStatus(401, "Refresh token is invalid.")
    )
    let service = BootstrapService(
      apiClient: apiClient,
      sessionStore: sessionStore,
      profileRepository: profileRepository
    )

    let snapshot = try await service.bootstrap()

    #expect(snapshot.session == replacementSession)
    #expect(snapshot.didResetLocalProfiles)
    #expect(snapshot.profiles.isEmpty)
    #expect(apiClient.refreshCallCount == 1)
    #expect(apiClient.registerCallCount == 1)
    #expect(try sessionStore.loadSession() == replacementSession)
    #expect(try profileRepository.fetchProfiles().isEmpty)
  }

  @Test("create profile recovers from a stale saved session and replaces cleared local state")
  func createProfileRecoversFromStaleSession() async throws {
    let staleSession = InstallationSession(
      installationId: "inst_fixture_ios",
      accessToken: "access_stale_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_stale_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let replacementSession = InstallationSession(
      installationId: "inst_recovered_ios",
      accessToken: "access_recovered_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_recovered_token_abcdefghijklmnopqrstuvwxyz5678"
    )
    let sessionStore = InMemorySessionStore()
    try sessionStore.saveSession(staleSession)
    let profileRepository = InMemoryProfileRepository(
      profiles: [
        ChildProfile(
          id: "prof_fixture_legacy",
          firstName: "Legacy",
          lastName: "Profile",
          age: 5,
          gender: .preferNotToSay,
          ageBand: "PRESCHOOL_3_5",
          avatarId: "balloon-bear",
          createdAt: "2026-04-19T19:10:00Z",
          lastActiveAt: "2026-04-19T19:10:00Z"
        )
      ]
    )
    let apiClient = SessionRecoveryPlatformAPIClient(
      refreshedSession: replacementSession,
      createProfileError: LivePlatformAPIClientError.httpStatus(401, "Access token is invalid.")
    )
    let service = BootstrapService(
      apiClient: apiClient,
      sessionStore: sessionStore,
      profileRepository: profileRepository
    )

    let profiles = try await service.createProfile(.sample)

    #expect(apiClient.registerCallCount == 1)
    #expect(apiClient.refreshCallCount == 0)
    #expect(profiles.count == 1)
    #expect(profiles[0].id == "prof_fixture_recovered")
    #expect(try sessionStore.loadSession() == replacementSession)
    #expect(try profileRepository.fetchProfiles().map(\.id) == ["prof_fixture_recovered"])
  }
}

@MainActor
private final class SessionRecoveryPlatformAPIClient: PlatformAPIClient {
  private let refreshedSession: InstallationSession
  private let refreshError: Error?
  private let createProfileError: Error?
  private(set) var refreshCallCount = 0
  private(set) var registerCallCount = 0
  private var hasThrownCreateProfileError = false

  init(
    refreshedSession: InstallationSession,
    refreshError: Error? = nil,
    createProfileError: Error? = nil
  ) {
    self.refreshedSession = refreshedSession
    self.refreshError = refreshError
    self.createProfileError = createProfileError
  }

  func registerInstallation() async throws -> InstallationSession {
    registerCallCount += 1
    return refreshedSession
  }

  func refreshInstallation(
    session: InstallationSession
  ) async throws -> InstallationSession {
    refreshCallCount += 1

    if let refreshError {
      throw refreshError
    }

    return refreshedSession
  }

  func createProfile(
    session: InstallationSession,
    firstName: String,
    lastName: String,
    age: Int,
    gender: ChildGender
  ) async throws -> ChildProfile {
    if let createProfileError, hasThrownCreateProfileError == false {
      hasThrownCreateProfileError = true
      throw createProfileError
    }

    return ChildProfile(
      id: "prof_fixture_recovered",
      firstName: firstName,
      lastName: lastName,
      age: age,
      gender: gender,
      ageBand: CreateChildProfileInput(firstName: firstName, lastName: lastName, age: age, gender: gender).ageBand,
      avatarId: gender.defaultAvatarId,
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
}
