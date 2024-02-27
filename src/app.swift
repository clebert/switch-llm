import SwiftUI

@main
struct Main: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  @StateObject var state = AppState.shared

  var body: some Scene {
    WindowGroup {
      WebView(url: "http://127.0.0.1:\(state.port)").frame(
        minWidth: 800, idealWidth: 800,
        minHeight: 600, idealHeight: 600
      )
    }
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
  func applicationWillFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    NSApp.activate(ignoringOtherApps: true)

    if start_server() != 0 {
      exit(1)
    }

    let port = get_port()

    if port <= 0 {
      exit(1)
    }

    AppState.shared.port = port

    signal(SIGPIPE) { _ in }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  func applicationWillTerminate(_ notification: Notification) {}
}

final class AppState: ObservableObject {
  static let shared = AppState()

  @Published var port: Int32 = 0
}
