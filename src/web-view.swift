import SwiftUI
import WebKit

struct WebView: NSViewRepresentable {
  let url: String

  func makeNSView(context: Context) -> WKWebView {
    let configuration = WKWebViewConfiguration()

    configuration.userContentController.add(context.coordinator, name: "selectModel")

    #if DEBUG
      configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
    #endif

    return WKWebView(frame: .zero, configuration: configuration)
  }

  func updateNSView(_ nsView: WKWebView, context: NSViewRepresentableContext<WebView>) {
    nsView.load(URLRequest(url: URL(string: url)!))
  }

  func makeCoordinator() -> Coordinator {
    Coordinator(self)
  }

  class Coordinator: NSObject, WKScriptMessageHandler {
    init(_ parent: WebView) {}

    func userContentController(
      _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
    ) {
      let panel = NSOpenPanel()

      panel.canChooseFiles = true
      panel.canChooseDirectories = false
      panel.allowsMultipleSelection = false

      panel.begin { (result) in
        if result == .OK {
          if let url = panel.urls.first {
            message.webView!.evaluateJavaScript(
              "setModelPath('\(url.path)')", completionHandler: nil)
          }
        }
      }
    }
  }
}
