import SwiftUI

struct ParentGateView: View {
  @Bindable var model: AppModel

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 20) {
        Text("Parent Gate")
          .font(.largeTitle.bold())

        Text(model.parentGateChallenge?.prompt ?? "Parents only")
          .font(.title3)
          .foregroundStyle(.secondary)

        if let errorMessage = model.parentGateErrorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
        }

        VStack(spacing: 12) {
          ForEach(model.parentGateChallenge?.choices ?? [], id: \.self) { choice in
            Button {
              model.submitParentGateAnswer(choice)
            } label: {
              Text("\(choice)")
                .font(.title2.bold())
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 18))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("parent-gate-option-\(choice)")
          }
        }

        Spacer()
      }
      .padding(28)
      .background(
        LinearGradient(
          colors: [
            Color(red: 0.98, green: 0.97, blue: 0.92),
            Color(red: 0.92, green: 0.96, blue: 0.99)
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .navigationTitle("Parent Gate")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Cancel") {
            model.dismissParentGate()
          }
        }
      }
      .accessibilityIdentifier("parent-gate-view")
    }
  }
}
