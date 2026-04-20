import Foundation
import UIKit

@MainActor
protocol PlatformAPIClient {
  func registerInstallation() async throws -> InstallationSession
  func refreshInstallation(
    session: InstallationSession
  ) async throws -> InstallationSession
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
  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse
  func ingestTelemetryBatch(
    session: InstallationSession,
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse
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

  func refreshInstallation(
    session: InstallationSession
  ) async throws -> InstallationSession {
    session
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

  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    ReportSubmissionResponse(
      reportId: "rep_fixture_123abc",
      status: "open"
    )
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

  func refreshInstallation(
    session: InstallationSession
  ) async throws -> InstallationSession {
    let response: RefreshInstallationResponse = try await send(
      path: "/v1/installations/refresh",
      method: "POST",
      requestBody: RefreshInstallationRequest(refreshToken: session.refreshToken),
      accessToken: nil
    )

    return InstallationSession(
      installationId: session.installationId,
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

  func submitReport(
    session: InstallationSession,
    profileId: String,
    gameId: String,
    reason: ReportReason,
    details: String?
  ) async throws -> ReportSubmissionResponse {
    try await send(
      path: "/v1/reports",
      method: "POST",
      requestBody: CreateReportRequest(
        profileId: profileId,
        gameId: gameId,
        reason: reason.rawValue,
        details: details
      ),
      accessToken: session.accessToken
    )
  }

  func ingestTelemetryBatch(
    session: InstallationSession,
    profileId: String,
    launchSessionId: String,
    events: [TelemetryEventPayload]
  ) async throws -> TelemetryBatchResponse {
    try await send(
      path: "/v1/telemetry/batches",
      method: "POST",
      requestBody: CreateTelemetryBatchRequest(
        profileId: profileId,
        launchSessionId: launchSessionId,
        schemaVersion: 1,
        events: events
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

private struct RefreshInstallationRequest: Encodable {
  let refreshToken: String
}

private struct RefreshInstallationResponse: Decodable {
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

private struct CreateReportRequest: Encodable {
  let profileId: String
  let gameId: String
  let reason: String
  let details: String?

  private enum CodingKeys: String, CodingKey {
    case profileId
    case gameId
    case reason
    case details
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(profileId, forKey: .profileId)
    try container.encode(gameId, forKey: .gameId)
    try container.encode(reason, forKey: .reason)

    if let details {
      try container.encode(details, forKey: .details)
    } else {
      try container.encodeNil(forKey: .details)
    }
  }
}

private struct CreateTelemetryBatchRequest: Encodable {
  let profileId: String
  let launchSessionId: String
  let schemaVersion: Int
  let events: [TelemetryEventPayload]
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
