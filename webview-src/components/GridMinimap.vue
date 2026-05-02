<template>
  <aside
    v-show="visible"
    class="xml-minimap"
    title="Document minimap"
    @mousedown.prevent="startDrag"
  >
    <canvas ref="canvas" class="xml-minimap-canvas" />
  </aside>
</template>

<script>
export default {
  data() {
    return {
      visible: false,
      dragging: false,
      metrics: {
        scrollHeight: 0,
        scrollWidth: 0,
        viewportHeight: 0,
        viewportWidth: 0,
        scrollLeft: 0,
        scrollTop: 0
      }
    }
  },
  mounted() {
    this.$options.onScroll = () => this.scheduleDraw()
    this.$options.onResize = () => this.scheduleDraw()
    window.addEventListener('scroll', this.$options.onScroll, { passive: true })
    window.addEventListener('resize', this.$options.onResize)
    this.$options.resizeObserver = new ResizeObserver(() => this.scheduleDraw())
    this.$options.resizeObserver.observe(document.body)
    this.scheduleDraw()
  },
  unmounted() {
    window.removeEventListener('scroll', this.$options.onScroll)
    window.removeEventListener('resize', this.$options.onResize)
    this.$options.resizeObserver?.disconnect()
    this.stopDrag()
  },
  methods: {
    scheduleDraw() {
      cancelAnimationFrame(this.$options.drawFrame)
      this.$options.drawFrame = requestAnimationFrame(this.draw)
    },
    readMetrics() {
      const doc = document.documentElement
      const body = document.body
      return {
        scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
        scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
        scrollLeft: window.scrollX || doc.scrollLeft || body.scrollLeft || 0,
        scrollTop: window.scrollY || doc.scrollTop || body.scrollTop || 0
      }
    },
    draw() {
      this.metrics = this.readMetrics()
      this.visible = this.metrics.scrollHeight > this.metrics.viewportHeight * 1.15 ||
        this.metrics.scrollWidth > this.metrics.viewportWidth * 1.15

      if (!this.visible) {
        return
      }

      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--minimap-track') || 'rgba(127, 127, 127, 0.16)'
      ctx.fillRect(0, 0, rect.width, rect.height)

      this.drawContentHint(ctx, rect)

      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--minimap-thumb') || 'rgba(127, 166, 214, 0.55)'
      const viewport = this.viewportRect(rect)
      ctx.fillRect(viewport.x, viewport.y, viewport.width, viewport.height)

      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--minimap-thumb-border') || 'rgba(127, 166, 214, 0.95)'
      ctx.strokeRect(viewport.x + 0.5, viewport.y + 0.5, viewport.width - 1, viewport.height - 1)
    },
    drawContentHint(ctx, rect) {
      const style = getComputedStyle(document.body)
      ctx.fillStyle = style.getPropertyValue('--minimap-content') || 'rgba(127, 127, 127, 0.24)'
      const rowHeight = Math.max(1, rect.height / 180)
      const rows = document.querySelectorAll('tr')
      rows.forEach(row => {
        const box = row.getBoundingClientRect()
        const top = (box.top + this.metrics.scrollTop) / this.metrics.scrollHeight * rect.height
        const left = (box.left + this.metrics.scrollLeft) / this.metrics.scrollWidth * rect.width
        const width = Math.max(2, box.width / this.metrics.scrollWidth * rect.width)
        ctx.fillRect(left, top, width, Math.max(0.6, rowHeight))
      })
    },
    viewportRect(rect) {
      const width = Math.max(10, Math.min(rect.width, this.metrics.viewportWidth / this.metrics.scrollWidth * rect.width))
      const height = Math.max(18, Math.min(rect.height, this.metrics.viewportHeight / this.metrics.scrollHeight * rect.height))
      return {
        x: Math.min(rect.width - width, this.metrics.scrollLeft / this.metrics.scrollWidth * rect.width),
        y: Math.min(rect.height - height, this.metrics.scrollTop / this.metrics.scrollHeight * rect.height),
        width,
        height
      }
    },
    startDrag(event) {
      this.dragging = true
      this.seek(event)
      this.$options.onPointerMove = moveEvent => this.seek(moveEvent)
      this.$options.onPointerUp = () => this.stopDrag()
      document.addEventListener('mousemove', this.$options.onPointerMove)
      document.addEventListener('mouseup', this.$options.onPointerUp)
    },
    stopDrag() {
      if (this.$options.onPointerMove) {
        document.removeEventListener('mousemove', this.$options.onPointerMove)
      }
      if (this.$options.onPointerUp) {
        document.removeEventListener('mouseup', this.$options.onPointerUp)
      }
      this.dragging = false
      this.$options.onPointerMove = null
      this.$options.onPointerUp = null
    },
    seek(event) {
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width)
      const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height)
      const metrics = this.readMetrics()
      const targetLeft = (x / rect.width) * metrics.scrollWidth - metrics.viewportWidth / 2
      const targetTop = (y / rect.height) * metrics.scrollHeight - metrics.viewportHeight / 2
      window.scrollTo({
        left: Math.min(Math.max(targetLeft, 0), metrics.scrollWidth - metrics.viewportWidth),
        top: Math.min(Math.max(targetTop, 0), metrics.scrollHeight - metrics.viewportHeight),
        behavior: 'auto'
      })
    }
  }
}
</script>
