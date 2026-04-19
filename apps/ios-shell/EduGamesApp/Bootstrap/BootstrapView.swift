import SwiftUI

struct BootstrapView: View {
  let isLoading: Bool
  let errorMessage: String?
  let retry: () -> Void

  var body: some View {
    VStack(spacing: 20) {
      Spacer()

      Image(systemName: "sparkles.rectangle.stack.fill")
        .font(.system(size: 52))
        .foregroundStyle(.orange, .yellow)

      Text("Preparing EduGames")
        .font(.largeTitle.bold())

      Text("Bootstrapping the iPad shell, local profile store, and catalog session.")
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
        .frame(maxWidth: 520)

      if isLoading {
        ProgressView()
          .controlSize(.large)
          .padding(.top, 8)
      }

      if let errorMessage {
        VStack(spacing: 12) {
          Text(errorMessage)
            .foregroundStyle(.red)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 520)

          Button("Retry", action: retry)
            .buttonStyle(.borderedProminent)
        }
        .padding(.top, 8)
      }

      Spacer()
    }
    .padding(32)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(
      LinearGradient(
        colors: [
          Color(red: 0.98, green: 0.95, blue: 0.86),
          Color(red: 0.90, green: 0.96, blue: 0.99)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
  }
}
