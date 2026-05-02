const vscode = require('vscode')
const path = require('path')
const { TinyGridViewer } = require('./tiny-grid-viewer')
const { getConfiguredLimits, validateUriBeforeRead } = require('./document-limits')

class TinyGridDocument {
  constructor(uri, text, openError = '') {
    this.uri = uri
    this.fileName = uri.fsPath
    this.openError = openError
    this.updateText(text)
  }

  getText() {
    return this.text
  }

  updateText(text) {
    this.text = text || ''
    this.lines = this.text.split(/\r?\n/)
  }

  get lineCount() {
    return this.lines.length
  }

  lineAt(index) {
    return {
      text: this.lines[index] || ''
    }
  }

  dispose() {}
}

class TinyGridEditorProvider {
  constructor(context) {
    this.context = context
  }

  static register(context) {
    const viewType = 'tinyGridViewer.document'
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      viewType,
      new TinyGridEditorProvider(context),
      {
        supportsMultipleEditorsPerDocument: false
      }
    )
    return providerRegistration
  }

  async openCustomDocument(uri) {
    try {
      validateUriBeforeRead(uri, getConfiguredLimits())
      const bytes = await vscode.workspace.fs.readFile(uri)
      return new TinyGridDocument(uri, Buffer.from(bytes).toString('utf8'))
    } catch (error) {
      return new TinyGridDocument(uri, '', error.message)
    }
  }

  async resolveCustomEditor(document, webviewPanel, _token) {
    const tinyGridViewer = new TinyGridViewer(document, webviewPanel, this.context)
    const watcher = document.uri.scheme === 'file'
      ? vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(
        path.dirname(document.uri.fsPath),
        path.basename(document.uri.fsPath)
      ))
      : null

    watcher?.onDidChange(async () => {
      await tinyGridViewer.reloadDocument()
      tinyGridViewer.updateWebview()
    })

    webviewPanel.onDidDispose(() => {
      watcher?.dispose()
      tinyGridViewer.cleanup()
    })
  }
}

module.exports.TinyGridEditorProvider = TinyGridEditorProvider
