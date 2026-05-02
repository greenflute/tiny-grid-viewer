<template>
  <span class="value-inline hover-edit-anchor hover-edit-right" :class="{ editing }">
    <span v-if="!editing" :class="['value', valueClass]">{{ displayValue }}</span>
    <span v-else class="inline-editor" :class="{ multiline: useTextarea }">
      <textarea
        v-if="useTextarea"
        ref="editorInput"
        v-model="draft"
        class="xml-textarea"
        @keydown.meta.enter.prevent="saveEdit"
        @keydown.ctrl.enter.prevent="saveEdit"
      />
      <input
        v-else
        ref="editorInput"
        v-model="draft"
        class="xml-input"
        @keyup.enter="saveEdit"
      />
      <span class="editor-actions" :class="{ multiline: useTextarea }">
        <button class="cell-action" @click="saveEdit">save</button>
        <button class="cell-action subtle-action" @click="toggleEdit">cancel</button>
      </span>
    </span>
    <button
      v-if="!editing && canEdit"
      class="icon-button hover-edit-button"
      @click="toggleEdit"
      title="Edit value"
    >
      <svg viewBox="0 0 16 16" class="icon" aria-hidden="true">
        <path d="m11.8 1.8 2.4 2.4-8.1 8.1-3.3.9.9-3.3 8.1-8.1ZM10.7 2.9 4.6 9l-.4 1.4 1.4-.4 6.1-6.1-1-1Z" />
      </svg>
    </button>
  </span>
</template>

<script>
export default {
  inject: [ 'gridUi' ],
  props: [
    'entry'
  ],
  data() {
    return {
      editing: false,
      draft: ''
    }
  },
  computed: {
    value() {
      return this.entry.value ?? ''
    },
    displayValue() {
      return this.value === '' ? '""' : String(this.value)
    },
    useTextarea() {
      return String(this.value).includes('\n') || String(this.value).length > 80
    },
    valueClass() {
      return this.entry.type || 'string'
    },
    canEdit() {
      return Boolean(this.entry.edit)
    }
  },
  methods: {
    toggleEdit() {
      this.editing = !this.editing
      this.draft = this.editing ? String(this.value) : ''
      if (this.editing) {
        this.$nextTick(() => this.$refs.editorInput?.focus())
      }
    },
    saveEdit() {
      if (this.entry.edit) {
        this.gridUi.updateValue(this.entry.edit, this.draft)
      }
      this.editing = false
    }
  }
}
</script>
