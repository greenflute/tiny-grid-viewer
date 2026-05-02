const { XMLBuilder, XMLParser, XMLValidator } = require('fast-xml-parser')

const ATTRIBUTE_GROUP = ':@'
const ATTRIBUTE_PREFIX = '@_'
const COMMENT_KEY = '#comment'
const TEXT_KEY = '#text'
const CDATA_KEY = '#cdata'

function parseXmlGrid(text) {
  const parsed = parseXmlOrdered(text)

  return {
    type: 'document',
    name: '#document',
    attributes: {},
    value: '',
    editPath: [],
    children: convertOrderedNodes(parsed, [])
  }
}

function parseXmlOrdered(text) {
  const validation = XMLValidator.validate(text, {
    allowBooleanAttributes: true
  })

  if (validation !== true) {
    const error = validation.err || {}
    const location = error.line ? ` at line ${error.line}, column ${error.col}` : ''
    throw new Error(`${error.msg || 'Invalid XML'}${location}`)
  }

  const parser = new XMLParser({
    allowBooleanAttributes: true,
    attributeNamePrefix: ATTRIBUTE_PREFIX,
    cdataPropName: CDATA_KEY,
    commentPropName: COMMENT_KEY,
    ignoreAttributes: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    parseAttributeValue: false,
    parseTagValue: false,
    preserveOrder: true,
    processEntities: true,
    trimValues: false
  })

  return parser.parse(text)
}

function convertOrderedNodes(nodes, parentPath) {
  if (!Array.isArray(nodes)) {
    return []
  }

  return nodes.flatMap((node, index) => convertOrderedNode(node, parentPath.concat(index))).filter(Boolean)
}

function convertOrderedNode(node, editPath) {
  if (!node || typeof node !== 'object') {
    return []
  }

  return Object.keys(node)
    .filter(key => key !== ATTRIBUTE_GROUP)
    .map(key => convertEntry(key, node[key], node[ATTRIBUTE_GROUP], editPath))
    .filter(Boolean)
}

function convertEntry(key, value, rawAttributes, editPath) {
  if (key === TEXT_KEY) {
    const text = normalizeScalar(value)
    if (text.trim() === '') {
      return null
    }
    return createLeaf('text', '#text', text, editPath)
  }

  if (key === COMMENT_KEY) {
    return createLeaf('comment', '#comment', extractNodeText(value), editPath)
  }

  if (key === CDATA_KEY) {
    return createLeaf('cdata', '#cdata', extractNodeText(value), editPath)
  }

  if (key.startsWith('?')) {
    return {
      type: 'processing-instruction',
      name: key,
      attributes: normalizeAttributes(rawAttributes),
      value: extractNodeText(value),
      editPath,
      children: convertOrderedNodes(value, editPath)
    }
  }

  return {
    type: 'element',
    name: key,
    attributes: normalizeAttributes(rawAttributes),
    value: '',
    editPath,
    children: convertOrderedNodes(value, editPath)
  }
}

function createLeaf(type, name, value, editPath) {
  return {
    type,
    name,
    attributes: {},
    value,
    editPath,
    children: []
  }
}

function extractNodeText(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeScalar(item && item[TEXT_KEY] !== undefined ? item[TEXT_KEY] : item))
      .join('')
  }
  return normalizeScalar(value)
}

function normalizeScalar(value) {
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function normalizeAttributes(rawAttributes) {
  if (!rawAttributes || typeof rawAttributes !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(rawAttributes).map(([key, value]) => [
      key.startsWith(ATTRIBUTE_PREFIX) ? key.slice(ATTRIBUTE_PREFIX.length) : key,
      value
    ])
  )
}

function flattenXmlTree(root) {
  const rows = []

  function visit(node, parentPath) {
    const siblingIndex = rows.length
    const path = parentPath.concat(`${node.name || node.type}:${siblingIndex}`)
    const children = Array.isArray(node.children) ? node.children : []
    const row = {
      id: path.join('/'),
      treePath: path,
      type: node.type,
      name: node.name,
      value: node.value || '',
      attributes: formatAttributes(node.attributes),
      attributeCount: Object.keys(node.attributes || {}).length,
      childCount: children.length,
      editPath: node.editPath || []
    }

    rows.push(row)
    children.forEach(child => visit(child, path))
  }

  visit(root, [])
  return rows
}

function updateXmlCell(text, editPath, field, value, options = {}) {
  const parsed = parseXmlOrdered(text)
  const target = getNodeAtPath(parsed, editPath)

  if (!target) {
    throw new Error('XML node was not found.')
  }

  const key = getPrimaryKey(target)
  if (!key) {
    throw new Error('XML node cannot be edited.')
  }

  if (field === 'value') {
    updateNodeValue(target, key, value)
  } else if (field === 'attributeValue') {
    updateSingleAttribute(target, options.attributeName, value)
  } else if (field === 'attributes') {
    updateNodeAttributes(target, value)
  } else if (field === 'name') {
    renameNode(target, key, value)
  } else {
    throw new Error(`Column "${field}" is not editable.`)
  }

  return buildXml(parsed)
}

function getNodeAtPath(nodes, editPath) {
  if (!Array.isArray(editPath) || editPath.length === 0) {
    return null
  }

  let currentNodes = nodes
  let currentNode = null

  for (const index of editPath) {
    if (!Array.isArray(currentNodes) || !currentNodes[index]) {
      return null
    }

    currentNode = currentNodes[index]
    const key = getPrimaryKey(currentNode)
    currentNodes = Array.isArray(currentNode[key]) ? currentNode[key] : null
  }

  return currentNode
}

function getPrimaryKey(node) {
  return Object.keys(node).find(key => key !== ATTRIBUTE_GROUP)
}

function updateNodeValue(node, key, value) {
  const nextValue = normalizeScalar(value)

  if (key === TEXT_KEY) {
    node[key] = nextValue
    return
  }

  if (key === COMMENT_KEY || key === CDATA_KEY || key.startsWith('?')) {
    node[key] = [{ [TEXT_KEY]: nextValue }]
    return
  }

  const children = Array.isArray(node[key]) ? node[key] : []
  const hasStructuredChildren = children.some(child => {
    const childKey = getPrimaryKey(child || {})
    return childKey && childKey !== TEXT_KEY
  })

  if (hasStructuredChildren) {
    throw new Error('Only leaf element values can be edited in the grid.')
  }

  node[key] = nextValue === '' ? [] : [{ [TEXT_KEY]: nextValue }]
}

function updateNodeAttributes(node, value) {
  const attributes = parseAttributeText(value)
  if (Object.keys(attributes).length === 0) {
    delete node[ATTRIBUTE_GROUP]
  } else {
    node[ATTRIBUTE_GROUP] = attributes
  }
}

function updateSingleAttribute(node, attributeName, value) {
  if (!attributeName) {
    throw new Error('Attribute name is required.')
  }

  const key = `${ATTRIBUTE_PREFIX}${attributeName}`
  if (!node[ATTRIBUTE_GROUP]) {
    node[ATTRIBUTE_GROUP] = {}
  }
  node[ATTRIBUTE_GROUP][key] = normalizeScalar(value)
}

function parseAttributeText(value) {
  const text = normalizeScalar(value).trim()
  if (!text) {
    return {}
  }

  const wrapped = `<__xml_grid ${text}/>`
  const parsed = parseXmlOrdered(wrapped)
  const node = parsed[0]
  return node && node[ATTRIBUTE_GROUP] ? node[ATTRIBUTE_GROUP] : {}
}

function renameNode(node, key, value) {
  const nextName = normalizeScalar(value).trim()
  if (!nextName) {
    throw new Error('Node name cannot be empty.')
  }

  if (key === TEXT_KEY || key === COMMENT_KEY || key === CDATA_KEY) {
    throw new Error('Text, comment and CDATA node names cannot be changed.')
  }

  if (nextName === key) {
    return
  }

  const nextNode = {
    [nextName]: node[key]
  }

  if (node[ATTRIBUTE_GROUP]) {
    nextNode[ATTRIBUTE_GROUP] = node[ATTRIBUTE_GROUP]
  }

  Object.keys(node).forEach(existingKey => {
    delete node[existingKey]
  })
  Object.assign(node, nextNode)
}

function buildXml(parsed) {
  const builder = new XMLBuilder({
    allowBooleanAttributes: true,
    attributeNamePrefix: ATTRIBUTE_PREFIX,
    cdataPropName: CDATA_KEY,
    commentPropName: COMMENT_KEY,
    format: true,
    ignoreAttributes: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    preserveOrder: true,
    suppressEmptyNode: false,
    suppressBooleanAttributes: false
  })

  return builder.build(parsed)
}

function formatAttributes(attributes) {
  const entries = Object.entries(attributes || {})
  if (entries.length === 0) {
    return ''
  }

  return entries
    .map(([key, value]) => `${key}="${String(value)}"`)
    .join(' ')
}

module.exports = {
  parseXmlGrid,
  flattenXmlTree,
  formatAttributes,
  updateXmlCell
}
