<template><div style="display:none"></div></template>
<script setup>
import { onMounted, onUnmounted } from 'vue'

const DARK_NODE_FILLS = [
  '#1e1b4b',
  '#1a1a3e',
  '#2d1b3c',
  '#1b2a3c',
  '#3c1b2a',
]

function fixMermaidNodeFills() {
  if (!document.documentElement.classList.contains('dark')) return
  document.querySelectorAll('.mermaid svg').forEach((svg) => {
    let idx = 0
    svg.querySelectorAll('.node > rect').forEach((rect) => {
      rect.style.setProperty('fill', DARK_NODE_FILLS[idx % DARK_NODE_FILLS.length], 'important')
      idx++
    })
  })
}

let observer = null

onMounted(() => {
  fixMermaidNodeFills()
  observer = new MutationObserver(() => setTimeout(fixMermaidNodeFills, 100))
  observer.observe(document.body, { childList: true, subtree: true })
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>
