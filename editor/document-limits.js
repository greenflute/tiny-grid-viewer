const fs = require('fs')

const MB = 1024 * 1024

const DEFAULT_LIMITS = {
  maxFileSizeMB: 25,
  maxJsonlRows: 50000,
  maxGridNodes: 100000
}

function getConfiguredLimits() {
  const vscode = require('vscode')
  const config = vscode.workspace.getConfiguration('tinyGridViewer')

  return {
    maxFileSizeMB: readNumber(config, 'maxFileSizeMB', DEFAULT_LIMITS.maxFileSizeMB),
    maxJsonlRows: readNumber(config, 'maxJsonlRows', DEFAULT_LIMITS.maxJsonlRows),
    maxGridNodes: readNumber(config, 'maxGridNodes', DEFAULT_LIMITS.maxGridNodes)
  }
}

function readNumber(config, key, fallback) {
  const value = config.get(key)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function validateDocumentBeforeParse(document, kind, limits = DEFAULT_LIMITS) {
  const maxFileBytes = limits.maxFileSizeMB > 0 ? limits.maxFileSizeMB * MB : 0
  const fileSize = getFileSize(document)

  if (maxFileBytes > 0 && fileSize > maxFileBytes) {
    throw new Error(
      `Tiny Grid Viewer skipped this ${formatBytes(fileSize)} file because it is larger than the configured ${limits.maxFileSizeMB} MB limit. ` +
      'Open it as text, or increase tinyGridViewer.maxFileSizeMB if you want to try rendering it.'
    )
  }

  if (kind === 'jsonl' && limits.maxJsonlRows > 0 && document.lineCount > limits.maxJsonlRows) {
    throw new Error(
      `Tiny Grid Viewer skipped this JSONL file because it has ${document.lineCount.toLocaleString()} lines, above the configured ${limits.maxJsonlRows.toLocaleString()} line limit. ` +
      'Open it as text, split the file, or increase tinyGridViewer.maxJsonlRows if you want to try rendering it.'
    )
  }
}

function validateUriBeforeRead(uri, limits = DEFAULT_LIMITS) {
  const maxFileBytes = limits.maxFileSizeMB > 0 ? limits.maxFileSizeMB * MB : 0
  if (maxFileBytes <= 0 || !uri?.fsPath) {
    return
  }

  let fileSize = 0
  try {
    fileSize = fs.statSync(uri.fsPath).size
  } catch (_error) {
    return
  }

  if (fileSize > maxFileBytes) {
    throw new Error(
      `Tiny Grid Viewer skipped this ${formatBytes(fileSize)} file because it is larger than the configured ${limits.maxFileSizeMB} MB limit. ` +
      'Open it as text, or increase tinyGridViewer.maxFileSizeMB if you want to try rendering it.'
    )
  }
}

function validateGridNodeCount(doc, limits = DEFAULT_LIMITS) {
  if (limits.maxGridNodes <= 0) {
    return
  }

  const count = countNodesUpTo(doc, limits.maxGridNodes + 1)
  if (count > limits.maxGridNodes) {
    throw new Error(
      `Tiny Grid Viewer parsed the document but skipped rendering because it contains more than ${limits.maxGridNodes.toLocaleString()} grid nodes. ` +
      'Large nested files can make the VS Code extension host or webview unresponsive; raise tinyGridViewer.maxGridNodes only if you accept that risk.'
    )
  }
}

function countNodesUpTo(root, limit) {
  let count = 0
  const stack = root ? [root] : []

  while (stack.length > 0) {
    const node = stack.pop()
    count += 1
    if (count >= limit) {
      return count
    }

    if (Array.isArray(node.children)) {
      for (let index = 0; index < node.children.length; index += 1) {
        stack.push(node.children[index])
      }
    }
  }

  return count
}

function getFileSize(document) {
  const fsPath = document.uri?.fsPath
  if (fsPath) {
    try {
      return fs.statSync(fsPath).size
    } catch (_error) {
      // Untitled or virtual documents fall back to the current text size.
    }
  }

  return Buffer.byteLength(document.getText(), 'utf8')
}

function formatBytes(bytes) {
  if (bytes >= MB) {
    return `${(bytes / MB).toFixed(1)} MB`
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${bytes} bytes`
}

module.exports = {
  DEFAULT_LIMITS,
  countNodesUpTo,
  getConfiguredLimits,
  validateUriBeforeRead,
  validateDocumentBeforeParse,
  validateGridNodeCount
}
