<template>
  <template v-if="entry.kind === 'array'">
    <span class="array collapsed">
      <span class="array badge">Array[{{ entry.items.length }}]</span>
      <button class="icon-button toggle-button" @click="toggleExpanded" :title="expanded ? 'Collapse' : 'Expand'">
        <svg viewBox="0 0 16 16" class="icon" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          <path d="M5 8h6" />
          <path v-if="!expanded" d="M8 5v6" />
        </svg>
      </button>
      <button
        class="icon-button toggle-button"
        :title="arrayDisplayMode === 'table' ? 'Switch to list mode' : 'Switch to table mode'"
        @click="toggleArrayMode"
      >
        <svg v-if="arrayDisplayMode === 'table'" viewBox="0 0 16 16" class="icon" aria-hidden="true">
          <rect x="2.5" y="3" width="11" height="10" rx="1.2" />
          <path d="M2.5 6.5h11" />
          <path d="M2.5 10h11" />
          <path d="M6 3v10" />
          <path d="M10 3v10" />
        </svg>
        <svg v-else viewBox="0 0 16 16" class="icon" aria-hidden="true">
          <rect x="2.5" y="3" width="11" height="2.2" rx="1" />
          <rect x="2.5" y="6.9" width="11" height="2.2" rx="1" />
          <rect x="2.5" y="10.8" width="11" height="2.2" rx="1" />
        </svg>
      </button>
    </span>
    <grid-array-table v-if="expanded" :entry="entry" :path="path" />
  </template>

  <template v-else-if="entry.kind === 'node' && hasGrid">
    <span class="object collapsed">
      <span class="object badge">{{ typeLabel }}[{{ childCount }}]</span>
      <button class="icon-button toggle-button" @click="toggleExpanded" :title="expanded ? 'Collapse' : 'Expand'">
        <svg viewBox="0 0 16 16" class="icon" aria-hidden="true">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          <path d="M5 8h6" />
          <path v-if="!expanded" d="M8 5v6" />
        </svg>
      </button>
    </span>
    <grid-object-table v-if="expanded" :node="entry.node" :path="path" />
  </template>

  <editable-scalar
    v-else
    :entry="entry"
  />
</template>

<script>
import EditableScalar from './EditableScalar.vue'
import { collectExpandablePaths } from '../gridRows'

export default {
  inject: [ 'gridUi' ],
  components: { EditableScalar },
  props: [
    'entry',
    'path'
  ],
  computed: {
    expanded() {
      return this.gridUi.isExpanded(this.path, this.path.length === 0)
    },
    hasGrid() {
      const node = this.entry.node
      return node && ((node.children || []).length > 0 || Object.keys(node.attributes || {}).length > 0)
    },
    childCount() {
      const node = this.entry.node
      return (node.children || []).length + Object.keys(node.attributes || {}).length
    },
    typeLabel() {
      if (this.entry.node?.type === 'document' || this.entry.node?.type === 'object') {
        return 'Object'
      }
      if (this.entry.node?.type === 'array') {
        return 'Array'
      }
      if (this.entry.node?.type === 'tree-node') {
        return 'Tree'
      }
      return 'Element'
    },
    arrayDisplayMode() {
      return this.gridUi.getDisplayMode(this.path, 'table')
    }
  },
  methods: {
    toggleExpanded(event) {
      if (event?.shiftKey) {
        this.expandDeep()
        return
      }

      this.gridUi.setExpanded(this.path, !this.expanded)
    },
    toggleArrayMode() {
      this.gridUi.setDisplayMode(this.path, this.arrayDisplayMode === 'table' ? 'list' : 'table')
    },
    expandDeep() {
      this.gridUi.setExpanded(this.path, true)
      this.deepPaths().forEach(path => this.gridUi.setExpanded(path, true))
    },
    deepPaths() {
      return collectExpandablePaths(this.entry, this.path)
    }
  }
}
</script>
