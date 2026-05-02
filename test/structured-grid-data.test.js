const test = require('node:test')
const assert = require('node:assert/strict')
const { getDocumentKind, parseStructuredGrid, updateStructuredCell } = require('../editor/structured-grid-data')

test('parses json objects into grid nodes', () => {
  const doc = parseStructuredGrid('{"name":"demo","items":[{"id":1}]}', 'json')

  assert.equal(doc.type, 'object')
  assert.equal(doc.children.find(child => child.name === 'name').value, 'demo')
  assert.equal(doc.children.find(child => child.name === 'items').type, 'array')
})

test('recognizes jsonc and ini-style extensions', () => {
  assert.equal(getDocumentKind({ fileName: 'settings.jsonc' }), 'json')
  assert.equal(getDocumentKind({ fileName: 'app.cfg' }), 'ini')
  assert.equal(getDocumentKind({ fileName: 'app.config' }), 'ini')
})

test('parses yaml into grid nodes', () => {
  const doc = parseStructuredGrid('name: demo\nitems:\n  - id: 1\n', 'yaml')

  assert.equal(doc.children.find(child => child.name === 'name').value, 'demo')
  assert.equal(doc.children.find(child => child.name === 'items').children[0].children[0].name, 'id')
})

test('parses jsonl as an array of rows', () => {
  const doc = parseStructuredGrid('{"id":1}\n{"id":2}\n', 'jsonl')

  assert.equal(doc.type, 'array')
  assert.equal(doc.children.length, 2)
})

test('updates json scalar values', () => {
  const updated = updateStructuredCell('{"name":"demo","count":1}', 'json', ['count'], '2')

  assert.match(updated, /"count": 2/)
})

test('updates yaml scalar values', () => {
  const updated = updateStructuredCell('name: demo\n', 'yaml', ['name'], 'changed')

  assert.match(updated, /name: changed/)
})

test('parses ini sections into grid nodes', () => {
  const doc = parseStructuredGrid('root=1\n[server]\nhost=localhost\n', 'ini')

  assert.equal(doc.children.find(child => child.name === 'root').value, '1')
  assert.equal(doc.children.find(child => child.name === 'server').children[0].name, 'host')
})

test('updates ini scalar values', () => {
  const updated = updateStructuredCell('[server]\nhost=localhost\n', 'ini', ['server', 'host'], 'example.com')

  assert.match(updated, /host=example.com/)
})

test('parses toml tables into grid nodes', () => {
  const doc = parseStructuredGrid('root = 1\n[server]\nhost = "localhost"\n', 'toml')

  assert.equal(doc.children.find(child => child.name === 'root').value, '1')
  assert.equal(doc.children.find(child => child.name === 'server').children[0].name, 'host')
})

test('updates toml scalar values', () => {
  const updated = updateStructuredCell('[server]\nhost = "localhost"\n', 'toml', ['server', 'host'], 'example.com')

  assert.match(updated, /host = "example.com"/)
})

test('parses tree command output into tree nodes', () => {
  const doc = parseStructuredGrid('root\n├── a.txt\n└── dir\n    └── b.txt\n\n1 directory, 2 files\n', 'tree')

  assert.equal(doc.type, 'tree-node')
  assert.equal(doc.name, 'root')
  assert.equal(doc.children[0].name, 'a.txt')
  assert.equal(doc.children[1].name, 'dir')
  assert.equal(doc.children[1].children[0].name, 'b.txt')
  assert.equal(doc.children[2].name, '1 directory, 2 files')
})
