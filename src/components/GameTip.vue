<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { tips } from '@/data/tips'
import { useStateStore } from '@/stores/modules/state'
import { Eras } from '@/data/eras'

const stateStore = useStateStore()

const availableTips = computed(() => {
  const currentEra = Eras.find(e => e.key === stateStore.currentEra?.key)
  const currentEraOrder = currentEra?.order ?? 0
  return tips.filter(t => {
    if (!t.era) return true
    const requiredEra = Eras.find(e => e.key === t.era)
    return requiredEra ? requiredEra.order <= currentEraOrder : true
  })
})

const currentTipIndex = ref(Math.floor(Math.random() * availableTips.value.length))
let intervalId: ReturnType<typeof setInterval> | null = null

function updateTip() {
  if (availableTips.value.length === 0) return
  currentTipIndex.value = (currentTipIndex.value + 1) % availableTips.value.length
}

function startRotating() {
  stopRotating()
  if (availableTips.value.length === 0) return
  
  // 根据内容长度动态计算切换时间，最小 4s，最大 8s
  const currentTip = availableTips.value[currentTipIndex.value]?.content || ''
  const duration = Math.min(Math.max(currentTip.length * 200, 4000), 8000)
  
  intervalId = setTimeout(() => {
    updateTip()
    startRotating()
  }, duration)
}

function stopRotating() {
  if (intervalId) {
    clearTimeout(intervalId)
    intervalId = null
  }
}

onMounted(() => {
  startRotating()
})

onUnmounted(() => {
  stopRotating()
})
</script>

<template>
  <div class="game-tip flex flex-col items-center gap-2 p-4 bg-base-300/30 rounded-xl border border-base-content/5">
    <div class="flex items-center gap-2 text-xs font-bold text-primary/70 uppercase tracking-widest">
      <Icon icon="tabler:bulb" class="text-sm" />
      小贴士
    </div>
    <Transition name="tip-fade" mode="out-in">
      <p :key="currentTipIndex" class="text-xs text-center leading-relaxed opacity-80 max-w-[280px]">
        {{ availableTips[currentTipIndex]?.content }}
      </p>
    </Transition>
  </div>
</template>

<style scoped>
.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: all 0.5s ease;
}

.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
