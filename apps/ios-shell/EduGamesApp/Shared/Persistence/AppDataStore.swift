import CryptoKit
import Foundation
import Security
import SQLite3

#if targetEnvironment(simulator)
private let defaultUsesSimulatorFallback = true
#else
private let defaultUsesSimulatorFallback = false
#endif

protocol SessionStore {
  func loadSession() throws -> InstallationSession?
  func saveSession(_ session: InstallationSession) throws
  func clear() throws
}

protocol ProfileRepository {
  func fetchProfiles() throws -> [ChildProfile]
  func saveProfile(_ profile: ChildProfile) throws
  func clear() throws
}

protocol BundleCacheRepository {
  func fetchRecord(gameId: String, version: String) throws -> BundleCacheRecord?
  func saveRecord(_ record: BundleCacheRecord) throws
}

protocol SaveStateRepository {
  func loadState(profileId: String, gameId: String, version: String) throws -> LocalSaveState?
  func saveState(_ state: LocalSaveState) throws
}

struct BundleCacheRecord: Equatable {
  let gameId: String
  let version: String
  let sourceURL: String
  let sha256: String
  let archivePath: String
  let installDirectoryPath: String
  let entrypointRelativePath: String
  let installedAt: String
  let revalidateAfterSeconds: Int
}

struct LocalSaveState: Equatable {
  let profileId: String
  let gameId: String
  let version: String
  let payloadJSON: String
  let updatedAt: String
}

final class InMemorySessionStore: SessionStore {
  var session: InstallationSession?

  func loadSession() throws -> InstallationSession? {
    session
  }

  func saveSession(_ session: InstallationSession) throws {
    self.session = session
  }

  func clear() throws {
    session = nil
  }
}

struct KeychainClient {
  let loadData: () throws -> Data?
  let saveData: (Data) throws -> Void
  let clearData: () throws -> Void

  static func live(service: String, account: String) -> KeychainClient {
    KeychainClient(
      loadData: {
        let query: [CFString: Any] = [
          kSecClass: kSecClassGenericPassword,
          kSecAttrService: service,
          kSecAttrAccount: account,
          kSecReturnData: true,
          kSecMatchLimit: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        switch status {
        case errSecSuccess:
          return item as? Data
        case errSecItemNotFound:
          return nil
        default:
          throw KeychainSessionStoreError.osStatus(status)
        }
      },
      saveData: { data in
        let query: [CFString: Any] = [
          kSecClass: kSecClassGenericPassword,
          kSecAttrService: service,
          kSecAttrAccount: account
        ]
        let attributes: [CFString: Any] = [
          kSecValueData: data
        ]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecSuccess {
          return
        }

        if updateStatus == errSecItemNotFound {
          var insertQuery = query
          insertQuery[kSecValueData] = data
          let insertStatus = SecItemAdd(insertQuery as CFDictionary, nil)

          guard insertStatus == errSecSuccess else {
            throw KeychainSessionStoreError.osStatus(insertStatus)
          }

          return
        }

        throw KeychainSessionStoreError.osStatus(updateStatus)
      },
      clearData: {
        let query: [CFString: Any] = [
          kSecClass: kSecClassGenericPassword,
          kSecAttrService: service,
          kSecAttrAccount: account
        ]

        let status = SecItemDelete(query as CFDictionary)

        guard status == errSecSuccess || status == errSecItemNotFound else {
          throw KeychainSessionStoreError.osStatus(status)
        }
      }
    )
  }
}

final class KeychainSessionStore: SessionStore {
  private static let service = "com.edugames.shell"
  private static let account = "installation-session"
  private let fallbackStore: SessionStore
  private let keychainClient: KeychainClient
  private let usesSimulatorFallback: Bool

  init(
    fallbackStore: SessionStore? = nil,
    keychainClient: KeychainClient? = nil,
    usesSimulatorFallback: Bool = defaultUsesSimulatorFallback
  ) {
    self.fallbackStore = fallbackStore ?? FileSessionStore(filename: "installation-session.json")
    self.keychainClient = keychainClient ?? KeychainClient.live(
      service: Self.service,
      account: Self.account
    )
    self.usesSimulatorFallback = usesSimulatorFallback
  }

  func loadSession() throws -> InstallationSession? {
    do {
      if let data = try keychainClient.loadData() {
        return try JSONDecoder().decode(InstallationSession.self, from: data)
      }

      guard usesSimulatorFallback else {
        return nil
      }

      return try fallbackStore.loadSession()
    } catch {
      guard shouldUseFallback(for: error) else {
        throw error
      }

      return try fallbackStore.loadSession()
    }
  }

  func saveSession(_ session: InstallationSession) throws {
    do {
      let data = try JSONEncoder().encode(session)
      try keychainClient.saveData(data)

      if usesSimulatorFallback {
        try? fallbackStore.clear()
      }
    } catch {
      guard shouldUseFallback(for: error) else {
        throw error
      }

      try fallbackStore.saveSession(session)
    }
  }

  func clear() throws {
    do {
      try keychainClient.clearData()

      if usesSimulatorFallback {
        try? fallbackStore.clear()
      }
    } catch {
      guard shouldUseFallback(for: error) else {
        throw error
      }

      try fallbackStore.clear()
    }
  }

  private func shouldUseFallback(for error: Error) -> Bool {
    guard usesSimulatorFallback else {
      return false
    }

    guard
      let keychainError = error as? KeychainSessionStoreError,
      case let .osStatus(status) = keychainError,
      status == errSecMissingEntitlement
    else {
      return false
    }

    return true
  }
}

enum KeychainSessionStoreError: Error {
  case osStatus(OSStatus)
}

final class FileSessionStore: SessionStore {
  private let fileURL: URL

  init(filename: String) {
    self.fileURL = Self.makeFileURL(filename: filename)
  }

  func loadSession() throws -> InstallationSession? {
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      return nil
    }

    let data = try Data(contentsOf: fileURL)
    return try JSONDecoder().decode(InstallationSession.self, from: data)
  }

  func saveSession(_ session: InstallationSession) throws {
    try FileManager.default.createDirectory(
      at: fileURL.deletingLastPathComponent(),
      withIntermediateDirectories: true
    )
    let data = try JSONEncoder().encode(session)
    try data.write(to: fileURL, options: .atomic)
  }

  func clear() throws {
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      return
    }

    try FileManager.default.removeItem(at: fileURL)
  }

  private static func makeFileURL(filename: String) -> URL {
    let baseURL = (try? FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )) ?? FileManager.default.temporaryDirectory

    return baseURL.appendingPathComponent(filename)
  }
}

final class AppDatabase {
  private let handle: OpaquePointer

  init(path: String) throws {
    try FileManager.default.createDirectory(
      at: URL(fileURLWithPath: (path as NSString).deletingLastPathComponent),
      withIntermediateDirectories: true
    )
    handle = try Self.openDatabase(path: path)
    try migrate()
  }

  init() throws {
    handle = try Self.openDatabase(path: ":memory:")
    try migrate()
  }

  deinit {
    sqlite3_close(handle)
  }

  static func makeLive(resetLocalData: Bool) throws -> AppDatabase {
    let url = try liveDatabaseURL()

    if resetLocalData, FileManager.default.fileExists(atPath: url.path) {
      try FileManager.default.removeItem(at: url)
    }

    return try AppDatabase(path: url.path)
  }

  private static func liveDatabaseURL() throws -> URL {
    let baseURL = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )

    return baseURL.appendingPathComponent("edugames-shell.sqlite")
  }

  func fetchProfiles() throws -> [ChildProfile] {
    let statement = try prepareStatement(
      sql: """
      SELECT id, ageBand, avatarId, createdAt, lastActiveAt
      FROM profiles
      ORDER BY createdAt ASC
      """
    )
    defer { sqlite3_finalize(statement) }

    var profiles: [ChildProfile] = []

    while sqlite3_step(statement) == SQLITE_ROW {
      profiles.append(
        ChildProfile(
          id: String(cString: sqlite3_column_text(statement, 0)),
          ageBand: String(cString: sqlite3_column_text(statement, 1)),
          avatarId: String(cString: sqlite3_column_text(statement, 2)),
          createdAt: String(cString: sqlite3_column_text(statement, 3)),
          lastActiveAt: String(cString: sqlite3_column_text(statement, 4))
        )
      )
    }

    let result = sqlite3_errcode(handle)

    guard result == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }

    return profiles
  }

  func saveProfile(_ profile: ChildProfile) throws {
    let statement = try prepareStatement(
      sql: """
      INSERT INTO profiles (id, ageBand, avatarId, createdAt, lastActiveAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ageBand = excluded.ageBand,
        avatarId = excluded.avatarId,
        createdAt = excluded.createdAt,
        lastActiveAt = excluded.lastActiveAt
      """
    )
    defer { sqlite3_finalize(statement) }

    try bind(profile.id, at: 1, in: statement)
    try bind(profile.ageBand, at: 2, in: statement)
    try bind(profile.avatarId, at: 3, in: statement)
    try bind(profile.createdAt, at: 4, in: statement)
    try bind(profile.lastActiveAt, at: 5, in: statement)

    guard sqlite3_step(statement) == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }
  }

  func fetchBundleCacheRecord(gameId: String, version: String) throws -> BundleCacheRecord? {
    let statement = try prepareStatement(
      sql: """
      SELECT gameId, version, sourceUrl, sha256, archivePath, installDirectoryPath,
             entrypointRelativePath, installedAt, revalidateAfterSeconds
      FROM bundle_cache
      WHERE gameId = ? AND version = ?
      LIMIT 1
      """
    )
    defer { sqlite3_finalize(statement) }

    try bind(gameId, at: 1, in: statement)
    try bind(version, at: 2, in: statement)

    let result = sqlite3_step(statement)

    guard result != SQLITE_ROW else {
      return BundleCacheRecord(
        gameId: String(cString: sqlite3_column_text(statement, 0)),
        version: String(cString: sqlite3_column_text(statement, 1)),
        sourceURL: String(cString: sqlite3_column_text(statement, 2)),
        sha256: String(cString: sqlite3_column_text(statement, 3)),
        archivePath: String(cString: sqlite3_column_text(statement, 4)),
        installDirectoryPath: String(cString: sqlite3_column_text(statement, 5)),
        entrypointRelativePath: String(cString: sqlite3_column_text(statement, 6)),
        installedAt: String(cString: sqlite3_column_text(statement, 7)),
        revalidateAfterSeconds: Int(sqlite3_column_int64(statement, 8))
      )
    }

    guard result == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }

    return nil
  }

  func saveBundleCacheRecord(_ record: BundleCacheRecord) throws {
    let statement = try prepareStatement(
      sql: """
      INSERT INTO bundle_cache (
        gameId, version, sourceUrl, sha256, archivePath, installDirectoryPath,
        entrypointRelativePath, installedAt, revalidateAfterSeconds
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(gameId, version) DO UPDATE SET
        sourceUrl = excluded.sourceUrl,
        sha256 = excluded.sha256,
        archivePath = excluded.archivePath,
        installDirectoryPath = excluded.installDirectoryPath,
        entrypointRelativePath = excluded.entrypointRelativePath,
        installedAt = excluded.installedAt,
        revalidateAfterSeconds = excluded.revalidateAfterSeconds
      """
    )
    defer { sqlite3_finalize(statement) }

    try bind(record.gameId, at: 1, in: statement)
    try bind(record.version, at: 2, in: statement)
    try bind(record.sourceURL, at: 3, in: statement)
    try bind(record.sha256, at: 4, in: statement)
    try bind(record.archivePath, at: 5, in: statement)
    try bind(record.installDirectoryPath, at: 6, in: statement)
    try bind(record.entrypointRelativePath, at: 7, in: statement)
    try bind(record.installedAt, at: 8, in: statement)
    try bind(Int64(record.revalidateAfterSeconds), at: 9, in: statement)

    guard sqlite3_step(statement) == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }
  }

  func loadSaveState(profileId: String, gameId: String, version: String) throws -> LocalSaveState? {
    let statement = try prepareStatement(
      sql: """
      SELECT profileId, gameId, version, payloadJson, updatedAt
      FROM save_states
      WHERE profileId = ? AND gameId = ? AND version = ?
      LIMIT 1
      """
    )
    defer { sqlite3_finalize(statement) }

    try bind(profileId, at: 1, in: statement)
    try bind(gameId, at: 2, in: statement)
    try bind(version, at: 3, in: statement)

    let result = sqlite3_step(statement)

    guard result != SQLITE_ROW else {
      return LocalSaveState(
        profileId: String(cString: sqlite3_column_text(statement, 0)),
        gameId: String(cString: sqlite3_column_text(statement, 1)),
        version: String(cString: sqlite3_column_text(statement, 2)),
        payloadJSON: String(cString: sqlite3_column_text(statement, 3)),
        updatedAt: String(cString: sqlite3_column_text(statement, 4))
      )
    }

    guard result == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }

    return nil
  }

  func saveSaveState(_ state: LocalSaveState) throws {
    let statement = try prepareStatement(
      sql: """
      INSERT INTO save_states (profileId, gameId, version, payloadJson, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(profileId, gameId, version) DO UPDATE SET
        payloadJson = excluded.payloadJson,
        updatedAt = excluded.updatedAt
      """
    )
    defer { sqlite3_finalize(statement) }

    try bind(state.profileId, at: 1, in: statement)
    try bind(state.gameId, at: 2, in: statement)
    try bind(state.version, at: 3, in: statement)
    try bind(state.payloadJSON, at: 4, in: statement)
    try bind(state.updatedAt, at: 5, in: statement)

    guard sqlite3_step(statement) == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }
  }

  func clearProfiles() throws {
    let statement = try prepareStatement(sql: "DELETE FROM profiles")
    defer { sqlite3_finalize(statement) }

    guard sqlite3_step(statement) == SQLITE_DONE else {
      throw SQLiteProfileRepositoryError.stepFailed(message: lastErrorMessage())
    }
  }

  private static func openDatabase(path: String) throws -> OpaquePointer {
    var database: OpaquePointer?
    let flags = SQLITE_OPEN_CREATE | SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX

    guard sqlite3_open_v2(path, &database, flags, nil) == SQLITE_OK, let database else {
      let message = database.flatMap { String(cString: sqlite3_errmsg($0)) } ?? "Unknown SQLite open failure"
      if let database {
        sqlite3_close(database)
      }
      throw SQLiteProfileRepositoryError.openFailed(message: message)
    }

    return database
  }

  private func migrate() throws {
    try execute(
      sql: """
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        ageBand TEXT NOT NULL,
        avatarId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastActiveAt TEXT NOT NULL
      )
      """
    )
    try execute(
      sql: """
      CREATE TABLE IF NOT EXISTS bundle_cache (
        gameId TEXT NOT NULL,
        version TEXT NOT NULL,
        sourceUrl TEXT NOT NULL,
        sha256 TEXT NOT NULL,
        archivePath TEXT NOT NULL,
        installDirectoryPath TEXT NOT NULL,
        entrypointRelativePath TEXT NOT NULL,
        installedAt TEXT NOT NULL,
        revalidateAfterSeconds INTEGER NOT NULL,
        PRIMARY KEY (gameId, version)
      )
      """
    )
    try execute(
      sql: """
      CREATE TABLE IF NOT EXISTS save_states (
        profileId TEXT NOT NULL,
        gameId TEXT NOT NULL,
        version TEXT NOT NULL,
        payloadJson TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (profileId, gameId, version)
      )
      """
    )
  }

  private func execute(sql: String) throws {
    var errorMessage: UnsafeMutablePointer<Int8>?

    guard sqlite3_exec(handle, sql, nil, nil, &errorMessage) == SQLITE_OK else {
      let message = errorMessage.map { String(cString: $0) } ?? lastErrorMessage()
      sqlite3_free(errorMessage)
      throw SQLiteProfileRepositoryError.executionFailed(message: message)
    }
  }

  private func prepareStatement(sql: String) throws -> OpaquePointer {
    var statement: OpaquePointer?

    guard sqlite3_prepare_v2(handle, sql, -1, &statement, nil) == SQLITE_OK, let statement else {
      throw SQLiteProfileRepositoryError.prepareFailed(message: lastErrorMessage())
    }

    return statement
  }

  private func bind(_ value: String, at index: Int32, in statement: OpaquePointer) throws {
    guard sqlite3_bind_text(statement, index, value, -1, Self.sqliteTransient) == SQLITE_OK else {
      throw SQLiteProfileRepositoryError.bindFailed(message: lastErrorMessage())
    }
  }

  private func bind(_ value: Int64, at index: Int32, in statement: OpaquePointer) throws {
    guard sqlite3_bind_int64(statement, index, value) == SQLITE_OK else {
      throw SQLiteProfileRepositoryError.bindFailed(message: lastErrorMessage())
    }
  }

  private func lastErrorMessage() -> String {
    String(cString: sqlite3_errmsg(handle))
  }

  private static let sqliteTransient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
}

enum SQLiteProfileRepositoryError: Error {
  case openFailed(message: String)
  case executionFailed(message: String)
  case prepareFailed(message: String)
  case bindFailed(message: String)
  case stepFailed(message: String)
}

final class SQLiteProfileRepository: ProfileRepository {
  private let database: AppDatabase

  init(database: AppDatabase) {
    self.database = database
  }

  func fetchProfiles() throws -> [ChildProfile] {
    try database.fetchProfiles()
  }

  func saveProfile(_ profile: ChildProfile) throws {
    try database.saveProfile(profile)
  }

  func clear() throws {
    try database.clearProfiles()
  }
}

final class InMemoryProfileRepository: ProfileRepository {
  private var profiles: [ChildProfile]

  init(profiles: [ChildProfile] = []) {
    self.profiles = profiles
  }

  func fetchProfiles() throws -> [ChildProfile] {
    profiles.sorted { $0.createdAt < $1.createdAt }
  }

  func saveProfile(_ profile: ChildProfile) throws {
    profiles.removeAll { $0.id == profile.id }
    profiles.append(profile)
  }

  func clear() throws {
    profiles.removeAll()
  }
}

final class SQLiteBundleCacheRepository: BundleCacheRepository {
  private let database: AppDatabase

  init(database: AppDatabase) {
    self.database = database
  }

  func fetchRecord(gameId: String, version: String) throws -> BundleCacheRecord? {
    try database.fetchBundleCacheRecord(gameId: gameId, version: version)
  }

  func saveRecord(_ record: BundleCacheRecord) throws {
    try database.saveBundleCacheRecord(record)
  }
}

final class SQLiteSaveStateRepository: SaveStateRepository {
  private let database: AppDatabase

  init(database: AppDatabase) {
    self.database = database
  }

  func loadState(profileId: String, gameId: String, version: String) throws -> LocalSaveState? {
    try database.loadSaveState(profileId: profileId, gameId: gameId, version: version)
  }

  func saveState(_ state: LocalSaveState) throws {
    try database.saveSaveState(state)
  }
}

enum BundleInstallError: Error {
  case fixtureResourceMissing(String)
  case checksumMismatch(expected: String, actual: String)
  case unsupportedSource(URL)
  case entrypointMissing(String)
}

struct BundleArchiveChecksumVerifier {
  func verifyArchive(at archiveURL: URL, expectedSHA256: String) throws {
    let actual = try checksum(for: archiveURL)

    guard actual.caseInsensitiveCompare(expectedSHA256) == .orderedSame else {
      throw BundleInstallError.checksumMismatch(expected: expectedSHA256, actual: actual)
    }
  }

  private func checksum(for archiveURL: URL) throws -> String {
    let data = try Data(contentsOf: archiveURL)
    return SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
  }
}

final class BundleInstallService {
  private let cacheRepository: BundleCacheRepository
  private let installRootURL: URL
  private let fileManager: FileManager
  private let checksumVerifier: BundleArchiveChecksumVerifier

  init(
    cacheRepository: BundleCacheRepository,
    installRootURL: URL? = nil,
    fileManager: FileManager = .default,
    checksumVerifier: BundleArchiveChecksumVerifier = BundleArchiveChecksumVerifier()
  ) {
    self.cacheRepository = cacheRepository
    self.installRootURL = installRootURL ?? Self.defaultInstallRootURL(fileManager: fileManager)
    self.fileManager = fileManager
    self.checksumVerifier = checksumVerifier
  }

  func installBundle(from launchSession: LaunchSessionResponse) throws -> InstalledGameBundle {
    guard launchSession.bundle.bundleURL.scheme == "fixture" else {
      throw BundleInstallError.unsupportedSource(launchSession.bundle.bundleURL)
    }

    let resourceStem = launchSession.bundle.bundleURL
      .deletingPathExtension()
      .lastPathComponent
    guard !resourceStem.isEmpty else {
      throw BundleInstallError.fixtureResourceMissing(launchSession.bundle.bundleURL.absoluteString)
    }

    guard
      let archiveSourceURL = FixtureBundleResourceLocator.resourceURL(
        named: resourceStem,
        withExtension: "zip"
      )
    else {
      throw BundleInstallError.fixtureResourceMissing("\(resourceStem).zip")
    }

    guard
      let expandedSourceURL = FixtureBundleResourceLocator.resourceURL(
        named: "\(resourceStem)-bundle",
        withExtension: nil
      )
    else {
      throw BundleInstallError.fixtureResourceMissing("\(resourceStem)-bundle")
    }

    try checksumVerifier.verifyArchive(
      at: archiveSourceURL,
      expectedSHA256: launchSession.bundle.sha256
    )

    let installDirectoryURL = installRootURL
      .appendingPathComponent(launchSession.gameId, isDirectory: true)
      .appendingPathComponent(launchSession.version, isDirectory: true)
    let archiveURL = installDirectoryURL.appendingPathComponent("\(resourceStem).zip")
    let bundleDirectoryURL = installDirectoryURL.appendingPathComponent("bundle", isDirectory: true)

    if fileManager.fileExists(atPath: installDirectoryURL.path) {
      try fileManager.removeItem(at: installDirectoryURL)
    }

    try fileManager.createDirectory(
      at: installDirectoryURL,
      withIntermediateDirectories: true
    )
    try fileManager.copyItem(at: archiveSourceURL, to: archiveURL)
    try fileManager.copyItem(at: expandedSourceURL, to: bundleDirectoryURL)

    let entrypointURL = bundleDirectoryURL.appendingPathComponent(
      launchSession.manifest.entrypoint
    )
    guard fileManager.fileExists(atPath: entrypointURL.path) else {
      throw BundleInstallError.entrypointMissing(entrypointURL.path)
    }

    let installedAt = ISO8601DateFormatter().string(from: Date())
    try cacheRepository.saveRecord(
      BundleCacheRecord(
        gameId: launchSession.gameId,
        version: launchSession.version,
        sourceURL: launchSession.bundle.bundleURL.absoluteString,
        sha256: launchSession.bundle.sha256,
        archivePath: archiveURL.path,
        installDirectoryPath: bundleDirectoryURL.path,
        entrypointRelativePath: launchSession.manifest.entrypoint,
        installedAt: installedAt,
        revalidateAfterSeconds: launchSession.cachePolicy.revalidateAfterSeconds
      )
    )

    return InstalledGameBundle(
      gameId: launchSession.gameId,
      version: launchSession.version,
      sourceURL: launchSession.bundle.bundleURL,
      archiveURL: archiveURL,
      installDirectoryURL: bundleDirectoryURL,
      entrypointURL: entrypointURL
    )
  }

  private static func defaultInstallRootURL(fileManager: FileManager) -> URL {
    (try? fileManager.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )) ?? fileManager.temporaryDirectory
  }
}
