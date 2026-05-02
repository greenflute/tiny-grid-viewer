const vscode = require('vscode')
const path = require('path')
const getNonce = require('./util').getNonce
const { flattenXmlTree, parseXmlGrid, updateXmlCell } = require('./xml-grid-data')
const { getDocumentKind, parseStructuredGrid, updateStructuredCell } = require('./structured-grid-data')

class TinyGridViewer {
  constructor(document, webviewPanel, context) {
    this.document = document
    this.webviewPanel = webviewPanel
    this.context = context

    this.webviewPanel.webview.options = {
      enableScripts: true,
      retainContextWhenHidden: true
    }

    this.webviewPanel.webview.html = this.getHtmlForWebview()

    this.changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === this.document.uri.toString()) {
        this.updateWebview()
      }
    })

    this.webviewPanel.webview.onDidReceiveMessage(msg => {
      switch (msg.type) {
        case 'ready':
          this.updateWebview()
          break
        case 'edit':
          this.applyEdit(msg)
          break
      }
    })
  }

  getHtmlForWebview() {
    const appUri = this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'webview', 'js', 'app.js')
    ))
    const chunkVendorsUri = this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'webview', 'js', 'chunk-vendors.js')
    ))
    const appCssUri = this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'webview', 'css', 'app.css')
    ))
    const chunkVendorsCssUri = this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(
      path.join(this.context.extensionPath, 'webview', 'css', 'chunk-vendors.css')
    ))

    const nonce = getNonce()

    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
          style-src ${this.webviewPanel.webview.cspSource} 'unsafe-inline';
          script-src 'nonce-${nonce}';"
        />
        <title>Tiny Grid Viewer</title>
        <link href="${chunkVendorsCssUri}" rel="stylesheet">
        <link href="${appCssUri}" rel="stylesheet">
      </head>
      <body>
        <div id="app"></div>
        <script nonce="${nonce}" src="${chunkVendorsUri}"></script>
        <script nonce="${nonce}" src="${appUri}"></script>
      </body>
    </html>
    `
  }

  updateWebview() {
    try {
      const kind = getDocumentKind(this.document)
      const doc = kind === 'xml'
        ? parseXmlGrid(this.document.getText())
        : parseStructuredGrid(this.document.getText(), kind)
      this.webviewPanel.webview.postMessage({
        type: 'update',
        doc,
        rows: kind === 'xml' ? flattenXmlTree(doc) : [],
        error: ''
      })
    } catch (error) {
      this.webviewPanel.webview.postMessage({
        type: 'update',
        rows: [],
        error: error.message
      })
    }
  }

  async applyEdit(msg) {
    try {
      const kind = getDocumentKind(this.document)
      const nextText = kind === 'xml'
        ? updateXmlCell(this.document.getText(), msg.editPath, msg.field, msg.value, {
          attributeName: msg.attributeName
        })
        : updateStructuredCell(this.document.getText(), kind, msg.editPath, msg.value)
      const edit = new vscode.WorkspaceEdit()
      edit.replace(this.document.uri, this.getFullDocumentRange(), nextText)
      await vscode.workspace.applyEdit(edit)
    } catch (error) {
      vscode.window.showErrorMessage(`Could not update document: ${error.message}`)
      this.updateWebview()
    }
  }

  getFullDocumentRange() {
    const lastLine = Math.max(this.document.lineCount - 1, 0)
    const lastChar = this.document.lineAt(lastLine).text.length
    return new vscode.Range(0, 0, lastLine, lastChar)
  }

  cleanup() {
    this.changeDocumentSubscription.dispose()
  }
}

exports.TinyGridViewer = TinyGridViewer
