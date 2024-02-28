import SwiftUI
import WebKit

struct WebView: NSViewRepresentable {
  let url: String

  func makeNSView(context: Context) -> WKWebView {
    let configuration = WKWebViewConfiguration()

    #if DEBUG
      configuration.preferences.setValue(true, forKey: "developerExtrasEnabled")
    #endif

    return WKWebView(frame: .zero, configuration: configuration)
  }

  func updateNSView(_ nsView: WKWebView, context: NSViewRepresentableContext<WebView>) {
    nsView.load(URLRequest(url: URL(string: url)!))
  }
}
