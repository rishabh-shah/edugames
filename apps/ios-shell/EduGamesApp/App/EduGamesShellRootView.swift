import SwiftUI

public struct EduGamesShellRootView: View {
  @Environment(\.scenePhase) private var scenePhase
  @State private var model = AppModel.live()

  public init() {}

  public var body: some View {
    NavigationStack {
      Group {
        switch model.route {
        case .bootstrap:
          BootstrapView(
            isLoading: model.isBootstrapping,
            errorMessage: model.bootstrapErrorMessage,
            retry: {
              Task {
                await model.bootstrap()
              }
            }
          )
        case .profiles:
          ProfilePickerView(model: model)
        case .catalog:
          CatalogView(model: model)
        case .gameDetail:
          GameDetailView(model: model)
        case .runtime:
          GameRuntimeView(model: model)
        case .parentZone:
          ParentZoneView(model: model)
        }
      }
      .task {
        await model.bootstrapIfNeeded()
      }
      .onChange(of: scenePhase) { _, newValue in
        model.updateSceneActivity(isActive: newValue == .active)
      }
      .sheet(
        isPresented: Binding(
          get: { model.isParentGatePresented },
          set: { if !$0 { model.dismissParentGate() } }
        )
      ) {
        ParentGateView(model: model)
      }
      .sheet(
        isPresented: Binding(
          get: { model.isPlayTimeExtensionPickerPresented },
          set: { if !$0 { model.dismissPlayTimeExtensionPicker() } }
        )
      ) {
        PlayTimeExtensionPickerView(model: model)
      }
      .sheet(
        isPresented: Binding(
          get: { model.isReportIssuePresented },
          set: { if !$0 { model.dismissReportIssue() } }
        )
      ) {
        ReportIssueView(model: model)
      }
    }
  }
}
