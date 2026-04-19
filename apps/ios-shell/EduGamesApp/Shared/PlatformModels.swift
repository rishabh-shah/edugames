import CryptoKit
import Foundation

struct InstallationSession: Codable, Equatable {
  let installationId: String
  let accessToken: String
  let refreshToken: String
}

struct ChildProfile: Identifiable, Codable, Equatable {
  let id: String
  let ageBand: String
  let avatarId: String
  let createdAt: String
  let lastActiveAt: String

  var displayTitle: String {
    ageBand
      .lowercased()
      .replacingOccurrences(of: "_", with: " ")
      .capitalized
  }

  var displaySubtitle: String {
    "Avatar: \(avatarId)"
  }
}

struct CatalogResponse: Codable, Equatable {
  let generatedAt: String
  let sections: [CatalogSection]
}

struct CatalogSection: Codable, Equatable, Identifiable {
  let key: String
  let title: String
  let items: [CatalogGame]

  var id: String { key }
}

struct CatalogGame: Codable, Equatable, Identifiable {
  let gameId: String
  let slug: String
  let version: String
  let title: String
  let summary: String
  let ageBand: String
  let iconUrl: String
  let cached: Bool

  var id: String { gameId }
}

struct GameContentFlags: Codable, Equatable {
  let externalLinks: Bool
  let ugc: Bool
  let chat: Bool
  let ads: Bool
  let purchases: Bool
}

struct GameDetailResponse: Codable, Equatable {
  let gameId: String
  let slug: String
  let title: String
  let summary: String
  let description: String
  let version: String
  let ageBand: String
  let screenshots: [String]
  let categories: [String]
  let offlineReady: Bool
  let contentFlags: GameContentFlags
}

struct LaunchSessionRequest: Codable, Equatable {
  let profileId: String
  let gameId: String
}

struct LaunchBundle: Codable, Equatable {
  let bundleURL: URL
  let sha256: String
  let compressedSizeBytes: Int

  private enum CodingKeys: String, CodingKey {
    case bundleURL = "bundleUrl"
    case sha256
    case compressedSizeBytes
  }
}

struct LaunchManifest: Codable, Equatable {
  let entrypoint: String
  let minAgeBand: String
  let maxAgeBand: String
  let allowedEvents: [String]
}

struct LaunchCachePolicy: Codable, Equatable {
  let revalidateAfterSeconds: Int
}

struct LaunchSessionResponse: Codable, Equatable {
  let launchSessionId: String
  let gameId: String
  let version: String
  let bundle: LaunchBundle
  let manifest: LaunchManifest
  let cachePolicy: LaunchCachePolicy
}

enum ReportReason: String, CaseIterable, Codable, Equatable, Sendable {
  case bug
  case safety
  case content
  case other

  var displayTitle: String {
    rawValue.capitalized
  }
}

struct ReportSubmissionResponse: Codable, Equatable, Sendable {
  let reportId: String
  let status: String
}

struct TelemetryEventPayload: Codable, Equatable, Sendable {
  let ts: String
  let type: String
  let name: String?
  let value: Int?

  static func sessionStart(at timestamp: String) -> TelemetryEventPayload {
    TelemetryEventPayload(
      ts: timestamp,
      type: "session_start",
      name: nil,
      value: nil
    )
  }

  static func sessionEnd(at timestamp: String) -> TelemetryEventPayload {
    TelemetryEventPayload(
      ts: timestamp,
      type: "session_end",
      name: nil,
      value: nil
    )
  }

  static func milestone(
    named name: String,
    value: Int,
    at timestamp: String
  ) -> TelemetryEventPayload {
    TelemetryEventPayload(
      ts: timestamp,
      type: "milestone",
      name: name,
      value: value
    )
  }
}

struct TelemetryBatchResponse: Codable, Equatable, Sendable {
  let accepted: Int
}

struct InstalledGameBundle: Equatable {
  let gameId: String
  let version: String
  let sourceURL: URL
  let archiveURL: URL
  let installDirectoryURL: URL
  let entrypointURL: URL
}

struct GameLaunchRequest: Equatable {
  let profileId: String
  let gameId: String
  let slug: String

  init(profileId: String, gameId: String, slug: String) {
    self.profileId = profileId
    self.gameId = gameId
    self.slug = slug
  }

  init(profile: ChildProfile, game: CatalogGame) {
    self.init(
      profileId: profile.id,
      gameId: game.gameId,
      slug: game.slug
    )
  }
}

struct GameLaunchDetails: Equatable {
  let request: GameLaunchRequest
  let detail: GameDetailResponse
  let launchSession: LaunchSessionResponse
  let installedBundle: InstalledGameBundle
}

struct ProfileCreationOption: Identifiable, Equatable {
  let id: String
  let title: String
  let subtitle: String
  let ageBand: String
  let avatarId: String

  static let presets: [ProfileCreationOption] = [
    ProfileCreationOption(
      id: "preschool",
      title: "Add Preschool Explorer",
      subtitle: "Ages 3-5",
      ageBand: "PRESCHOOL_3_5",
      avatarId: "balloon-bear"
    ),
    ProfileCreationOption(
      id: "early-primary",
      title: "Add Early Reader",
      subtitle: "Ages 6-8",
      ageBand: "EARLY_PRIMARY_6_8",
      avatarId: "rocket-fox"
    )
  ]
}

extension CatalogResponse {
  static let sample = CatalogResponse(
    generatedAt: "2026-04-19T19:00:00Z",
    sections: [
      CatalogSection(
        key: "featured",
        title: "Featured",
        items: [
          CatalogGame(
            gameId: "shape-match",
            slug: "shape-match",
            version: "0.1.0",
            title: "Shape Match Garden",
            summary: "Match bright shapes into their cozy outlines in a calm garden scene.",
            ageBand: "PRESCHOOL_3_5",
            iconUrl: "https://cdn.example/games/shape-match/0.1.0/assets/icon.svg",
            cached: false
          )
        ]
      )
    ]
  )
}

extension GameDetailResponse {
  static let sample = GameDetailResponse(
    gameId: "shape-match",
    slug: "shape-match",
    title: "Shape Match",
    summary: "Match circles, squares, and triangles.",
    description: "A simple recognition game for preschoolers.",
    version: "1.0.0",
    ageBand: "PRESCHOOL_3_5",
    screenshots: [
      "https://cdn.example/games/shape-match/1.0.0/assets/ss-1.png"
    ],
    categories: ["shapes", "visual-recognition"],
    offlineReady: true,
    contentFlags: GameContentFlags(
      externalLinks: false,
      ugc: false,
      chat: false,
      ads: false,
      purchases: false
    )
  )
}

extension LaunchSessionResponse {
  static var fixture: LaunchSessionResponse {
    do {
      return try FixtureBundleMaterializer.makeLaunchSession()
    } catch {
      preconditionFailure("Unable to materialize the fixture launch session: \(error)")
    }
  }
}

enum FixtureBundleResourceLocator {
  static func resourceURL(named name: String, withExtension fileExtension: String?) -> URL? {
    for bundle in candidateBundles {
      if let url = bundle.url(
        forResource: name,
        withExtension: fileExtension,
        subdirectory: "Fixtures"
      ) {
        return url
      }

      if let fileExtension {
        let bundledURL = bundle.bundleURL
          .appendingPathComponent("Fixtures", isDirectory: true)
          .appendingPathComponent("\(name).\(fileExtension)")

        if FileManager.default.fileExists(atPath: bundledURL.path) {
          return bundledURL
        }
      } else {
        let bundledURL = bundle.bundleURL
          .appendingPathComponent("Fixtures", isDirectory: true)
          .appendingPathComponent(name, isDirectory: true)

        if FileManager.default.fileExists(atPath: bundledURL.path) {
          return bundledURL
        }
      }
    }

    return try? FixtureBundleMaterializer.resourceURL(named: name, withExtension: fileExtension)
  }

  private static var candidateBundles: [Bundle] {
    var bundles = [Bundle.main]
    bundles.append(contentsOf: Bundle.allBundles)
    bundles.append(contentsOf: Bundle.allFrameworks)

    var seenPaths = Set<String>()
    return bundles.filter { bundle in
      seenPaths.insert(bundle.bundlePath).inserted
    }
  }
}

private enum FixtureBundleMaterializer {
  private static let archiveStem = "shape-match-fixture"
  private static let expandedDirectoryName = "shape-match-fixture-bundle"
  private static let indexHTML = """
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Shape Match Fixture</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f7efe2;
          color: #25324a;
          display: grid;
          place-items: center;
          min-height: 100vh;
          margin: 0;
        }
        main {
          text-align: center;
          padding: 24px;
        }
      </style>
    </head>
    <body>
      <main>
        <h1>Shape Match Fixture</h1>
        <p>Offline fixture bundle for the EduGames iOS shell.</p>
      </main>
    </body>
  </html>
  """
  private static let manifestJSON = """
  {
    "gameId": "shape-match",
    "version": "1.0.0",
    "entrypoint": "index.html",
    "capabilities": ["saveState", "events", "audio"]
  }
  """

  static func resourceURL(named name: String, withExtension fileExtension: String?) throws -> URL {
    let resources = try ensureResources()

    switch (name, fileExtension) {
    case (archiveStem, "zip"):
      return resources.archiveURL
    case (expandedDirectoryName, nil):
      return resources.expandedDirectoryURL
    default:
      throw CocoaError(.fileNoSuchFile)
    }
  }

  static func makeLaunchSession() throws -> LaunchSessionResponse {
    let resources = try ensureResources()
    let archiveSize = (try resources.archiveURL.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0

    return LaunchSessionResponse(
      launchSessionId: "ls_fixture_shape_match",
      gameId: "shape-match",
      version: "1.0.0",
      bundle: LaunchBundle(
        bundleURL: URL(string: "fixture:///shape-match-fixture.zip")!,
        sha256: resources.sha256,
        compressedSizeBytes: archiveSize
      ),
      manifest: LaunchManifest(
        entrypoint: "index.html",
        minAgeBand: "PRESCHOOL_3_5",
        maxAgeBand: "PRESCHOOL_3_5",
        allowedEvents: ["milestone:first-match", "milestone:round-complete"]
      ),
      cachePolicy: LaunchCachePolicy(
        revalidateAfterSeconds: 86_400
      )
    )
  }

  private static func ensureResources() throws -> (
    archiveURL: URL,
    expandedDirectoryURL: URL,
    sha256: String
  ) {
    let baseURL = FileManager.default.temporaryDirectory
      .appendingPathComponent("edugames-fixtures", isDirectory: true)
    let archiveURL = baseURL.appendingPathComponent("\(archiveStem).zip")
    let expandedDirectoryURL = baseURL.appendingPathComponent(expandedDirectoryName, isDirectory: true)

    try FileManager.default.createDirectory(at: baseURL, withIntermediateDirectories: true)

    if let liveFixtureSourceURL = repoFixtureSourceURL() {
      if FileManager.default.fileExists(atPath: expandedDirectoryURL.path) {
        try? FileManager.default.removeItem(at: expandedDirectoryURL)
      }

      try FileManager.default.copyItem(at: liveFixtureSourceURL, to: expandedDirectoryURL)
    } else if !FileManager.default.fileExists(atPath: expandedDirectoryURL.path) {
      try FileManager.default.createDirectory(
        at: expandedDirectoryURL,
        withIntermediateDirectories: true
      )

      guard let indexData = indexHTML.data(using: .utf8),
            let manifestData = manifestJSON.data(using: .utf8)
      else {
        throw CocoaError(.coderInvalidValue)
      }

      try indexData.write(
        to: expandedDirectoryURL.appendingPathComponent("index.html"),
        options: .atomic
      )
      try manifestData.write(
        to: expandedDirectoryURL.appendingPathComponent("manifest.json"),
        options: .atomic
      )
    }

    try createArchive(from: expandedDirectoryURL, to: archiveURL)

    let archiveData = try Data(contentsOf: archiveURL)
    let checksum = SHA256.hash(data: archiveData).map { String(format: "%02x", $0) }.joined()

    return (archiveURL, expandedDirectoryURL, checksum)
  }

  private static func repoFixtureSourceURL() -> URL? {
    var currentURL = URL(fileURLWithPath: #filePath)

    for _ in 0..<5 {
      currentURL.deleteLastPathComponent()
    }

    let repoFixtureURL = currentURL
      .appendingPathComponent("games", isDirectory: true)
      .appendingPathComponent("shape-match", isDirectory: true)
      .appendingPathComponent("dist", isDirectory: true)

    guard FileManager.default.fileExists(atPath: repoFixtureURL.path) else {
      return nil
    }

    return repoFixtureURL
  }

  private static func createArchive(from sourceDirectoryURL: URL, to archiveURL: URL) throws {
    if FileManager.default.fileExists(atPath: archiveURL.path) {
      try FileManager.default.removeItem(at: archiveURL)
    }

    let fileURLs = try bundleFileURLs(in: sourceDirectoryURL)
    let manifestLines = try fileURLs.map { fileURL in
      let relativePath = expandedDirectoryName + "/" + fileURL.path.replacingOccurrences(
        of: sourceDirectoryURL.path + "/",
        with: ""
      )
      let fileData = try Data(contentsOf: fileURL)
      let checksum = SHA256.hash(data: fileData).map { String(format: "%02x", $0) }.joined()
      return "file=\(relativePath) sha256=\(checksum) bytes=\(fileData.count)"
    }

    let archiveContents = (["archive=\(archiveStem)"] + manifestLines).joined(separator: "\n")
    guard let archiveData = archiveContents.data(using: .utf8) else {
      throw CocoaError(.coderInvalidValue)
    }

    try archiveData.write(to: archiveURL, options: .atomic)
  }

  private static func bundleFileURLs(in sourceDirectoryURL: URL) throws -> [URL] {
    let fileManager = FileManager.default
    let enumerator = fileManager.enumerator(
      at: sourceDirectoryURL,
      includingPropertiesForKeys: [.isRegularFileKey],
      options: [.skipsHiddenFiles]
    )

    var fileURLs: [URL] = []

    while let fileURL = enumerator?.nextObject() as? URL {
      let values = try fileURL.resourceValues(forKeys: [.isRegularFileKey])

      if values.isRegularFile == true {
        fileURLs.append(fileURL)
      }
    }

    return fileURLs.sorted { $0.path < $1.path }
  }
}
