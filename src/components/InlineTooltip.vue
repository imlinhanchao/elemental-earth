<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ text: string }>()

const show = ref(false)
const style = ref({ top: '0px', left: '0px' })
const el = ref<HTMLSpanElement | null>(null)

function onMouseEnter(e: MouseEvent) {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  style.value = {
    top: `${rect.bottom + 6}px`,
    left: `${Math.max(rect.left + rect.width / 2, 10)}px`,
  }
  show.value = true
}
function onMouseLeave() { 
  show.value = false 
}
</script>

<template>
  <span class="inline-tooltip-trigger" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" ref="el">
    <slot />
    <Teleport to="body">
      <div v-if="show" class="fixed-tooltip bg-base-100 text-base-content/60" :style="style">
        <slot name="text">{{ text }}</slot>
      </div>
    </Teleport>
  </span>
</template>

<style scoped>
.inline-tooltip-trigger {
  display: inline;
  cursor: pointer;
}
.fixed-tooltip {
  position: fixed;
  z-index: 99999;
  font-size: 12px;
  line-height: 1.5;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: normal;
  word-break: break-word;
  max-width: 280px;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
/* 向上的小三角 */
.fixed-tooltip::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 10%;
  border: 5px solid transparent;
  border-bottom-color: var(--color-base-100);
}
</style>
