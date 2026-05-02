<template>
  <div>
    <resizable-table
      v-if="displayMode === 'table'"
      :headers="tableHeaders"
      tblClass="array expanded"
      trClass="array-hdr"
      :storage-key="storageKey"
    >
      <template #header="{ hdr }">
        <span v-if="hdr.id !== '__index__'">{{ hdr.header }}</span>
      </template>
      <template #body>
        <tr v-for="(item, index) in tableRows" :key="item.id" class="array-el object">
          <td class="index object">{{ index }}</td>
          <td v-for="header in valueHeaders" :key="header.id" class="member">
            <grid-cell :entry="item.values[header.id]" :path="[ ...path, index, item.pathIds[header.id] ]" />
          </td>
        </tr>
      </template>
    </resizable-table>

    <resizable-table
      v-else
      :headers="listHeaders"
      tblClass="array expanded"
      trClass="array-hdr"
      :storage-key="`${storageKey}:list`"
    >
      <template #header="{ hdr }">
        <span>{{ hdr.header }}</span>
      </template>
      <template #body>
        <tr v-for="(item, index) in entry.items" :key="item.editPath.join('.')" class="array-el list-mode">
          <td class="index object">{{ index }}</td>
          <td class="value">
            <grid-cell :entry="{ kind: 'node', node: item }" :path="[ ...path, index ]" />
          </td>
        </tr>
      </template>
    </resizable-table>
  </div>
</template>

<script>
import ResizableTable from './ResizableTable.vue'
import { leafEntryForNode, rowsForNode } from '../gridRows'

export default {
  inject: [ 'gridUi' ],
  components: { ResizableTable },
  props: [
    'entry',
    'path'
  ],
  computed: {
    displayMode() {
      return this.gridUi.getDisplayMode(this.path, 'table')
    },
    valueHeaders() {
      const keys = this.entry.items.reduce((headers, item) => {
        rowsForNode(item).forEach(row => {
          if (!headers.includes(row.key)) {
            headers.push(row.key)
          }
        })
        return headers
      }, [])
      return keys.map(key => ({ id: key, header: key, resize: true, thClass: 'array member' }))
    },
    tableHeaders() {
      return [ { id: '__index__', header: 'index', resize: false, thClass: 'index' }, ...this.valueHeaders ]
    },
    listHeaders() {
      return [
        { id: '__index__', header: 'index', resize: false, thClass: 'index' },
        { id: '__value__', header: 'value', resize: true, thClass: 'array member' }
      ]
    },
    tableRows() {
      return this.entry.items.map(item => {
        const rows = rowsForNode(item)
        const values = Object.fromEntries(rows.map(row => [ row.key, row.entry ]))
        const pathIds = Object.fromEntries(rows.map(row => [ row.key, row.id ]))
        this.valueHeaders.forEach(header => {
          if (!values[header.id]) {
            values[header.id] = leafEntryForNode(null, '')
            pathIds[header.id] = header.id
          }
        })
        return {
          id: item.editPath.join('.'),
          values,
          pathIds
        }
      })
    },
    storageKey() {
      return `array:${JSON.stringify(this.path)}`
    }
  }
}
</script>
