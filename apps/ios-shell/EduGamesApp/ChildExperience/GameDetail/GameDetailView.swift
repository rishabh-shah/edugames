import SwiftUI

struct GameDetailView: View {
  @Bindable var model: AppModel

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 8) {
            Text(model.gameDetail?.title ?? model.selectedGame?.title ?? "Game")
              .font(.largeTitle.bold())

            if let summary = model.gameDetail?.summary {
              Text(summary)
                .font(.title3)
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          Button("Back to Catalog") {
            model.backToCatalog()
          }
          .buttonStyle(.bordered)
        }

        if let detail = model.gameDetail {
          VStack(alignment: .leading, spacing: 16) {
            Text(detail.description)
              .font(.body)

            HStack(spacing: 12) {
              Label(detail.ageBand.replacingOccurrences(of: "_", with: " "), systemImage: "person.3.fill")
                .font(.subheadline.weight(.semibold))
              Label(detail.offlineReady ? "Offline ready" : "Internet required", systemImage: "arrow.down.circle.fill")
                .font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(.secondary)

            if !detail.categories.isEmpty {
              ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                  ForEach(detail.categories, id: \.self) { category in
                    Text(category.capitalized)
                      .font(.caption.weight(.semibold))
                      .padding(.horizontal, 12)
                      .padding(.vertical, 8)
                      .background(Color.white.opacity(0.88), in: Capsule())
                  }
                }
              }
            }
          }
        } else {
          ProgressView("Loading game details…")
            .controlSize(.large)
        }

        if let errorMessage = model.bootstrapErrorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        }

        Button {
          Task {
            await model.launchSelectedGame()
          }
        } label: {
          Label("Play This Game", systemImage: "play.fill")
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(model.gameDetail == nil)
        .accessibilityIdentifier("play-game-\(model.selectedGame?.gameId ?? "selected")")
      }
      .padding(32)
    }
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.96, green: 0.93, blue: 0.86),
          Color(red: 0.90, green: 0.95, blue: 0.98)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .navigationTitle("Game Detail")
    .navigationBarTitleDisplayMode(.inline)
    .accessibilityIdentifier("game-detail-view")
  }
}
