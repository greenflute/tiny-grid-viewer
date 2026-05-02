const vscode = require('vscode')
const path = require('path')
const fs = require('fs')
const getNonce = require('./util').getNonce
const { flattenXmlTree, parseXmlGrid, updateXmlCell } = require('./xml-grid-data')
const { getDocumentKind, parseStructuredGrid, updateStructuredCell } = require('./structured-grid-data')
const {
  getConfiguredLimits,
  validateDocumentBeforeParse,
  validateGridNodeCount
} = require('./document-limits')

class TinyGridViewer {
  constructor(document, webviewPanel, context) {
    this.document = document
    this.webviewPanel = webviewPanel
    this.context = context

    this.webviewPanel.webview.options = {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'webview'))
      ]
    }

    this.webviewPanel.webview.html = this.getHtmlForWebview()

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
    const chunkVendorsCssPath = path.join(this.context.extensionPath, 'webview', 'css', 'chunk-vendors.css')
    const chunkVendorsCssLink = fs.existsSync(chunkVendorsCssPath)
      ? `<link href="${this.webviewPanel.webview.asWebviewUri(vscode.Uri.file(chunkVendorsCssPath))}" rel="stylesheet">`
      : ''

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
        ${chunkVendorsCssLink}
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
      if (this.document.openError) {
        throw new Error(this.document.openError)
      }

      const kind = getDocumentKind(this.document)
      const limits = getConfiguredLimits()
      validateDocumentBeforeParse(this.document, kind, limits)
      const doc = kind === 'xml'
        ? parseXmlGrid(this.document.getText())
        : parseStructuredGrid(this.document.getText(), kind)
      validateGridNodeCount(doc, limits)
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
      if (this.document.openError) {
        throw new Error(this.document.openError)
      }

      const kind = getDocumentKind(this.document)
      const nextText = kind === 'xml'
        ? updateXmlCell(this.document.getText(), msg.editPath, msg.field, msg.value, {
          attributeName: msg.attributeName
        })
        : updateStructuredCell(this.document.getText(), kind, msg.editPath, msg.value)
      await this.writeDocument(nextText)
    } catch (error) {
      vscode.window.showErrorMessage(`Could not update document: ${error.message}`)
      this.updateWebview()
    }
  }

  async reloadDocument() {
    if (this.document.openError) {
      return
    }

    const bytes = await vscode.workspace.fs.readFile(this.document.uri)
    this.document.updateText(Buffer.from(bytes).toString('utf8'))
  }

  async writeDocument(nextText) {
    await vscode.workspace.fs.writeFile(this.document.uri, Buffer.from(nextText, 'utf8'))
    this.document.updateText(nextText)
    this.updateWebview()
  }

  cleanup() {}
}

exports.TinyGridViewer = TinyGridViewer
