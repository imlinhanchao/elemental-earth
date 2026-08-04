<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import { useTaskStore } from '@/stores/modules/task'

const emit = defineEmits<{
  (e: 'select', mapKey: string): void
  (e: 'close'): void
}>()

const stateStore = useStateStore()
const taskStore = useTaskStore()
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

function mapTaskSummary(mapKey: string): string {
  const list = taskStore.tasksMap[mapKey] || []
  if (!list || list.length === 0) return ''
  const names = list.map(t => t.name || t.key || '任务')
  const max = 3
  const out = names.slice(0, max).join('、')
  return names.length > max ? out + '...' : out
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
          class="w-full group text-left rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-colors flex flex-col items-center disabled:opacity-40 disabled:cursor-not-allowed"
          :class="{ 'border-primary bg-primary/5': map.key === stateStore.state.map }"
          :disabled="map.key === stateStore.state.map"
          @click="selectMap(map.key)"
        >
          <section class="flex items-center gap-3 p-3">
            <Icon :icon="map.icon || 'tabler:map-filled'" class="text-2xl shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="font-medium flex items-center gap-2">
                {{ map.name }}
                <span v-if="map.key === stateStore.state.map" class="badge badge-sm badge-ghost">当前</span>
              </div>
              <div class="text-xs text-base-content/60 truncate">
                {{ map.description }}
              </div>
            </div>
            <div class="text-xs text-base-content/50 shrink-0 text-right">
              <div v-if="map.key !== stateStore.state.map">
                <div>耗时</div>
                <div class="font-mono">{{ formatDuration(stateStore.calcSwitchDuration(stateStore.state.map, map.key)) }}</div>
              </div>
            </div>
          </section>
          <div 
            v-if="mapTaskSummary(map.key)" 
            class="text-[9px] text-base-content/50 border-t border-dashed border-base-300 group-hover:border-primary truncate w-full py-1 px-3 rounded-b-lg"
          >
            <span>队列：</span>{{ mapTaskSummary(map.key) }}
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
