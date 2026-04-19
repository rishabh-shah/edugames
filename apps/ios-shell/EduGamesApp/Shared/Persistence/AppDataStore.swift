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
