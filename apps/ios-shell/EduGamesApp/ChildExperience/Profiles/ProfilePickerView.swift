import SwiftUI

struct ProfilePickerView: View {
  @Bindable var model: AppModel

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 10) {
          Text("Choose a child profile")
            .font(.largeTitle.bold())
          Text("Phase 6 keeps profile selection local-first, with each created profile mirrored into the backend contract we already built.")
            .foregroundStyle(.secondary)
        }

        if let errorMessage = model.bootstrapErrorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 20))
        }

        VStack(alignment: .leading, spacing: 12) {
          Text("Profiles")
            .font(.title2.bold())

          if model.profiles.isEmpty {
            Text("No child profiles are stored on this iPad yet. Create one below to unlock the catalog.")
              .foregroundStyle(.secondary)
              .padding()
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 18))
          } else {
            LazyVStack(spacing: 12) {
              ForEach(model.profiles) { profile in
                Button {
                  Task {
                    await model.selectProfile(profile)
                  }
                } label: {
                  VStack(alignment: .leading, spacing: 6) {
                    Text(profile.displayTitle)
                      .font(.headline)
                    Text(profile.displaySubtitle)
                      .font(.subheadline)
                      .foregroundStyle(.secondary)
                  }
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .padding()
                  .background(Color.white.opacity(0.88), in: RoundedRectangle(cornerRadius: 18))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("profile-card-\(profile.id)")
              }
            }
          }
        }

        VStack(alignment: .leading, spacing: 12) {
          Text("Create a profile")
            .font(.title2.bold())

          ForEach(ProfileCreationOption.presets) { option in
            Button {
              Task {
                await model.createProfile(option)
              }
            } label: {
              HStack {
                VStack(alignment: .leading, spacing: 4) {
                  Text(option.title)
                    .font(.headline)
                  Text(option.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if model.activeCreationOptionID == option.id {
                  ProgressView()
                } else {
                  Image(systemName: "plus.circle.fill")
                    .font(.title3)
                }
              }
              .padding()
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color(red: 1.0, green: 0.98, blue: 0.92), in: RoundedRectangle(cornerRadius: 18))
            }
            .buttonStyle(.plain)
            .disabled(model.activeCreationOptionID != nil)
            .accessibilityIdentifier("add-profile-\(option.id)")
          }
        }
      }
      .padding(32)
    }
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.96, green: 0.98, blue: 1.0),
          Color(red: 0.99, green: 0.95, blue: 0.88)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .navigationTitle("Profiles")
    .navigationBarTitleDisplayMode(.inline)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("profile-picker-view")
  }
}
