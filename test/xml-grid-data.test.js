const test = require('node:test')
const assert = require('node:assert/strict')
const { flattenXmlTree, formatAttributes, parseXmlGrid, updateXmlCell } = require('../editor/xml-grid-data')

test('parses elements, attributes, text, cdata and comments', () => {
  const doc = parseXmlGrid(`<?xml version="1.0"?>
<!-- catalog comment -->
<catalog>
  <book id="bk101" available="true">
    <title>XML Developer's Guide</title>
    <![CDATA[raw <value>]]>
  </book>
</catalog>`)

  const rows = flattenXmlTree(doc)
  assert.equal(rows[0].type, 'document')
  assert.ok(rows.some(row => row.type === 'comment' && row.value.includes('catalog comment')))
  assert.ok(rows.some(row => row.name === 'book' && row.attributes.includes('id="bk101"')))
  assert.ok(rows.some(row => row.name === 'book' && row.attributes.includes('available="true"')))
  assert.ok(rows.some(row => row.type === 'cdata' && row.value.includes('raw <value>')))
})

test('reports XML validation errors with location', () => {
  assert.throws(
    () => parseXmlGrid('<root><child></root>'),
    /line .*column|Invalid XML/
  )
})

test('formats attributes for display', () => {
  assert.equal(formatAttributes({ id: 12, enabled: false }), 'id="12" enabled="false"')
})

test('creates stable tree paths for duplicate sibling names', () => {
  const rows = flattenXmlTree(parseXmlGrid('<root><item>A</item><item>B</item></root>'))
  const itemRows = rows.filter(row => row.name === 'item')

  assert.equal(itemRows.length, 2)
  assert.notEqual(itemRows[0].id, itemRows[1].id)
})

test('updates a leaf element value by edit path', () => {
  const text = '<root><item>A</item><item>B</item></root>'
  const rows = flattenXmlTree(parseXmlGrid(text))
  const secondItem = rows.filter(row => row.name === 'item')[1]
  const updated = updateXmlCell(text, secondItem.editPath, 'value', 'Changed')

  assert.match(updated, /<item>A<\/item>/)
  assert.match(updated, /<item>Changed<\/item>/)
})

test('updates element attributes from grid text', () => {
  const text = '<root><item id="a"/></root>'
  const item = flattenXmlTree(parseXmlGrid(text)).find(row => row.name === 'item')
  const updated = updateXmlCell(text, item.editPath, 'attributes', 'id="b" enabled="true"')

  assert.match(updated, /<item id="b" enabled="true"/)
})

test('updates a single attribute value', () => {
  const text = '<root><item id="a" enabled="true"/></root>'
  const item = flattenXmlTree(parseXmlGrid(text)).find(row => row.name === 'item')
  const updated = updateXmlCell(text, item.editPath, 'attributeValue', 'b', { attributeName: 'id' })

  assert.match(updated, /<item id="b" enabled="true"/)
})

test('renames element nodes', () => {
  const text = '<root><item>A</item></root>'
  const item = flattenXmlTree(parseXmlGrid(text)).find(row => row.name === 'item')
  const updated = updateXmlCell(text, item.editPath, 'name', 'entry')

  assert.match(updated, /<entry>A<\/entry>/)
})

test('updates comments and cdata values', () => {
  const text = '<root><!--old--><![CDATA[before]]></root>'
  const rows = flattenXmlTree(parseXmlGrid(text))
  const comment = rows.find(row => row.type === 'comment')
  const updatedComment = updateXmlCell(text, comment.editPath, 'value', 'new')
  const cdata = flattenXmlTree(parseXmlGrid(updatedComment)).find(row => row.type === 'cdata')
  const updatedCdata = updateXmlCell(updatedComment, cdata.editPath, 'value', 'after')

  assert.match(updatedCdata, /<!--new-->/)
  assert.match(updatedCdata, /<!\[CDATA\[after\]\]>/)
})
