import SwiftUI

struct CatalogView: View {
  @Bindable var model: AppModel

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 8) {
            Text("Catalog")
              .font(.largeTitle.bold())

            if let selectedProfile = model.selectedProfile {
              Text("Browsing as \(selectedProfile.displayTitle)")
                .foregroundStyle(.secondary)
            }
          }

          Spacer()

          Button("Switch Profile") {
            model.backToProfiles()
          }
          .buttonStyle(.borderedProminent)
        }

        if let errorMessage = model.bootstrapErrorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        }

        if let catalog = model.catalog {
          LazyVStack(alignment: .leading, spacing: 22) {
            ForEach(catalog.sections) { section in
              VStack(alignment: .leading, spacing: 12) {
                Text(section.title)
                  .font(.title2.bold())

                ForEach(section.items) { item in
                  Button {
                    Task {
                      await model.selectGame(item)
                    }
                  } label: {
                    VStack(alignment: .leading, spacing: 8) {
                      Text(item.title)
                        .font(.headline)
                        .foregroundStyle(.primary)
                      Text(item.summary)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                      Text("Age band: \(item.ageBand)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 18))
                  }
                  .buttonStyle(.plain)
                  .accessibilityIdentifier("catalog-card-\(item.gameId)")
                }
              }
            }
          }
        } else {
          ProgressView("Loading catalog…")
            .controlSize(.large)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      .padding(32)
    }
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.97, green: 0.94, blue: 0.87),
          Color(red: 0.91, green: 0.97, blue: 0.95)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .navigationTitle("Catalog")
    .navigationBarTitleDisplayMode(.inline)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("catalog-view")
  }
}
