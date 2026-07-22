<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStateStore } from '@/stores/modules/state'

const emit = defineEmits<{
  (e: 'select', mapKey: string): void
  (e: 'close'): void
}>()

const stateStore = useStateStore()
const modalRef = ref<HTMLDialogElement | null>(null)

onMounted(() => {
  modalRef.value?.showModal()
})

function selectMap(targetKey: string) {
  if (targetKey === stateStore.state.map) return
  emit('select', targetKey)
}

function close() {
  emit('close')
}

function onBackdropClick(e: MouseEvent) {
  // daisyUI 模态：点击背景关闭
  if (e.target === modalRef.value) {
    close()
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return ''
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}秒`
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`
}
</script>
<template>
  <dialog ref="modalRef" class="modal" @click="onBackdropClick">
    <div class="modal-box max-w-lg">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">选择地图</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="close">
          <Icon icon="tabler:x" class="text-xl" />
        </button>
      </div>

      <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <button
          v-for="map in stateStore.availableMaps"
          :key="map.key"
          class="w-full text-left p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors flex items-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
          :class="{ 'border-primary bg-primary/5': map.key === stateStore.state.map }"
          :disabled="map.key === stateStore.state.map"
          @click="selectMap(map.key)"
        >
          <Icon :icon="map.icon || 'tabler:map-filled'" class="text-2xl shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="font-medium flex items-center gap-2">
              {{ map.name }}
              <span v-if="map.key === stateStore.state.map" class="badge badge-sm badge-ghost">当前</span>
            </div>
            <div class="text-xs text-base-content/60 truncate">{{ map.description }}</div>
          </div>
          <div class="text-xs text-base-content/50 shrink-0 text-right">
            <div v-if="map.key !== stateStore.state.map">
              <div>耗时</div>
              <div class="font-mono">{{ formatDuration(stateStore.calcSwitchDuration(stateStore.state.map, map.key)) }}</div>
            </div>
          </div>
        </button>
      </div>

      <div class="modal-action">
        <form method="dialog">
          <button class="btn" type="button" @click="close">取消</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
