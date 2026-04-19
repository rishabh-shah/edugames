import SwiftUI

public struct EduGamesShellRootView: View {
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
        }
      }
      .task {
        await model.bootstrapIfNeeded()
      }
    }
  }
}
