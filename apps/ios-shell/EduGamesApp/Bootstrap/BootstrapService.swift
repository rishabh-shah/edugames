import Foundation

struct BootstrapSnapshot: Equatable {
  let session: InstallationSession
  let profiles: [ChildProfile]
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
    let session = try await loadOrRegisterSession()
    let profiles = try profileRepository.fetchProfiles()

    return BootstrapSnapshot(
      session: session,
      profiles: profiles
    )
  }

  func createProfile(_ option: ProfileCreationOption) async throws -> [ChildProfile] {
    let session = try requireSession()
    let profile = try await apiClient.createProfile(
      session: session,
      ageBand: option.ageBand,
      avatarId: option.avatarId
    )

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

  private func loadOrRegisterSession() async throws -> InstallationSession {
    if let existingSession = try sessionStore.loadSession() {
      return existingSession
    }

    let newSession = try await apiClient.registerInstallation()
    try sessionStore.saveSession(newSession)
    return newSession
  }
}
