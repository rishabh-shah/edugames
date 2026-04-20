import Foundation

struct BootstrapSnapshot: Equatable {
  let session: InstallationSession
  let profiles: [ChildProfile]
  let didResetLocalProfiles: Bool
}

enum BootstrapServiceError: Error {
  case sessionMissing
}

@MainActor
final class BootstrapService {
  private let apiClient: PlatformAPIClient
  private let sessionStore: SessionStore
  private let profileRepository: ProfileRepository

  init(
    apiClient: PlatformAPIClient,
    sessionStore: SessionStore,
    profileRepository: ProfileRepository
  ) {
    self.apiClient = apiClient
    self.sessionStore = sessionStore
    self.profileRepository = profileRepository
  }

  func bootstrap() async throws -> BootstrapSnapshot {
    let sessionResolution = try await loadOrRegisterSession()
    let profiles = try profileRepository.fetchProfiles()

    return BootstrapSnapshot(
      session: sessionResolution.session,
      profiles: profiles,
      didResetLocalProfiles: sessionResolution.didResetLocalProfiles
    )
  }

  func createProfile(_ option: ProfileCreationOption) async throws -> [ChildProfile] {
    let session = try requireSession()
    let profile: ChildProfile

    do {
      profile = try await apiClient.createProfile(
        session: session,
        ageBand: option.ageBand,
        avatarId: option.avatarId
      )
    } catch {
      guard shouldRecoverSession(from: error) else {
        throw error
      }

      let recoveredSession = try await registerFreshSession(
        clearingLocalProfiles: true
      ).session
      profile = try await apiClient.createProfile(
        session: recoveredSession,
        ageBand: option.ageBand,
        avatarId: option.avatarId
      )
    }

    try profileRepository.saveProfile(profile)
    return try profileRepository.fetchProfiles()
  }

  func fetchCatalog(for profile: ChildProfile) async throws -> CatalogResponse {
    let session = try requireSession()
    return try await apiClient.fetchCatalog(
      session: session,
      profileId: profile.id
    )
  }

  func fetchGameDetail(
    for game: CatalogGame,
    profile: ChildProfile
  ) async throws -> GameDetailResponse {
    let session = try requireSession()
    return try await apiClient.fetchGameDetail(
      session: session,
      profileId: profile.id,
      slug: game.slug
    )
  }

  func currentSession() throws -> InstallationSession {
    try requireSession()
  }

  func submitReport(
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    let session = try requireSession()
    return try await apiClient.submitReport(
      session: session,
      profileId: profileId,
      gameId: gameId,
      reason: reason,
      details: details
    )
  }

  func ingestTelemetryBatch(
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse {
    let session = try requireSession()
    return try await apiClient.ingestTelemetryBatch(
      session: session,
      profileId: profileId,
      launchSessionId: launchSessionId,
      events: events
    )
  }

  func clearLocalData() throws {
    try profileRepository.clear()
    try sessionStore.clear()
  }

  private func requireSession() throws -> InstallationSession {
    guard let session = try sessionStore.loadSession() else {
      throw BootstrapServiceError.sessionMissing
    }

    return session
  }

  private func loadOrRegisterSession() async throws -> SessionResolution {
    if let existingSession = try sessionStore.loadSession() {
      do {
        let refreshedSession = try await apiClient.refreshInstallation(
          session: existingSession
        )
        try sessionStore.saveSession(refreshedSession)
        return SessionResolution(
          session: refreshedSession,
          didResetLocalProfiles: false
        )
      } catch {
        guard shouldRecoverSession(from: error) else {
          throw error
        }

        return try await registerFreshSession(clearingLocalProfiles: true)
      }
    }

    let newSession = try await apiClient.registerInstallation()
    try sessionStore.saveSession(newSession)
    return SessionResolution(
      session: newSession,
      didResetLocalProfiles: false
    )
  }

  private func registerFreshSession(
    clearingLocalProfiles: Bool
  ) async throws -> SessionResolution {
    try sessionStore.clear()

    if clearingLocalProfiles {
      try profileRepository.clear()
    }

    let newSession = try await apiClient.registerInstallation()
    try sessionStore.saveSession(newSession)

    return SessionResolution(
      session: newSession,
      didResetLocalProfiles: clearingLocalProfiles
    )
  }

  private func shouldRecoverSession(from error: Error) -> Bool {
    guard
      let clientError = error as? LivePlatformAPIClientError,
      case let .httpStatus(statusCode, _) = clientError
    else {
      return false
    }

    return statusCode == 401 || statusCode == 403
  }
}

private struct SessionResolution {
  let session: InstallationSession
  let didResetLocalProfiles: Bool
}
