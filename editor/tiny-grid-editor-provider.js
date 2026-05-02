const vscode = require('vscode')
const path = require('path')
const fs = require('fs')
const readline = require('readline')
const { TinyGridViewer } = require('./tiny-grid-viewer')
const { getDocumentKind } = require('./structured-grid-data')
const { getConfiguredLimits, validateUriBeforeRead } = require('./document-limits')

class TinyGridDocument {
  constructor(uri, text, options = {}) {
    this.uri = uri
    this.fileName = uri.fsPath
    this.openError = options.openError || ''
    this.notice = options.notice || ''
    this.readOnly = Boolean(options.readOnly)
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
      const kind = getDocumentKind({ uri, fileName: uri.fsPath })
      const limits = getConfiguredLimits()
      if (kind === 'jsonl') {
        return await this.openJsonlDocument(uri, limits)
      }

      validateUriBeforeRead(uri, limits)
      const bytes = await vscode.workspace.fs.readFile(uri)
      return new TinyGridDocument(uri, Buffer.from(bytes).toString('utf8'))
    } catch (error) {
      return new TinyGridDocument(uri, '', { openError: error.message })
    }
  }

  async openJsonlDocument(uri, limits) {
    const maxFileBytes = limits.maxFileSizeMB > 0 ? limits.maxFileSizeMB * 1024 * 1024 : 0
    const fileSize = getFileSize(uri)

    if (maxFileBytes > 0 && fileSize > maxFileBytes) {
      return this.openJsonlPreview(uri, limits, `Previewing the first ${limits.jsonlPreviewRows.toLocaleString()} JSONL rows because this file is larger than the configured ${limits.maxFileSizeMB} MB limit.`)
    }

    if (limits.maxJsonlRows > 0) {
      const rowCheck = await countJsonlRowsUntil(uri, limits.maxJsonlRows + 1)
      if (rowCheck.count > limits.maxJsonlRows) {
        return this.openJsonlPreview(uri, limits, `Previewing the first ${limits.jsonlPreviewRows.toLocaleString()} JSONL rows because this file has more than ${limits.maxJsonlRows.toLocaleString()} non-empty rows.`)
      }
    }

    const bytes = await vscode.workspace.fs.readFile(uri)
    const text = Buffer.from(bytes).toString('utf8')
    return new TinyGridDocument(uri, text)
  }

  async openJsonlPreview(uri, limits, notice) {
    const text = await readFirstJsonlRows(uri, Math.max(limits.jsonlPreviewRows, 1))
    return new TinyGridDocument(uri, text, {
      notice: `${notice} Cell editing is disabled in preview mode.`,
      readOnly: true
    })
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

function getFileSize(uri) {
  try {
    return fs.statSync(uri.fsPath).size
  } catch (_error) {
    return 0
  }
}

function readFirstJsonlRows(uri, rowLimit) {
  return readJsonlRowsUntil(uri, rowLimit).then(result =>
    `${result.rows.join('\n')}${result.rows.length > 0 ? '\n' : ''}`
  )
}

function countJsonlRowsUntil(uri, rowLimit) {
  return readJsonlRowsUntil(uri, rowLimit, { keepRows: false })
}

function readJsonlRowsUntil(uri, rowLimit, options = {}) {
  return new Promise((resolve, reject) => {
    const rows = []
    let count = 0
    const input = fs.createReadStream(uri.fsPath, { encoding: 'utf8' })
    const reader = readline.createInterface({ input, crlfDelay: Infinity })

    input.on('error', reject)
    reader.on('line', line => {
      if (line.trim() === '') {
        return
      }

      count += 1
      if (options.keepRows !== false) {
        rows.push(line)
      }
      if (count >= rowLimit) {
        reader.close()
        input.destroy()
      }
    })
    reader.on('close', () => {
      resolve({ count, rows })
    })
  })
}
