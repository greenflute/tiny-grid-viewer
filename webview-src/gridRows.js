export function rowsForNode(node) {
  if (!node) {
    return []
  }

  const attributeRows = Object.entries(node.attributes || {}).map(([key, value]) => ({
    id: `@${key}`,
    key: `@${key}`,
    entry: {
      kind: 'leaf',
      type: 'attribute',
      value: String(value),
      edit: {
        editPath: node.editPath || [],
        field: 'attributeValue',
        attributeName: key
      }
    }
  }))

  const children = node.children || []
  const groupedNames = new Set()
  const childRows = []

  children.forEach((child, index) => {
    const repeated = child.type === 'element' &&
      children.filter(candidate => candidate.type === 'element' && candidate.name === child.name).length > 1

    if (node.type === 'array') {
      childRows.push({
        id: String(index),
        key: String(index),
        entry: entryForNode(child)
      })
      return
    }

    if (repeated) {
      if (groupedNames.has(child.name)) {
        return
      }

      groupedNames.add(child.name)
      childRows.push({
        id: child.name,
        key: child.name,
        entry: {
          kind: 'array',
          items: children.filter(candidate => candidate.type === 'element' && candidate.name === child.name)
        }
      })
      return
    }

    childRows.push({
      id: `${child.name}:${index}`,
      key: child.name,
      entry: entryForNode(child)
    })
  })

  return attributeRows.concat(childRows)
}

export function entryForNode(node) {
  if (!node) {
    return leafEntryForNode(null, '')
  }

  const hasChildren = (node.children || []).length > 0 || Object.keys(node.attributes || {}).length > 0
  if (hasChildren) {
    return {
      kind: 'node',
      node
    }
  }

  return leafEntryForNode(node, node.value || '')
}

export function leafEntryForNode(node, value) {
  const editable = node && ![ 'tree-node', 'summary' ].includes(node.type)
  return {
    kind: 'leaf',
    type: node?.type || 'empty',
    value,
    edit: editable ? {
      editPath: node.editPath || [],
      field: 'value'
    } : null
  }
}

export function collectExpandablePaths(entry, basePath) {
  if (entry.kind === 'array') {
    return entry.items.flatMap((node, index) =>
      [
        [ ...basePath, index ],
        ...collectNodeExpandablePaths(node, [ ...basePath, index ])
      ]
    )
  }

  if (entry.kind === 'node') {
    return collectNodeExpandablePaths(entry.node, basePath)
  }

  return []
}

export function collectSearchResults(node, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (!normalizedQuery) {
    return []
  }

  return collectNodeSearchResults(node, [], [], normalizedQuery)
}

function collectNodeSearchResults(node, basePath, ancestors, query) {
  return rowsForNode(node).flatMap(row => {
    const childPath = [ ...basePath, row.id ]
    const rowText = searchableText(row)
    const selfMatch = rowText.toLowerCase().includes(query)
      ? [{ path: childPath, ancestorPaths: ancestors, text: rowText }]
      : []

    if (row.entry.kind === 'array') {
      return [
        ...selfMatch,
        ...row.entry.items.flatMap((item, index) =>
          collectNodeSearchResults(item, [ ...childPath, index ], [ ...ancestors, childPath, [ ...childPath, index ] ], query)
        )
      ]
    }

    if (row.entry.kind === 'node') {
      return [
        ...selfMatch,
        ...collectNodeSearchResults(row.entry.node, childPath, [ ...ancestors, childPath ], query)
      ]
    }

    return selfMatch
  })
}

function searchableText(row) {
  if (row.entry.kind === 'leaf') {
    return `${row.key} ${row.entry.value || ''}`
  }
  if (row.entry.kind === 'array') {
    return `${row.key} Array ${row.entry.items.length}`
  }
  return `${row.key} ${row.entry.node?.name || ''} ${row.entry.node?.value || ''}`
}

function collectNodeExpandablePaths(node, basePath) {
  return rowsForNode(node).flatMap(row => {
    const childPath = [ ...basePath, row.id ]

    if (row.entry.kind === 'array') {
      return [
        childPath,
        ...row.entry.items.flatMap((item, index) =>
          collectNodeExpandablePaths(item, [ ...childPath, index ])
        )
      ]
    }

    if (row.entry.kind === 'node') {
      const childNode = row.entry.node
      const expandable = (childNode.children || []).length > 0 ||
        Object.keys(childNode.attributes || {}).length > 0
      if (!expandable) {
        return []
      }

      return [
        childPath,
        ...collectNodeExpandablePaths(childNode, childPath)
      ]
    }

    return []
  })
}
