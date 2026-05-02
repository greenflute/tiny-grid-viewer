const path = require('path')
const Hjson = require('hjson')
const ini = require('ini')
const toml = require('smol-toml')
const yaml = require('yaml')

function getDocumentKind(document) {
  const ext = path.extname(document.fileName || document.uri?.fsPath || '').toLowerCase()
  if (['.xml', '.xsd', '.svg', '.wsdl'].includes(ext)) {
    return 'xml'
  }
  if (ext === '.yaml' || ext === '.yml') {
    return 'yaml'
  }
  if (ext === '.jsonl') {
    return 'jsonl'
  }
  if (ext === '.ini' || ext === '.cfg' || ext === '.conf' || ext === '.config' || ext === '.properties') {
    return 'ini'
  }
  if (ext === '.toml') {
    return 'toml'
  }
  if (ext === '.tree') {
    return 'tree'
  }
  return 'json'
}

function parseStructuredGrid(text, kind, options = {}) {
  return valueToNode(parseValue(text, kind), '#document', [], options)
}

function parseValue(text, kind) {
  if (kind === 'yaml') {
    return yaml.parse(text)
  }
  if (kind === 'jsonl') {
    return text
      .split(/\r?\n/)
      .filter(line => line.trim() !== '')
      .map(line => Hjson.parse(line))
  }
  if (kind === 'ini') {
    return ini.parse(text)
  }
  if (kind === 'toml') {
    return toml.parse(text)
  }
  if (kind === 'tree') {
    return parseTree(text)
  }
  return Hjson.parse(text)
}

function valueToNode(value, name, editPath, options = {}) {
  if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, '__treeNodeName')) {
    return createNode('tree-node', value.__treeNodeName, editPath, value.__treeChildren.map((child, index) =>
      valueToNode(child, child.__treeNodeName, editPath.concat(index), options)
    ))
  }

  if (options.compactGeoJson && name === 'coordinates' && Array.isArray(value)) {
    return createNode('summary', name, editPath, [], summarizeCoordinateArray(value))
  }

  if (Array.isArray(value)) {
    return createNode('array', name, editPath, value.map((item, index) =>
      valueToNode(item, String(index), editPath.concat(index), options)
    ))
  }

  if (value && typeof value === 'object') {
    return createNode('object', name, editPath, Object.entries(value).map(([key, item]) =>
      valueToNode(item, key, editPath.concat(key), options)
    ))
  }

  return createNode(value === null ? 'null' : typeof value, name, editPath, [], value === null ? 'null' : String(value))
}

function summarizeCoordinateArray(value) {
  const stats = collectCoordinateStats(value)
  const parts = [
    `Coordinates ${stats.positions.toLocaleString()} position${stats.positions === 1 ? '' : 's'}`,
    `depth ${stats.depth}`
  ]

  if (stats.sample.length > 0) {
    parts.push(`sample ${stats.sample.join(', ')}`)
  }

  return parts.join(' | ')
}

function collectCoordinateStats(value) {
  let positions = 0
  let depth = 0
  let sample = []
  const stack = [{ value, level: 1 }]

  while (stack.length > 0) {
    const current = stack.pop()
    if (!Array.isArray(current.value)) {
      continue
    }

    depth = Math.max(depth, current.level)
    if (current.value.every(item => typeof item === 'number')) {
      positions += 1
      if (sample.length === 0) {
        sample = current.value.slice(0, 3).map(number => String(number))
      }
      continue
    }

    for (let index = current.value.length - 1; index >= 0; index -= 1) {
      stack.push({ value: current.value[index], level: current.level + 1 })
    }
  }

  return { positions, depth, sample }
}

function createNode(type, name, editPath, children, value = '') {
  return {
    type,
    name,
    attributes: {},
    value,
    editPath,
    children
  }
}

function updateStructuredCell(text, kind, editPath, value) {
  const parsed = parseValue(text, kind)
  setIn(parsed, editPath, parseScalarForExisting(value, getIn(parsed, editPath)))
  return serializeValue(parsed, kind)
}

function getIn(root, editPath) {
  return editPath.reduce((current, key) => current?.[key], root)
}

function setIn(root, editPath, value) {
  if (!Array.isArray(editPath) || editPath.length === 0) {
    throw new Error('Editing the document root is not supported.')
  }

  const parent = editPath.slice(0, -1).reduce((current, key) => current?.[key], root)
  if (parent === null || parent === undefined) {
    throw new Error('Target path was not found.')
  }

  parent[editPath[editPath.length - 1]] = value
}

function parseScalarForExisting(value, existing) {
  if (typeof existing === 'string') {
    return String(value)
  }
  if (typeof existing === 'number') {
    const number = Number(value)
    if (Number.isNaN(number)) {
      throw new Error('Value must be a number.')
    }
    return number
  }
  if (typeof existing === 'boolean') {
    if (value === 'true') {
      return true
    }
    if (value === 'false') {
      return false
    }
    throw new Error('Value must be true or false.')
  }
  if (existing === null) {
    return value === 'null' ? null : String(value)
  }

  return Hjson.parse(value)
}

function serializeValue(value, kind) {
  if (kind === 'yaml') {
    return yaml.stringify(value)
  }
  if (kind === 'jsonl') {
    return `${value.map(item => JSON.stringify(item)).join('\n')}\n`
  }
  if (kind === 'ini') {
    return ini.stringify(value)
  }
  if (kind === 'toml') {
    return toml.stringify(value)
  }
  if (kind === 'tree') {
    throw new Error('Editing tree command output is not supported.')
  }
  return `${JSON.stringify(value, null, 2)}\n`
}

function parseTree(text) {
  const rawLines = text
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/, ''))
    .filter(line => line.trim() !== '')

  const summaryLine = rawLines.length > 0 && isTreeSummary(rawLines[rawLines.length - 1])
    ? rawLines.pop().trim()
    : null
  const lines = rawLines

  if (lines.length === 0) {
    return createTreeNode('#document', summaryLine ? [createTreeNode(summaryLine)] : [])
  }

  const root = createTreeNode(lines[0].trim())
  const stack = [root]

  lines.slice(1).forEach(line => {
    const parsed = parseTreeLine(line)
    if (!parsed) {
      return
    }

    const node = createTreeNode(parsed.name)
    const parent = stack[parsed.depth] || root
    parent.__treeChildren.push(node)
    stack[parsed.depth + 1] = node
    stack.length = parsed.depth + 2
  })

  if (summaryLine) {
    root.__treeChildren.push(createTreeNode(summaryLine))
  }

  return root
}

function createTreeNode(name, children = []) {
  return {
    __treeNodeName: name,
    __treeChildren: children
  }
}

function isTreeSummary(line) {
  return /^\d+ director(?:y|ies), \d+ files?$/.test(line.trim())
}

function parseTreeLine(line) {
  const markerMatch = line.match(/^(.*?)(?:├── |└── )(.*)$/)
  if (!markerMatch) {
    return null
  }

  return {
    depth: Math.floor(markerMatch[1].length / 4),
    name: markerMatch[2].trim()
  }
}

module.exports = {
  getDocumentKind,
  parseStructuredGrid,
  updateStructuredCell
}
