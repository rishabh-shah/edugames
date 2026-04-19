import Foundation
import Observation

enum ShellRoute: Equatable {
  case bootstrap
  case profiles
  case catalog
}

@MainActor
@Observable
final class AppModel {
  var route: ShellRoute = .bootstrap
  var isBootstrapping = false
  var bootstrapErrorMessage: String?
  var profiles: [ChildProfile] = []
  var selectedProfile: ChildProfile?
  var catalog: CatalogResponse?
  var activeCreationOptionID: String?
  private(set) var hasStartedBootstrap = false

  private let bootstrapService: BootstrapService

  init(bootstrapService: BootstrapService) {
    self.bootstrapService = bootstrapService
  }

  static func live(processInfo: ProcessInfo = .processInfo) -> AppModel {
    let resetLocalData = processInfo.environment["EDUGAMES_RESET_LOCAL_DATA"] == "1"
    let useFixtures = processInfo.environment["EDUGAMES_USE_FIXTURES"] == "1"

    let fileSessionStore = FileSessionStore(filename: "installation-session.json")
    let sessionStore: SessionStore

    if resetLocalData {
      let keychain = KeychainSessionStore(fallbackStore: fileSessionStore)
      try? keychain.clear()
      try? fileSessionStore.clear()
      sessionStore = keychain
    } else {
      sessionStore = KeychainSessionStore(fallbackStore: fileSessionStore)
    }

    let database: AppDatabase

    do {
      database = try AppDatabase.makeLive(resetLocalData: resetLocalData)
    } catch {
      preconditionFailure("Unable to initialize the local iOS shell database: \(error)")
    }

    let profileRepository = SQLiteProfileRepository(database: database)
    let apiClient: PlatformAPIClient

    if useFixtures {
      apiClient = FixturePlatformAPIClient()
    } else {
      let baseURLString = processInfo.environment["EDUGAMES_API_BASE_URL"] ?? "http://127.0.0.1:3000"

      guard let baseURL = URL(string: baseURLString) else {
        preconditionFailure("Invalid EDUGAMES_API_BASE_URL: \(baseURLString)")
      }

      apiClient = LivePlatformAPIClient(baseURL: baseURL)
    }

    return AppModel(
      bootstrapService: BootstrapService(
        apiClient: apiClient,
        sessionStore: sessionStore,
        profileRepository: profileRepository
      )
    )
  }

  func bootstrapIfNeeded() async {
    guard !hasStartedBootstrap else {
      return
    }

    hasStartedBootstrap = true
    await bootstrap()
  }

  func bootstrap() async {
    route = .bootstrap
    bootstrapErrorMessage = nil
    isBootstrapping = true

    defer {
      isBootstrapping = false
    }

    do {
      let snapshot = try await bootstrapService.bootstrap()
      profiles = snapshot.profiles
      route = .profiles
    } catch {
      bootstrapErrorMessage = "Unable to connect to the EduGames shell services. Check the local API and try again."
    }
  }

  func createProfile(_ option: ProfileCreationOption) async {
    activeCreationOptionID = option.id

    defer {
      activeCreationOptionID = nil
    }

    do {
      profiles = try await bootstrapService.createProfile(option)
      bootstrapErrorMessage = nil
      route = .profiles
    } catch {
      bootstrapErrorMessage = "Could not create a profile right now."
    }
  }

  func selectProfile(_ profile: ChildProfile) async {
    selectedProfile = profile
    bootstrapErrorMessage = nil

    do {
      catalog = try await bootstrapService.fetchCatalog(for: profile)
      route = .catalog
    } catch {
      bootstrapErrorMessage = "Could not load the catalog right now."
    }
  }

  func backToProfiles() {
    route = .profiles
    catalog = nil
    selectedProfile = nil
    bootstrapErrorMessage = nil
  }
}
