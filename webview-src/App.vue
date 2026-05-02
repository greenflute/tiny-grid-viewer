<template>
  <main class="viewer">
    <header v-if="searchOpen" class="toolbar" @focusout="handleSearchFocusout">
      <input
        ref="searchInput"
        v-model="searchQuery"
        class="filter-input"
        type="search"
        placeholder="Search"
        aria-label="Search"
        @keydown.enter.prevent="event => jumpSearch(event.shiftKey ? -1 : 1)"
        @keydown.esc.prevent="closeSearch"
      >
      <button class="search-button" type="button" @click="jumpSearch(-1)">prev</button>
      <button class="search-button" type="button" @click="jumpSearch(1)">next</button>
      <span class="search-count">{{ searchStatus }}</span>
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
import { collectSearchResults } from './gridRows'

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
        updateValue: (edit, value) => this.updateValue(edit, value),
        pathKey: path => this.pathKey(path),
        isSearchMatch: path => this.isSearchMatch(path),
        isActiveSearchMatch: path => this.isActiveSearchMatch(path)
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
      searchQuery: '',
      searchOpen: false,
      searchResults: [],
      activeSearchIndex: -1,
      uiState: {
        expandedPaths: { '[]': true },
        displayModes: {},
        columnWidths: {}
      }
    }
  },
  computed: {
    searchStatus() {
      if (!this.searchQuery.trim()) {
        return ''
      }
      if (this.searchResults.length === 0) {
        return '0 / 0'
      }
      return `${this.activeSearchIndex + 1 || 1} / ${this.searchResults.length}`
    }
  },
  watch: {
    searchQuery() {
      this.updateSearchResults()
    },
    doc: {
      deep: true,
      handler() {
        this.updateSearchResults()
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
    },
    updateSearchResults() {
      this.searchResults = collectSearchResults(this.doc, this.searchQuery)
      this.activeSearchIndex = this.searchResults.length > 0 ? 0 : -1
    },
    jumpSearch(direction) {
      if (this.searchResults.length === 0) {
        return
      }

      const nextIndex = (this.activeSearchIndex + direction + this.searchResults.length) % this.searchResults.length
      this.activeSearchIndex = nextIndex
      const result = this.searchResults[nextIndex]
      result.ancestorPaths.forEach(path => this.setExpanded(path, true))
      this.$nextTick(() => {
        requestAnimationFrame(() => this.scrollToPath(result.path))
      })
    },
    scrollToPath(path) {
      const target = document.querySelector(`[data-grid-path="${CSS.escape(this.pathKey(path))}"]`)
      target?.scrollIntoView({ block: 'center', inline: 'center' })
    },
    isSearchMatch(path) {
      const key = this.pathKey(path)
      return this.searchResults.some(result => this.pathKey(result.path) === key)
    },
    isActiveSearchMatch(path) {
      const result = this.searchResults[this.activeSearchIndex]
      return result ? this.pathKey(result.path) === this.pathKey(path) : false
    },
    handleGlobalKeydown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        this.openSearch()
      }
    },
    openSearch() {
      this.searchOpen = true
      this.$nextTick(() => {
        this.$refs.searchInput?.focus()
        this.$refs.searchInput?.select()
      })
    },
    closeSearch() {
      this.searchOpen = false
      this.searchQuery = ''
      this.searchResults = []
      this.activeSearchIndex = -1
    },
    handleSearchFocusout(event) {
      if (this.searchQuery.trim()) {
        return
      }

      if (event.currentTarget.contains(event.relatedTarget)) {
        return
      }

      this.closeSearch()
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
    window.addEventListener('keydown', this.handleGlobalKeydown)

    this.$options.vscode.postMessage({
      type: 'ready'
    })
  },
  unmounted() {
    window.removeEventListener('keydown', this.handleGlobalKeydown)
  }
}
</script>
