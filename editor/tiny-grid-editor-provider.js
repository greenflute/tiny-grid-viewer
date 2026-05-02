const vscode = require('vscode')
const { TinyGridViewer } = require('./tiny-grid-viewer')

class TinyGridEditorProvider {
  constructor(context) {
    this.context = context
  }

  static register(context) {
    const viewType = 'tinyGridViewer.document'
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      viewType,
      new TinyGridEditorProvider(context)
    )
    return providerRegistration
  }

  async resolveCustomTextEditor(document, webviewPanel, _token) {
    const tinyGridViewer = new TinyGridViewer(document, webviewPanel, this.context)

    webviewPanel.onDidDispose(() => {
      tinyGridViewer.cleanup()
    })
  }
}

module.exports.TinyGridEditorProvider = TinyGridEditorProvider
