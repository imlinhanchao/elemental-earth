<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import Icon from '@/components/Icon.vue'
import { useProductionStore, type IProductionLine } from '@/stores/modules/production'
import { Maps } from '@/data/maps'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { useToastStore } from '@/stores/modules/toast'

const props = defineProps<{
  selectedCycles: number
  highlightIds?: string[]
  flashToken?: number
  scrollToId?: string | null
}>()
const emit = defineEmits<{
  'update:selectedCycles': [value: number]
  'editLine': [line: IProductionLine]
}>()

const productionStore = useProductionStore()
const stateStore = useStateStore()
const packStore = usePackStore()
const taskStore = useTaskStore()
const toastStore = useToastStore()

const lineSearch = ref('')
const draggedLineIndex = ref<number | null>(null)
const selectedCyclesLocal = ref(props.selectedCycles || 1)
const flashingIds = ref<string[]>([])
const cardRefMap = new Map<string, HTMLElement>()
let flashTimer: ReturnType<typeof setTimeout> | null = null

function onLineDragStart(index: number, event: DragEvent) {
  draggedLineIndex.value = index
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function onLineDragEnd() { draggedLineIndex.value = null }
function onLineDragOver(event: DragEvent) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move' }
function onLineDrop(index: number) {
  if (draggedLineIndex.value !== null && draggedLineIndex.value !== index) {
    productionStore.moveProductionLine(draggedLineIndex.value, index)
  }
  draggedLineIndex.value = null
}

const filteredProductionLines = computed(() => {
  const q = lineSearch.value.trim().toLowerCase()
  return productionStore.productionLines
    .map((l, i) => ({ line: l, index: i }))
    .filter(({ line }) => {
      if (!q) return true
      return (line.name || '').toLowerCase().includes(q) || line.id.toLowerCase().includes(q)
    })
})

function handleCopy(id: string) {
  const code = productionStore.exportLine(id)
  navigator.clipboard.writeText(code).then(() => {
    toastStore.addToast('生产线代码已复制到剪贴板', 'success')
  })
}

function handleEdit(line: any) {
  emit('editLine', line)
}

function isInsufficient(key: string, req: { quantity: number, totalUse: number, isDurable: boolean }) {
  const projectedQty = taskStore.projectedInventory.get(key) || 0
  const projectedDur = taskStore.projectedDurability.get(key) || 0

  if (req.isDurable && req.totalUse > 0) {
    if (projectedDur < req.totalUse) return true
  }
  if (req.quantity > 0 && projectedQty < req.quantity) return true
  return false
}

function getActualTime(t: number) {
  const actual = t * taskStore.timeMultiplier
  return actual < 1 ? actual.toFixed(1) : Math.round(actual)
}

function handleExecute(id: string) {
  productionStore.executeProductionLine(id, selectedCyclesLocal.value)
}

function updateCycles(v: number) {
  const next = Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1
  selectedCyclesLocal.value = next
  emit('update:selectedCycles', next)
}

function setCardRef(id: string, el: unknown) {
  if (!el || !(el instanceof HTMLElement)) {
    cardRefMap.delete(id)
    return
  }
  cardRefMap.set(id, el)
}

watch(() => props.selectedCycles, (v) => {
  selectedCyclesLocal.value = Math.max(1, Number(v || 1))
})

watch(
  () => [props.flashToken, (props.highlightIds || []).join('|')],
  async () => {
    const ids = props.highlightIds || []
    if (!ids.length) return
    await nextTick()
    flashingIds.value = [...ids]
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flashingIds.value = []
      flashTimer = null
    }, 1200)
  }
)

watch(() => props.scrollToId, async (id) => {
  if (!id) return
  lineSearch.value = ''
  await nextTick()
  cardRefMap.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

onBeforeUnmount(() => {
  if (flashTimer) clearTimeout(flashTimer)
})
</script>

<template>
  <div class="space-y-3">
    <h2 class="text-lg font-semibold flex items-center gap-2 px-1">
      <Icon icon="fluent:bookmark-multiple-16-filled" class="text-primary text-base" />
      已配置生产线
    </h2>

    <div class="flex items-center gap-2">
      <input v-model="lineSearch" type="text" placeholder="搜索生产线 (名称或ID)" class="input input-sm grow" />
      <button v-if="lineSearch" @click="lineSearch = ''" class="btn btn-sm btn-ghost">清除</button>
    </div>

    <div v-if="productionStore.productionLines.length === 0" class="card bg-base-100 border border-dashed border-base-300 p-6 text-center text-base-content/40 text-sm">
      暂无保存的生产线
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
       <div v-for="({ line, index } , idx) in filteredProductionLines" :key="line.id"
         :ref="(el) => setCardRef(line.id, el)"
           draggable="true"
           @dragstart="onLineDragStart(index, $event)"
           @dragend="onLineDragEnd"
           @dragover="onLineDragOver($event)"
           @drop="onLineDrop(index)"
         :class="[
           'card bg-base-100 border border-base-300 shadow-sm transition-all',
           (draggedLineIndex === index) ? 'opacity-50' : '',
           flashingIds.includes(line.id) ? 'import-flash' : ''
         ]">
        <div class="card-body p-3">
          <div class="flex justify-between items-start mb-1">
            <h3 class="card-title text-sm font-medium truncate flex items-center gap-2">
              <Icon icon="lsicon:drag-outline" class="text-primary text-base" />
              {{ line.name }}
            </h3>
            <div class="flex gap-1">
              <button @click="handleCopy(line.id)" class="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-primary tooltip" data-tip="复制分享代码">
                <Icon icon="fluent:copy-16-regular" />
              </button>
              <button @click="handleEdit(line)" class="btn btn-ghost btn-xs btn-square text-primary/60 hover:text-primary tooltip" data-tip="编辑">
                <Icon icon="fluent:edit-12-regular" />
              </button>
              <button @click="productionStore.removeProductionLine(line.id)" class="btn btn-ghost btn-xs btn-square text-error/60 hover:text-error">
                <Icon icon="fluent:delete-12-regular" />
              </button>
            </div>
          </div>

          <div class="mb-2">
            <div class="collapse collapse-arrow bg-base-200/40 rounded-lg border border-base-300">
              <input type="checkbox" />
              <div class="collapse-title py-1 px-3 min-h-0 text-[11px] font-bold opacity-70 flex justify-between items-center pr-8">
                <span>物料清单 (循环 {{ selectedCyclesLocal }})</span>
                <span class="text-primary font-mono text-xs">耗时: {{ getActualTime(productionStore.getTotalTime(line.steps, selectedCyclesLocal)) }}s</span>
              </div>
              <div class="collapse-content px-3 pb-2">
                <div class="flex flex-wrap gap-1.5 pt-2">
                  <template v-for="(req, key) in productionStore.getNetRequirements(line.steps, selectedCyclesLocal)" :key="key">
                    <div class="flex items-center gap-1 bg-base-100 px-2 py-0.5 rounded border border-base-300 text-[10px] transition-colors tooltip"
                         :class="isInsufficient(key as string, req) ? 'text-error border-error/50 bg-error/5' : ''"
                         :data-tip="`持有: ${packStore.getItemQuantity(key as string)} (耐久: ${packStore.getTotalDurability(key as string).toFixed(1)})`">
                      <span class="truncate">{{ req.name }}</span>
                      <span class="font-mono font-bold text-xs" :class="isInsufficient(key as string, req) ? '' : 'text-primary'">
                        {{ req.quantity > 0 ? '×' + req.quantity : '' }}
                        {{ req.totalUse > 0 ? '(耐' + req.totalUse.toFixed(2) + ')' : '' }}
                      </span>
                      <Icon v-if="isInsufficient(key as string, req)" icon="fluent:warning-12-filled" />
                    </div>
                  </template>
                  <div v-if="Object.keys(productionStore.getNetRequirements(line.steps, selectedCyclesLocal)).length === 0" class="text-[10px] opacity-40 italic">
                    无净物料需求
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-[10px] space-y-1 mb-2 opacity-60">
            <div v-for="(step, idx) in productionStore.collapseSteps(line.steps).slice(0, 3)" :key="idx" class="flex items-center gap-1.5">
              <Icon :icon="step.type === 'action' ? 'fluent:puzzle-cube-16-filled' : 'fluent:beaker-16-filled'" class="text-[10px]" :class="step.type === 'action' ? 'text-primary' : 'text-secondary'" />
              <span class="truncate">{{ step.name }}</span>
              <span v-if="step.count > 1" class="text-primary font-bold">x{{ step.count }}</span>
            </div>
            <div v-if="productionStore.collapseSteps(line.steps).length > 3" class="pl-4 italic">等 {{ productionStore.collapseSteps(line.steps).length }} 个步骤...</div>
          </div>

          <div v-if="!productionStore.validateMapCompatibility(line).ok" class="alert alert-soft alert-warning p-2 mb-2 rounded-lg text-[10px] leading-tight">
            <Icon icon="fluent:warning-16-filled" class="shrink-0" />
            <span>当前地图 {{ Maps.find(m => m.key === stateStore.state.map)?.name || stateStore.state.map }} 条件不符</span>
          </div>

          <div class="card-actions flex-nowrap items-center gap-2 border-t border-base-200 pt-2">
            <div class="join grow">
              <span class="join-item btn btn-xs no-animation bg-base-200 border-base-300 font-normal">循环</span>
              <input v-model.number="selectedCyclesLocal" @input="updateCycles(Number(selectedCyclesLocal))" type="number" min="1" max="100" class="join-item input input-xs w-full text-center border-base-300" />
            </div>
            <button @click="handleExecute(line.id)" class="btn btn-xs btn-primary px-3" :disabled="!productionStore.validateMapCompatibility(line).ok || taskStore.currentMapTasks.length >= 100">
              <Icon icon="fluent:play-16-filled" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-title { line-height: 1 }

@keyframes import-line-flash {
  0%, 100% {
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-primary) 0%, transparent);
    border-color: color-mix(in oklab, var(--color-base-300) 100%, transparent);
  }
  50% {
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-primary) 65%, transparent);
    border-color: color-mix(in oklab, var(--color-primary) 55%, var(--color-base-300));
  }
}

.import-flash {
  animation: import-line-flash 0.55s ease-in-out 2;
}
</style>
