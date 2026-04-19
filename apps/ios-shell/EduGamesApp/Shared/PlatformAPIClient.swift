import Foundation
import UIKit

@MainActor
protocol PlatformAPIClient {
  func registerInstallation() async throws -> InstallationSession
  func createProfile(
    session: InstallationSession,
    ageBand: String,
    avatarId: String
  ) async throws -> ChildProfile
  func fetchCatalog(
    session: InstallationSession,
    profileId: String
  ) async throws -> CatalogResponse
  func fetchGameDetail(
    session: InstallationSession,
    profileId: String,
    slug: String
  ) async throws -> GameDetailResponse
  func createLaunchSession(
    session: InstallationSession,
    profileId: String,
    gameId: String
  ) async throws -> LaunchSessionResponse
}

struct InstallationRegistrationContext: Equatable, Sendable {
  let appVersion: String
  let iosVersion: String
  let deviceClass: String
  let locale: String
  let supportsAppAttest: Bool
}

@MainActor
final class FixturePlatformAPIClient: PlatformAPIClient {
  private var nextIndex = 1

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
    defer { nextIndex += 1 }

    return ChildProfile(
      id: String(format: "prof_fixture_%02d", nextIndex),
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
    LaunchSessionResponse.fixture
  }
}

@MainActor
final class LivePlatformAPIClient: PlatformAPIClient {
  private let urlSession: URLSession
  private let baseURL: URL
  private let registrationContextProvider: @Sendable () async -> InstallationRegistrationContext

  init(
    baseURL: URL,
    urlSession: URLSession = .shared,
    registrationContextProvider: (@Sendable () async -> InstallationRegistrationContext)? = nil
  ) {
    self.baseURL = baseURL
    self.urlSession = urlSession
    self.registrationContextProvider = registrationContextProvider ?? {
      await MainActor.run {
        Self.liveRegistrationContext()
      }
    }
  }

  func registerInstallation() async throws -> InstallationSession {
    let registrationContext = await registrationContextProvider()
    let requestBody = RegisterInstallationRequest(
      appVersion: registrationContext.appVersion,
      iosVersion: registrationContext.iosVersion,
      deviceClass: registrationContext.deviceClass,
      locale: registrationContext.locale,
      supportsAppAttest: registrationContext.supportsAppAttest
    )

    let response: RegisterInstallationResponse = try await send(
      path: "/v1/installations/register",
      method: "POST",
      requestBody: requestBody,
      accessToken: nil
    )

    return InstallationSession(
      installationId: response.installationId,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken
    )
  }

  func createProfile(
    session: InstallationSession,
    ageBand: String,
    avatarId: String
  ) async throws -> ChildProfile {
    let response: CreateProfileResponse = try await send(
      path: "/v1/profiles",
      method: "POST",
      requestBody: CreateProfileRequest(
        ageBand: ageBand,
        avatarId: avatarId
      ),
      accessToken: session.accessToken
    )

    return response.profile
  }

  func fetchCatalog(
    session: InstallationSession,
    profileId: String
  ) async throws -> CatalogResponse {
    try await get(
      path: "/v1/catalog",
      queryItems: [
        URLQueryItem(name: "profileId", value: profileId)
      ],
      accessToken: session.accessToken
    )
  }

  func fetchGameDetail(
    session: InstallationSession,
    profileId: String,
    slug: String
  ) async throws -> GameDetailResponse {
    try await get(
      path: "/v1/games/\(slug)",
      queryItems: [
        URLQueryItem(name: "profileId", value: profileId)
      ],
      accessToken: session.accessToken
    )
  }

  func createLaunchSession(
    session: InstallationSession,
    profileId: String,
    gameId: String
  ) async throws -> LaunchSessionResponse {
    try await send(
      path: "/v1/launch-sessions",
      method: "POST",
      requestBody: CreateLaunchSessionRequest(
        profileId: profileId,
        gameId: gameId
      ),
      accessToken: session.accessToken
    )
  }

  private func send<RequestBody: Encodable, ResponseBody: Decodable>(
    path: String,
    method: String,
    requestBody: RequestBody,
    accessToken: String?
  ) async throws -> ResponseBody {
    var request = URLRequest(url: baseURL.appending(path: path))
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let accessToken {
      request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
    }

    request.httpBody = try JSONEncoder().encode(requestBody)

    let (data, response) = try await urlSession.data(for: request)
    try validate(response: response, data: data)
    return try JSONDecoder().decode(ResponseBody.self, from: data)
  }

  private func get<ResponseBody: Decodable>(
    path: String,
    queryItems: [URLQueryItem],
    accessToken: String
  ) async throws -> ResponseBody {
    var components = URLComponents(
      url: baseURL.appending(path: path),
      resolvingAgainstBaseURL: false
    )
    components?.queryItems = queryItems

    guard let url = components?.url else {
      throw LivePlatformAPIClientError.invalidURL
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

    let (data, response) = try await urlSession.data(for: request)
    try validate(response: response, data: data)
    return try JSONDecoder().decode(ResponseBody.self, from: data)
  }

  @MainActor
  private static func liveRegistrationContext() -> InstallationRegistrationContext {
    InstallationRegistrationContext(
      appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.1.0",
      iosVersion: UIDevice.current.systemVersion,
      deviceClass: UIDevice.current.model,
      locale: Locale.current.identifier,
      supportsAppAttest: false
    )
  }

  private func validate(response: URLResponse, data: Data) throws {
    guard let httpResponse = response as? HTTPURLResponse else {
      throw LivePlatformAPIClientError.invalidResponse
    }

    guard (200...299).contains(httpResponse.statusCode) else {
      let message = String(data: data, encoding: .utf8) ?? "Unknown error"
      throw LivePlatformAPIClientError.httpStatus(httpResponse.statusCode, message)
    }
  }
}

enum LivePlatformAPIClientError: Error {
  case invalidURL
  case invalidResponse
  case httpStatus(Int, String)
}

private struct RegisterInstallationRequest: Encodable {
  let appVersion: String
  let iosVersion: String
  let deviceClass: String
  let locale: String
  let supportsAppAttest: Bool
}

private struct RegisterInstallationResponse: Decodable {
  let installationId: String
  let accessToken: String
  let refreshToken: String
}

private struct CreateProfileRequest: Encodable {
  let ageBand: String
  let avatarId: String
}

private struct CreateProfileResponse: Decodable {
  let profile: ChildProfile
}

private struct CreateLaunchSessionRequest: Encodable {
  let profileId: String
  let gameId: String
}

@MainActor
final class GameRuntimeLaunchService {
  private let apiClient: PlatformAPIClient
  private let bundleInstallService: BundleInstallService

  init(
    apiClient: PlatformAPIClient,
    bundleInstallService: BundleInstallService
  ) {
    self.apiClient = apiClient
    self.bundleInstallService = bundleInstallService
  }

  func prepareLaunch(
    session: InstallationSession,
    request: GameLaunchRequest
  ) async throws -> GameLaunchDetails {
    let detail = try await apiClient.fetchGameDetail(
      session: session,
      profileId: request.profileId,
      slug: request.slug
    )
    let launchSession = try await apiClient.createLaunchSession(
      session: session,
      profileId: request.profileId,
      gameId: request.gameId
    )
    let installedBundle = try bundleInstallService.installBundle(from: launchSession)

    return GameLaunchDetails(
      request: request,
      detail: detail,
      launchSession: launchSession,
      installedBundle: installedBundle
    )
  }
}
