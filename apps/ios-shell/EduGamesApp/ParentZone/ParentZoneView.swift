import SwiftUI

struct ParentZoneView: View {
  @Bindable var model: AppModel

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 8) {
            Text("Parent Zone")
              .font(.largeTitle.bold())
            Text("Set each child profile’s daily play session limit locally on this iPad.")
              .foregroundStyle(.secondary)
          }

          Spacer()

          Button("Done") {
            model.closeParentZone()
          }
          .buttonStyle(.borderedProminent)
          .accessibilityIdentifier("close-parent-zone-button")
        }

        if model.profiles.isEmpty {
          Text("Create a child profile first to manage play time.")
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white.opacity(0.85), in: RoundedRectangle(cornerRadius: 18))
        } else {
          LazyVStack(spacing: 16) {
            ForEach(model.profiles) { profile in
              VStack(alignment: .leading, spacing: 14) {
                Text(profile.displayTitle)
                  .font(.headline)
                Text("Current limit: \(model.playTimeLimit(for: profile).durationLabel)")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)

                HStack(spacing: 10) {
                  ForEach(PlayTimeLimit.allCases, id: \.self) { limit in
                    Button {
                      model.setPlayTimeLimit(limit, for: profile)
                    } label: {
                      Text(limit.shortLabel)
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                          model.playTimeLimit(for: profile) == limit
                            ? Color.accentColor
                            : Color.white.opacity(0.92),
                          in: RoundedRectangle(cornerRadius: 14)
                        )
                        .foregroundStyle(
                          model.playTimeLimit(for: profile) == limit ? Color.white : Color.primary
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("play-limit-\(limit.minutes)-\(profile.id)")
                  }
                }
              }
              .padding()
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color(red: 1.0, green: 0.98, blue: 0.94), in: RoundedRectangle(cornerRadius: 22))
            }
          }
        }
      }
      .padding(32)
    }
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.97, green: 0.96, blue: 0.90),
          Color(red: 0.91, green: 0.96, blue: 0.99)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .navigationTitle("Parent Zone")
    .navigationBarTitleDisplayMode(.inline)
    .accessibilityIdentifier("parent-zone-view")
  }
}
