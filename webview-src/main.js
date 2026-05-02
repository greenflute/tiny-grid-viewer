import { createApp } from 'vue'
import './css/app.css'

import App from './App.vue'
import GridCell from './components/GridCell'
import GridObjectTable from './components/GridObjectTable'
import GridArrayTable from './components/GridArrayTable'
import ResizableTable from './components/ResizableTable'
import GridMinimap from './components/GridMinimap'

const app = createApp(App)
app.component('GridCell', GridCell)
app.component('GridObjectTable', GridObjectTable)
app.component('GridArrayTable', GridArrayTable)
app.component('ResizableTable', ResizableTable)
app.component('GridMinimap', GridMinimap)
app.mount('#app')
