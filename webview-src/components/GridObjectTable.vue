<template>
  <resizable-table
    :headers="headers"
    tblClass="object expanded"
    trClass="object-hdr"
    :storage-key="storageKey"
  >
    <template #body>
      <tr v-for="row in rows" class="object member" :key="row.id">
        <th class="object key">
          <span class="key-inline">{{ row.key }}</span>
        </th>
        <td class="object element">
          <grid-cell :entry="row.entry" :path="childPath(row.id)" />
        </td>
      </tr>
    </template>
  </resizable-table>
</template>

<script>
import ResizableTable from './ResizableTable.vue'
import { rowsForNode } from '../gridRows'

export default {
  components: { ResizableTable },
  props: [
    'node',
    'path'
  ],
  data() {
    return {
      headers: [
        { id: 'key', header: '', thClass: 'object key', defaultWidth: '14rem', minWidth: '6rem' },
        { id: 'val', header: '', thClass: 'object value' }
      ]
    }
  },
  computed: {
    rows() {
      return rowsForNode(this.node)
    },
    storageKey() {
      return `object:${JSON.stringify(this.path)}`
    }
  },
  methods: {
    childPath(key) {
      return [ ...this.path, key ]
    }
  }
}
</script>
