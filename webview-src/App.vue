<template>
  <main class="viewer">
    <header class="toolbar">
      <input
        v-model="quickFilter"
        class="filter-input"
        type="search"
        placeholder="Filter current XML grids"
        aria-label="Filter current XML grids"
      >
    </header>

    <section v-if="error" class="error-panel" role="alert">
      {{ error }}
    </section>

    <grid-cell
      v-else
      :entry="{ kind: 'node', node: doc }"
      :path="[]"
    />
    <grid-minimap v-if="!error" />
  </main>
</template>

<script>
export default {
  provide() {
    return {
      gridUi: {
        isExpanded: (path, defaultValue) => this.isExpanded(path, defaultValue),
        setExpanded: (path, value) => this.setExpanded(path, value),
        getDisplayMode: (path, fallback) => this.getDisplayMode(path, fallback),
        setDisplayMode: (path, value) => this.setDisplayMode(path, value),
        getColumnWidth: (key, headerId) => this.getColumnWidth(key, headerId),
        setColumnWidth: (key, headerId, value) => this.setColumnWidth(key, headerId, value),
        updateValue: (edit, value) => this.updateValue(edit, value)
      }
    }
  },
  data() {
    return {
      doc: {
        type: 'document',
        name: '#document',
        attributes: {},
        value: '',
        children: []
      },
      error: '',
      quickFilter: '',
      uiState: {
        expandedPaths: { '[]': true },
        displayModes: {},
        columnWidths: {}
      }
    }
  },
  methods: {
    pathKey(path) {
      return JSON.stringify(path)
    },
    persistUiState() {
      this.$options.vscode.setState(this.uiState)
    },
    isExpanded(path, defaultValue = false) {
      const key = this.pathKey(path)
      return key in this.uiState.expandedPaths ? this.uiState.expandedPaths[key] : defaultValue
    },
    setExpanded(path, value) {
      this.uiState.expandedPaths[this.pathKey(path)] = value
      this.persistUiState()
    },
    getDisplayMode(path, fallback = 'table') {
      return this.uiState.displayModes[this.pathKey(path)] || fallback
    },
    setDisplayMode(path, value) {
      this.uiState.displayModes[this.pathKey(path)] = value
      this.persistUiState()
    },
    getColumnWidth(key, headerId) {
      return this.uiState.columnWidths[key]?.[headerId] || null
    },
    setColumnWidth(key, headerId, value) {
      if (!this.uiState.columnWidths[key]) {
        this.uiState.columnWidths[key] = {}
      }

      if (value === null) {
        delete this.uiState.columnWidths[key][headerId]
      } else {
        this.uiState.columnWidths[key][headerId] = value
      }

      this.persistUiState()
    },
    updateValue(edit, value) {
      this.$options.vscode.postMessage({
        type: 'edit',
        ...edit,
        value
      })
    }
  },
  created() {
    this.$options.vscode = window.acquireVsCodeApi()
    this.uiState = {
      ...this.uiState,
      ...(this.$options.vscode.getState() || {})
    }

    window.addEventListener('message', event => {
      switch (event.data.type) {
        case 'update':
          this.doc = event.data.doc || this.doc
          this.error = event.data.error || ''
          break
      }
    })

    this.$options.vscode.postMessage({
      type: 'ready'
    })
  }
}
</script>
