import Foundation
import XCTest

@testable import EduGamesShellCore

final class PlatformAPIClientTests: XCTestCase {
  override func tearDown() {
    StubURLProtocol.clearHandler()
    super.tearDown()
  }

  func testRegisterInstallationSendsExpectedRequest() async throws {
    let recorder = HTTPRequestRecorder()
    let responseBody = """
    {
      "installationId": "inst_live_01",
      "accessToken": "access_live_token_abcdefghijklmnopqrstuvwxyz1234",
      "refreshToken": "refresh_live_token_abcdefghijklmnopqrstuvwxyz5678"
    }
    """.data(using: .utf8)!

    let client = await makeClient(
      recorder: recorder,
      response: .json(statusCode: 201, body: responseBody),
      registrationContext: InstallationRegistrationContext(
        appVersion: "0.1.0",
        iosVersion: "26.4.1",
        deviceClass: "iPad",
        locale: "en_US",
        supportsAppAttest: false
      )
    )

    let session = try await client.registerInstallation()
    let request = try XCTUnwrap(recorder.lastRequest)
    let body = try requestBody(from: request)
    let payload = try JSONDecoder().decode(RegisterInstallationPayload.self, from: body)

    XCTAssertEqual(session.installationId, "inst_live_01")
    XCTAssertEqual(request.url?.path, "/v1/installations/register")
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
    XCTAssertEqual(payload.appVersion, "0.1.0")
    XCTAssertEqual(payload.iosVersion, "26.4.1")
    XCTAssertEqual(payload.deviceClass, "iPad")
    XCTAssertEqual(payload.locale, "en_US")
    XCTAssertFalse(payload.supportsAppAttest)
  }

  func testCreateProfileUsesInstallationToken() async throws {
    let recorder = HTTPRequestRecorder()
    let responseBody = """
    {
      "profile": {
        "id": "prof_live_01",
        "ageBand": "PRESCHOOL_3_5",
        "avatarId": "balloon-bear",
        "createdAt": "2026-04-19T19:10:00Z",
        "lastActiveAt": "2026-04-19T19:10:00Z"
      }
    }
    """.data(using: .utf8)!

    let client = await makeClient(
      recorder: recorder,
      response: .json(statusCode: 201, body: responseBody)
    )
    let session = InstallationSession(
      installationId: "inst_live_01",
      accessToken: "access_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_token_abcdefghijklmnopqrstuvwxyz5678"
    )

    let profile = try await client.createProfile(
      session: session,
      ageBand: "PRESCHOOL_3_5",
      avatarId: "balloon-bear"
    )

    let request = try XCTUnwrap(recorder.lastRequest)
    let body = try requestBody(from: request)
    let payload = try JSONDecoder().decode(CreateProfilePayload.self, from: body)

    XCTAssertEqual(profile.id, "prof_live_01")
    XCTAssertEqual(request.url?.path, "/v1/profiles")
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(session.accessToken)")
    XCTAssertEqual(payload.ageBand, "PRESCHOOL_3_5")
    XCTAssertEqual(payload.avatarId, "balloon-bear")
  }

  func testFetchCatalogUsesProfileQuery() async throws {
    let recorder = HTTPRequestRecorder()
    let responseBody = try JSONEncoder().encode(CatalogResponse.sample)
    let client = await makeClient(
      recorder: recorder,
      response: .json(statusCode: 200, body: responseBody)
    )
    let session = InstallationSession(
      installationId: "inst_live_01",
      accessToken: "access_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_token_abcdefghijklmnopqrstuvwxyz5678"
    )

    let catalog = try await client.fetchCatalog(
      session: session,
      profileId: "prof_live_01"
    )

    let request = try XCTUnwrap(recorder.lastRequest)
    let queryItems = URLComponents(
      url: try XCTUnwrap(request.url),
      resolvingAgainstBaseURL: false
    )?.queryItems

    XCTAssertEqual(catalog.sections.first?.items.first?.gameId, "shape-match")
    XCTAssertEqual(request.httpMethod, "GET")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(session.accessToken)")
    XCTAssertEqual(queryItems?.first(where: { $0.name == "profileId" })?.value, "prof_live_01")
  }

  func testFetchGameDetailUsesSlugPathAndProfileQuery() async throws {
    let recorder = HTTPRequestRecorder()
    let responseBody = """
    {
      "gameId": "shape-match",
      "slug": "shape-match",
      "title": "Shape Match",
      "summary": "Match circles, squares, and triangles.",
      "description": "A simple recognition game for preschoolers.",
      "version": "1.0.0",
      "ageBand": "PRESCHOOL_3_5",
      "screenshots": [
        "https://cdn.example/games/shape-match/1.0.0/assets/ss-1.png"
      ],
      "categories": ["shapes", "visual-recognition"],
      "offlineReady": true,
      "contentFlags": {
        "externalLinks": false,
        "ugc": false,
        "chat": false,
        "ads": false,
        "purchases": false
      }
    }
    """.data(using: .utf8)!

    let client = await makeClient(
      recorder: recorder,
      response: .json(statusCode: 200, body: responseBody)
    )
    let session = InstallationSession(
      installationId: "inst_live_01",
      accessToken: "access_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_token_abcdefghijklmnopqrstuvwxyz5678"
    )

    let detail = try await client.fetchGameDetail(
      session: session,
      profileId: "prof_live_01",
      slug: "shape-match"
    )

    let request = try XCTUnwrap(recorder.lastRequest)
    let queryItems = URLComponents(
      url: try XCTUnwrap(request.url),
      resolvingAgainstBaseURL: false
    )?.queryItems

    XCTAssertEqual(detail.gameId, "shape-match")
    XCTAssertEqual(detail.slug, "shape-match")
    XCTAssertEqual(request.url?.path, "/v1/games/shape-match")
    XCTAssertEqual(request.httpMethod, "GET")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(session.accessToken)")
    XCTAssertEqual(queryItems?.first(where: { $0.name == "profileId" })?.value, "prof_live_01")
  }

  func testCreateLaunchSessionUsesInstallationTokenAndRequestBody() async throws {
    let recorder = HTTPRequestRecorder()
    let responseBody = """
    {
      "launchSessionId": "ls_123abc",
      "gameId": "shape-match",
      "version": "1.0.0",
      "bundle": {
        "bundleUrl": "https://cdn.example/games/shape-match/1.0.0/bundle.zip",
        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "compressedSizeBytes": 4812031
      },
      "manifest": {
        "entrypoint": "index.html",
        "minAgeBand": "PRESCHOOL_3_5",
        "maxAgeBand": "PRESCHOOL_3_5",
        "allowedEvents": ["milestone:first-match", "milestone:round-complete"]
      },
      "cachePolicy": {
        "revalidateAfterSeconds": 86400
      }
    }
    """.data(using: .utf8)!

    let client = await makeClient(
      recorder: recorder,
      response: .json(statusCode: 200, body: responseBody)
    )
    let session = InstallationSession(
      installationId: "inst_live_01",
      accessToken: "access_token_abcdefghijklmnopqrstuvwxyz1234",
      refreshToken: "refresh_token_abcdefghijklmnopqrstuvwxyz5678"
    )

    let launch = try await client.createLaunchSession(
      session: session,
      profileId: "prof_live_01",
      gameId: "shape-match"
    )

    let request = try XCTUnwrap(recorder.lastRequest)
    let body = try requestBody(from: request)
    let payload = try JSONDecoder().decode(CreateLaunchSessionPayload.self, from: body)

    XCTAssertEqual(launch.launchSessionId, "ls_123abc")
    XCTAssertEqual(launch.bundle.sha256, String(repeating: "a", count: 64))
    XCTAssertEqual(request.url?.path, "/v1/launch-sessions")
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer \(session.accessToken)")
    XCTAssertEqual(payload.profileId, "prof_live_01")
    XCTAssertEqual(payload.gameId, "shape-match")
  }

  private func makeClient(
    recorder: HTTPRequestRecorder,
    response: StubbedResponse,
    registrationContext: InstallationRegistrationContext = InstallationRegistrationContext(
      appVersion: "0.1.0",
      iosVersion: "26.4.1",
      deviceClass: "iPad",
      locale: "en_US",
      supportsAppAttest: false
    )
  ) async -> LivePlatformAPIClient {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubURLProtocol.self]
    let session = URLSession(configuration: configuration)

    StubURLProtocol.setHandler { request in
      recorder.record(request)
      return response
    }

    return await MainActor.run {
      LivePlatformAPIClient(
        baseURL: URL(string: "https://api.edugames.test")!,
        urlSession: session,
        registrationContextProvider: { registrationContext }
      )
    }
  }

  private func requestBody(from request: URLRequest) throws -> Data {
    if let body = request.httpBody {
      return body
    }

    guard let stream = request.httpBodyStream else {
      throw URLError(.zeroByteResource)
    }

    stream.open()
    defer { stream.close() }

    var data = Data()
    var buffer = [UInt8](repeating: 0, count: 1024)

    while stream.hasBytesAvailable {
      let bytesRead = stream.read(&buffer, maxLength: buffer.count)

      if bytesRead < 0 {
        throw stream.streamError ?? URLError(.cannotDecodeRawData)
      }

      if bytesRead == 0 {
        break
      }

      data.append(buffer, count: bytesRead)
    }

    return data
  }
}

final class HTTPRequestRecorder: @unchecked Sendable {
  private let lock = NSLock()
  private var storedRequest: URLRequest?

  var lastRequest: URLRequest? {
    lock.lock()
    defer { lock.unlock() }
    return storedRequest
  }

  func record(_ request: URLRequest) {
    lock.lock()
    storedRequest = request
    lock.unlock()
  }
}

struct StubbedResponse: Sendable {
  let statusCode: Int
  let headers: [String: String]
  let body: Data

  static func json(statusCode: Int, body: Data) -> StubbedResponse {
    StubbedResponse(
      statusCode: statusCode,
      headers: ["Content-Type": "application/json"],
      body: body
    )
  }
}

final class StubURLProtocol: URLProtocol {
  private static let lock = NSLock()
  private nonisolated(unsafe) static var handler: (@Sendable (URLRequest) throws -> StubbedResponse)?

  override class func canInit(with request: URLRequest) -> Bool {
    true
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    guard let handler = Self.currentHandler() else {
      client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
      return
    }

    do {
      let stub = try handler(request)
      guard let url = request.url else {
        client?.urlProtocol(self, didFailWithError: URLError(.badURL))
        return
      }

      let response = HTTPURLResponse(
        url: url,
        statusCode: stub.statusCode,
        httpVersion: nil,
        headerFields: stub.headers
      )!
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: stub.body)
      client?.urlProtocolDidFinishLoading(self)
    } catch {
      client?.urlProtocol(self, didFailWithError: error)
    }
  }

  override func stopLoading() {}

  static func setHandler(_ handler: @escaping @Sendable (URLRequest) throws -> StubbedResponse) {
    lock.lock()
    Self.handler = handler
    lock.unlock()
  }

  static func clearHandler() {
    lock.lock()
    handler = nil
    lock.unlock()
  }

  private static func currentHandler() -> ((URLRequest) throws -> StubbedResponse)? {
    lock.lock()
    defer { lock.unlock() }
    return handler
  }
}

private struct RegisterInstallationPayload: Decodable {
  let appVersion: String
  let iosVersion: String
  let deviceClass: String
  let locale: String
  let supportsAppAttest: Bool
}

private struct CreateProfilePayload: Decodable {
  let ageBand: String
  let avatarId: String
}

private struct CreateLaunchSessionPayload: Decodable {
  let profileId: String
  let gameId: String
}
