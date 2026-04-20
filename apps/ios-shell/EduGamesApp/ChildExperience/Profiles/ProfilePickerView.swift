import SwiftUI

struct ProfilePickerView: View {
  @Bindable var model: AppModel
  @State private var firstName = ""
  @State private var lastName = ""
  @State private var age = 5
  @State private var gender: ChildGender = .girl

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 10) {
          Text("Choose a child profile")
            .font(.largeTitle.bold())
          Text("Phase 6 keeps profile selection local-first, with each created profile mirrored into the backend contract we already built.")
            .foregroundStyle(.secondary)

          Button("Parent Zone") {
            model.requestParentZoneAccess(returningTo: .profiles)
          }
          .buttonStyle(.borderedProminent)
          .accessibilityIdentifier("open-parent-zone-button")
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

          Button {
            model.isCreateProfileFormPresented = true
          } label: {
            HStack {
              VStack(alignment: .leading, spacing: 4) {
                Text("Create Child Profile")
                  .font(.headline)
                Text("Add first name, last name, age, and gender before unlocking the catalog.")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }

              Spacer()

              Image(systemName: "square.and.pencil")
                .font(.title3)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(red: 1.0, green: 0.98, blue: 0.92), in: RoundedRectangle(cornerRadius: 18))
          }
          .buttonStyle(.plain)
          .accessibilityIdentifier("open-create-profile-form")
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
    .sheet(isPresented: $model.isCreateProfileFormPresented) {
      NavigationStack {
        Form {
          Section("Child Details") {
            TextField("First name", text: $firstName)
              .textInputAutocapitalization(.words)
              .autocorrectionDisabled()
              .accessibilityIdentifier("create-profile-first-name")

            TextField("Last name", text: $lastName)
              .textInputAutocapitalization(.words)
              .autocorrectionDisabled()
              .accessibilityIdentifier("create-profile-last-name")

            Stepper(value: $age, in: 1...10) {
              Text("Age: \(age)")
            }
            .accessibilityIdentifier("create-profile-age")

            Picker("Gender", selection: $gender) {
              ForEach(ChildGender.allCases, id: \.self) { option in
                Text(option.displayTitle)
                  .tag(option)
              }
            }
            .accessibilityIdentifier("create-profile-gender")
          }

          Section {
            Text(ageBandDescription)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }
        .navigationTitle("Create Child Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel") {
              model.isCreateProfileFormPresented = false
            }
          }

          ToolbarItem(placement: .confirmationAction) {
            Button {
              Task {
                await model.createProfile(
                  CreateChildProfileInput(
                    firstName: firstName,
                    lastName: lastName,
                    age: age,
                    gender: gender
                  )
                )
              }
            } label: {
              if model.isCreatingProfile {
                ProgressView()
              } else {
                Text("Create")
              }
            }
            .disabled(formIsInvalid || model.isCreatingProfile)
            .accessibilityIdentifier("submit-create-profile")
          }
        }
      }
      .presentationDetents([.medium, .large])
    }
  }

  private var formIsInvalid: Bool {
    firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      || lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private var ageBandDescription: String {
    let band = CreateChildProfileInput(
      firstName: firstName,
      lastName: lastName,
      age: age,
      gender: gender
    ).ageBand

    switch band {
    case "TODDLER_1_2":
      return "This child will see toddler-friendly games for ages 1-2."
    case "PRESCHOOL_3_5":
      return "This child will see preschool games for ages 3-5."
    case "EARLY_PRIMARY_6_8":
      return "This child will see early primary games for ages 6-8."
    default:
      return "This child will see late primary games for ages 9-10."
    }
  }
}
