import SwiftUI

struct ReportIssueView: View {
  @Bindable var model: AppModel
  @State private var selectedReason: ReportReason = .bug
  @State private var details = ""

  var body: some View {
    NavigationStack {
      VStack(alignment: .leading, spacing: 20) {
        Text("Report a Problem")
          .font(.largeTitle.bold())
        Text("Parents can send a quick note about \(model.reportIssueGameTitle).")
          .foregroundStyle(.secondary)

        Picker("Reason", selection: $selectedReason) {
          ForEach(ReportReason.allCases, id: \.self) { reason in
            Text(reason.displayTitle).tag(reason)
          }
        }
        .pickerStyle(.segmented)

        VStack(alignment: .leading, spacing: 10) {
          Text("Details")
            .font(.headline)
          TextEditor(text: $details)
            .frame(minHeight: 140)
            .padding(12)
            .background(Color.white.opacity(0.92), in: RoundedRectangle(cornerRadius: 18))
            .accessibilityIdentifier("report-issue-details")
        }

        if let errorMessage = model.reportSubmissionErrorMessage {
          Text(errorMessage)
            .foregroundStyle(.red)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 18))
        }

        Button("Send Report") {
          Task {
            await model.submitRuntimeReport(
              reason: selectedReason,
              details: details
            )
          }
        }
        .buttonStyle(.borderedProminent)
        .accessibilityIdentifier("submit-report-button")

        Spacer()
      }
      .padding(28)
      .background(
        LinearGradient(
          colors: [
            Color(red: 0.98, green: 0.96, blue: 0.92),
            Color(red: 0.91, green: 0.96, blue: 0.99)
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        )
      )
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Cancel") {
            model.dismissReportIssue()
          }
        }
      }
      .accessibilityIdentifier("report-issue-view")
    }
  }
}
