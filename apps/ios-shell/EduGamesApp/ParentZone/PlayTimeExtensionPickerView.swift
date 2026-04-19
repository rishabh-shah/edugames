import SwiftUI

struct PlayTimeExtensionPickerView: View {
  @Bindable var model: AppModel

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 20) {
        Text("Add More Time")
          .font(.largeTitle.bold())
        Text("Choose how much extra play time to add to this session.")
          .foregroundStyle(.secondary)

        VStack(spacing: 12) {
          ForEach(PlayTimeLimit.allCases, id: \.self) { limit in
            Button {
              model.extendActivePlaySession(by: limit)
            } label: {
              Text(limit.durationLabel)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 18))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("playtime-extension-\(limit.minutes)")
          }
        }

        Spacer()
      }
      .padding(28)
      .background(
        LinearGradient(
          colors: [
            Color(red: 0.96, green: 0.97, blue: 0.92),
            Color(red: 0.91, green: 0.95, blue: 0.99)
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Cancel") {
            model.dismissPlayTimeExtensionPicker()
          }
        }
      }
    }
  }
}
