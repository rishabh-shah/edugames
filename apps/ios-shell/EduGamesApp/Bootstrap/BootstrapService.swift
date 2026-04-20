import Foundation
import OSLog

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
  private static let logger = Logger(
    subsystem: "com.edugames.ios-shell",
    category: "BootstrapService"
  )

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
    let profiles = try await fetchProfiles()

    return BootstrapSnapshot(
      session: sessionResolution.session,
      profiles: profiles,
      didResetLocalProfiles: sessionResolution.didResetLocalProfiles
    )
  }

  func createProfile(_ input: CreateChildProfileInput) async throws -> [ChildProfile] {
    Self.logger.info("createProfile entered firstName=\(input.normalizedFirstName, privacy: .public)")
    let session = try await requireSession()
    Self.logger.debug(
      "createProfile using session installationID=\(session.installationId, privacy: .public)"
    )
    let profile: ChildProfile

    do {
      profile = try await apiClient.createProfile(
        session: session,
        firstName: input.normalizedFirstName,
        lastName: input.normalizedLastName,
        age: input.age,
        gender: input.gender
      )
      Self.logger.info(
        "createProfile remote success profileID=\(profile.id, privacy: .public)"
      )
    } catch {
      Self.logger.error(
        "createProfile remote failure error=\(String(describing: error), privacy: .public)"
      )
      guard shouldRecoverSession(from: error) else {
        throw error
      }

      Self.logger.info("createProfile attempting session recovery after auth failure")
      let recoveredSession = try await registerFreshSession(
        clearingLocalProfiles: true
      ).session
      Self.logger.info(
        "createProfile recovered session installationID=\(recoveredSession.installationId, privacy: .public)"
      )
      profile = try await apiClient.createProfile(
        session: recoveredSession,
        firstName: input.normalizedFirstName,
        lastName: input.normalizedLastName,
        age: input.age,
        gender: input.gender
      )
      Self.logger.info(
        "createProfile retry success profileID=\(profile.id, privacy: .public)"
      )
    }

    Self.logger.debug(
      "createProfile saving profile locally profileID=\(profile.id, privacy: .public)"
    )
    try await saveProfile(profile)
    let profiles = try await fetchProfiles()
    Self.logger.info(
      "createProfile completed localProfileCount=\(profiles.count)"
    )
    return profiles
  }

  func fetchCatalog(for profile: ChildProfile) async throws -> CatalogResponse {
    let session = try await requireSession()
    return try await apiClient.fetchCatalog(
      session: session,
      profileId: profile.id
    )
  }

  func fetchGameDetail(
    for game: CatalogGame,
    profile: ChildProfile
  ) async throws -> GameDetailResponse {
    let session = try await requireSession()
    return try await apiClient.fetchGameDetail(
      session: session,
      profileId: profile.id,
      slug: game.slug
    )
  }

  func currentSession() async throws -> InstallationSession {
    try await requireSession()
  }

  func recoverFromAuthFailureIfNeeded(from error: Error) async throws -> Bool {
    guard shouldRecoverSession(from: error) else {
      return false
    }

    _ = try await registerFreshSession(clearingLocalProfiles: true)
    return true
  }

  func submitReport(
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    let session = try await requireSession()
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
    let session = try await requireSession()
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

  private func requireSession() async throws -> InstallationSession {
    guard let session = try await loadSession() else {
      Self.logger.error("requireSession failed because no session was available")
      throw BootstrapServiceError.sessionMissing
    }

    return session
  }

  private func loadOrRegisterSession() async throws -> SessionResolution {
    if let existingSession = try await loadSession() {
      Self.logger.info(
        "bootstrap found stored session installationID=\(existingSession.installationId, privacy: .public)"
      )
      do {
        let refreshedSession = try await apiClient.refreshInstallation(
          session: existingSession
        )
        try await saveSession(refreshedSession)
        Self.logger.info(
          "bootstrap refreshed session installationID=\(refreshedSession.installationId, privacy: .public)"
        )
        return SessionResolution(
          session: refreshedSession,
          didResetLocalProfiles: false
        )
      } catch {
        Self.logger.error(
          "bootstrap failed to refresh stored session error=\(String(describing: error), privacy: .public)"
        )
        guard shouldRecoverSession(from: error) else {
          throw error
        }

        Self.logger.info("bootstrap recovering by clearing local profiles and re-registering")
        return try await registerFreshSession(clearingLocalProfiles: true)
      }
    }

    Self.logger.info("bootstrap found no stored session; registering installation")
    let newSession = try await apiClient.registerInstallation()
    try await saveSession(newSession)
    Self.logger.info(
      "bootstrap registered installation installationID=\(newSession.installationId, privacy: .public)"
    )
    return SessionResolution(
      session: newSession,
      didResetLocalProfiles: false
    )
  }

  private func registerFreshSession(
    clearingLocalProfiles: Bool
  ) async throws -> SessionResolution {
    Self.logger.info(
      "registerFreshSession started clearingLocalProfiles=\(clearingLocalProfiles)"
    )
    try await clearSession()

    if clearingLocalProfiles {
      try await clearProfiles()
      Self.logger.info("registerFreshSession cleared local profiles")
    }

    let newSession = try await apiClient.registerInstallation()
    try await saveSession(newSession)
    Self.logger.info(
      "registerFreshSession registered installationID=\(newSession.installationId, privacy: .public)"
    )

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

  private func loadSession() async throws -> InstallationSession? {
    let sessionStore = self.sessionStore

    return try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          continuation.resume(returning: try sessionStore.loadSession())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func saveSession(_ session: InstallationSession) async throws {
    let sessionStore = self.sessionStore

    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try sessionStore.saveSession(session)
          continuation.resume(returning: ())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func clearSession() async throws {
    let sessionStore = self.sessionStore

    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .utility).async {
        do {
          try sessionStore.clear()
          continuation.resume(returning: ())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func fetchProfiles() async throws -> [ChildProfile] {
    let profileRepository = self.profileRepository

    return try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          continuation.resume(returning: try profileRepository.fetchProfiles())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func saveProfile(_ profile: ChildProfile) async throws {
    let profileRepository = self.profileRepository

    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try profileRepository.saveProfile(profile)
          continuation.resume(returning: ())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }

  private func clearProfiles() async throws {
    let profileRepository = self.profileRepository

    try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.global(qos: .utility).async {
        do {
          try profileRepository.clear()
          continuation.resume(returning: ())
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }
}

private struct SessionResolution {
  let session: InstallationSession
  let didResetLocalProfiles: Bool
}
