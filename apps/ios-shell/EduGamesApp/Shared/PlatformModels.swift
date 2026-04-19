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
