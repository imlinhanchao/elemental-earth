<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useProductionStore, type IProductionLineStep, type IImportConflictAction, type IProductionImportPreview } from '@/stores/modules/production'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { Items } from '@/data/items'
import Icon from '@/components/Icon.vue'
import { formatQty } from '@/utils/function'
import { useToastStore } from '@/stores/modules/toast'
import ProductionActionModal from '@/components/ProductionActionModal.vue'
import ProductionFormulaModal from '@/components/ProductionFormulaModal.vue'
import ProductionConditionEditor from '@/components/ProductionConditionEditor.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import ProductionLineList from '@/components/ProductionLineList.vue'

const productionStore = useProductionStore()
const packStore = usePackStore()
const taskStore = useTaskStore()
const toastStore = useToastStore()

const newName = ref('')
const selectedCycles = ref(1)
const importCode = ref('')
const showImportPreviewModal = ref(false)
const importPreview = ref<IProductionImportPreview | null>(null)
const conflictActions = ref<Record<string, IImportConflictAction>>({})
const importedHighlightIds = ref<string[]>([])
const importFlashToken = ref(0)
const importScrollToId = ref<string | null>(null)

const showActionModal = ref(false)
const showFormulaModal = ref(false)
const showLineModal = ref(false)
const lineModalSelectedKey = ref('')
const showConditionModal = ref(false)

const editingStep = ref<any>(null)
const editingIndex = ref<number | undefined>(undefined)

// Search for saved production lines handled by child component

function openActionModal(index?: number) {
  if (index !== undefined) {
    editingStep.value = productionStore.draftSteps[index]
    editingIndex.value = index
  } else {
    editingStep.value = null
    editingIndex.value = undefined
  }
  showActionModal.value = true
}

function openFormulaModal(index?: number) {
  if (index !== undefined) {
    editingStep.value = productionStore.draftSteps[index]
    editingIndex.value = index
  } else {
    editingStep.value = null
    editingIndex.value = undefined
  }
  showFormulaModal.value = true
}

function handleAddLineStep() {
  const line = productionStore.productionLines.find(l => l.id === lineModalSelectedKey.value)
  if (line) {
    productionStore.addStepToDraft({ type: 'line', key: line.id, name: line.name }, 1)
  }
  lineModalSelectedKey.value = ''
  showLineModal.value = false
}

// Drag and drop state
const draggedIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragEnd() {
  draggedIndex.value = null
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onDrop(index: number) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    productionStore.moveStepInDraft(draggedIndex.value, index)
  }
  draggedIndex.value = null
}

// Production lines drag-and-drop moved to child component

const editingConditionIndex = ref<number | null>(null)
const conditionInput = ref<NonNullable<IProductionLineStep['condition']>>({
  key: '',
  operator: '>' as any,
  value: 0,
  loopUntil: false
})

function openConditionModal(index: number) {
  editingConditionIndex.value = index
  const step = productionStore.draftSteps[index]
  if (step.condition) {
    conditionInput.value = { ...step.condition }
  } else {
    conditionInput.value = { key: '', operator: '>', value: 0, loopUntil: false }
  }
  showConditionModal.value = true
}

function saveCondition() {
  if (editingConditionIndex.value !== null) {
    const step = productionStore.draftSteps[editingConditionIndex.value]
    if (conditionInput.value.key) {
      step.condition = { ...conditionInput.value }
    } else {
      delete step.condition
    }
  }
  editingConditionIndex.value = null
  showConditionModal.value = false
}

const allItems = computed(() => {
  return Array.from(packStore.discoveredItems)
    .concat(Items.map(i => i.key)) // 包含未发现的基础物品以便配置
    .filter((v, i, a) => a.indexOf(v) === i) // 去重
    .map(key => {
      const qty = packStore.getItemQuantity(key)
      const dur = packStore.getTotalDurability(key)
      const item = Items.find(i => i.key === key)
      let label = packStore.getDisplayName(key)
      if (qty > 0 || dur > 0) {
        label += ` (${formatQty(qty)}${item?.durable ? ', 耐: ' + dur.toFixed(1) : ''})`
      }
      return {
        value: key,
        label
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
})

const draftNetRequirements = computed(() => {
  return productionStore.getNetRequirements(productionStore.draftSteps, 1)
})

const importWarningCount = computed(() => {
  if (!importPreview.value) return 0
  return importPreview.value.conflicts.filter(c => c.warning).length
})

function closeImportPreviewModal() {
  showImportPreviewModal.value = false
  importPreview.value = null
}

function handleImport() {
  if (!importCode.value) return
  const res = productionStore.previewImportLine(importCode.value.trim())
  if (!res.success || !res.preview) {
    toastStore.addToast(res.message, 'error')
    return
  }

  const actions: Record<string, IImportConflictAction> = {}
  for (const c of res.preview.conflicts) {
    actions[c.id] = 'keep'
  }

  conflictActions.value = actions
  importPreview.value = res.preview
  showImportPreviewModal.value = true
}

function confirmImport() {
  if (!importPreview.value) return

  const res = productionStore.applyImportLines(importPreview.value, {
    conflictActions: conflictActions.value
  })

  if (!res.success) {
    toastStore.addToast(res.message, 'error')
    return
  }

  showImportPreviewModal.value = false
  importCode.value = ''
  importPreview.value = null

  importedHighlightIds.value = [...res.importedIds]
  importFlashToken.value = Date.now()
  importScrollToId.value = res.rootId || null

  toastStore.addToast(res.message, 'success')
}

function isInsufficient(key: string, req: { quantity: number, totalUse: number, isDurable: boolean }) {
  const projectedQty = taskStore.projectedInventory.get(key) || 0;
  const projectedDur = taskStore.projectedDurability.get(key) || 0;

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

const editRef = ref<HTMLElement | null>(null)
function handleEdit(line: any) {
  productionStore.editProductionLine(line)
  newName.value = line.name
  // Scroll to draft areas
  editRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function handleSaveDraft() {
  if (!newName.value || productionStore.draftSteps.length === 0) return

  const editingId = productionStore.currentEditingId || null
  const beforeIds = new Set(productionStore.productionLines.map(l => l.id))

  productionStore.saveProductionLine(newName.value)

  let targetId = editingId
  if (!targetId) {
    const added = productionStore.productionLines.find(l => !beforeIds.has(l.id))
    targetId = added?.id || productionStore.productionLines[productionStore.productionLines.length - 1]?.id || null
  }

  if (targetId) {
    importedHighlightIds.value = [targetId]
    importFlashToken.value = Date.now()
    importScrollToId.value = null
    await nextTick()
    importScrollToId.value = targetId
  }

  newName.value = ''
}
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6 pb-24">
    <!-- 头部说明 -->
    <header>
      <h1 class="text-xl font-bold flex items-center gap-2">
        <Icon icon="icon-park-outline:robot-two" class="text-2xl" />
        自动化生产线
      </h1>
      <p class="text-xs text-base-content/60">组合已完成的行动与配方，实现大规模自动化执行。</p>
    </header>

    <!-- 正在编辑的草稿 -->
    <div ref="editRef" class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="bg-base-200/50 px-6 py-4 border-b border-base-300 flex justify-between items-center">
        <h2 class="font-bold flex items-center gap-2">
          <Icon icon="fluent:edit-16-filled" />
          当前设计草稿
        </h2>
        <div class="flex items-center gap-2">
          <button @click="openActionModal()" class="btn btn-xs btn-primary gap-1">
            <Icon icon="fluent:add-16-filled" />
            行动
          </button>
          <button @click="openFormulaModal()" class="btn btn-xs btn-secondary gap-1">
            <Icon icon="fluent:add-16-filled" />
            配方
          </button>
          <button @click="showLineModal = true" class="btn btn-xs btn-accent gap-1">
            <Icon icon="fluent:add-16-filled" />
            嵌套
          </button>
          <span class="badge badge-sm badge-neutral" v-if="productionStore.draftSteps.length > 0">
            {{ productionStore.draftSteps.length }}
          </span>
        </div>
      </div>
      
      <div class="p-6">
        <div v-if="productionStore.draftSteps.length === 0" class="text-center py-10 lg:py-12 text-base-content/40 space-y-3">
          <Icon icon="fluent:box-20-regular" class="text-5xl opacity-20" />
          <div class="space-y-1">
            <p class="text-sm">尚未添加任何步骤</p>
            <p class="text-[10px] opacity-70">添加行动、配方或嵌套现有的生产线</p>
          </div>
        </div>

        <div v-else class="space-y-4">
            <!-- 步骤列表 -->
            <ul class="list bg-base-200/30 rounded-box border border-base-300 divide-y divide-base-300">
              <li v-for="(step, idx) in productionStore.draftSteps" :key="idx" 
                  class="list-row items-center p-3 cursor-move active:bg-base-300 transition-colors"
                  draggable="true"
                  @dragstart="onDragStart(idx, $event)"
                  @dragend="onDragEnd"
                  @dragover="onDragOver($event)"
                  @drop="onDrop(idx)">
                <div class="text-base-content/30 font-mono w-8 text-center text-xs flex flex-col items-center">
                  <Icon icon="fluent:re-order-16-regular" class="opacity-50" />
                  <span>{{ idx + 1 }}</span>
                </div>
                <div class="list-col-grow">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <Icon :icon="step.type === 'action' ? 'fluent:puzzle-cube-16-filled' : (step.type === 'formula' ? 'fluent:beaker-16-filled' : 'fluent:factory-16-filled')" 
                            :class="step.type === 'action' ? 'text-primary' : (step.type === 'formula' ? 'text-secondary' : 'text-accent')" />
                      <span class="font-medium text-sm">{{ step.name }}</span>
                      <span v-if="step.count > 1" class="text-primary font-bold text-xs ml-1">x{{ step.count }}</span>
                      <span class="text-[10px] opacity-50 px-1 bg-base-300 rounded ml-1">
                        {{ step.type === 'action' ? '行动' : (step.type === 'formula' ? '实验室' : '生产线') }}
                      </span>
                    </div>
                    <!-- Condition Display -->
                    <div v-if="step.condition" class="flex items-center gap-1 text-[10px] opacity-60">
                      <Icon icon="fluent:flash-16-regular" class="text-warning" />
                      <span>执行条件: {{ packStore.getDisplayName(step.condition.key) }} {{ step.condition.operator }} {{ step.condition.value }}</span>
                      <span v-if="step.condition.loopUntil" class="badge badge-warning badge-xs scale-[0.8] origin-left">循环模式</span>
                    </div>
                  </div>
                </div>
              <div class="flex gap-1">
                <button v-if="step.type !== 'line'" 
                        @click="step.type === 'action' ? openActionModal(idx) : openFormulaModal(idx)" 
                        class="btn btn-ghost btn-sm btn-square tooltip" data-tip="编辑步骤">
                  <Icon icon="fluent:edit-16-regular" class="text-primary" />
                </button>
                <button @click="openConditionModal(idx)" class="btn btn-ghost btn-sm btn-square tooltip" data-tip="设置执行条件">
                  <Icon icon="fluent:flash-settings-20-filled" :class="step.condition ? 'text-warning' : 'text-base-content/30'" />
                </button>
                <div class="join">
                  <button @click="step.count = Math.max(1, step.count - 1)" class="btn btn-ghost btn-xs join-item">-</button>
                  <input v-model.number="step.count" type="number" class="w-10 text-center bg-transparent text-xs font-mono join-item" min="1" />
                  <button @click="step.count++" class="btn btn-ghost btn-xs join-item">+</button>
                </div>
                <button @click="productionStore.removeStepFromDraft(idx)" class="btn btn-ghost btn-sm text-error btn-square">
                  <Icon icon="fluent:delete-16-regular" />
                </button>
              </div>
            </li>
          </ul>

          <!-- 合计需求 -->
          <div v-if="Object.keys(draftNetRequirements).length > 0" class="bg-base-300/30 rounded-xl p-3 border border-base-300/50">
            <div class="text-[10px] uppercase tracking-wider font-bold opacity-40 mb-2 flex justify-between">
              <span>预估单次循环净需求 (含容器/能源)</span>
              <span class="text-primary">预计耗时: {{ getActualTime(productionStore.getTotalTime(productionStore.draftSteps)) }}秒</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <div v-for="(req, key) in draftNetRequirements" :key="key" 
                   class="badge badge-sm gap-1.5 py-2.5 transition-colors tooltip"
                   :data-tip="`持有: ${formatQty(packStore.getItemQuantity(key as string))} (耐久: ${packStore.getTotalDurability(key as string).toFixed(1)})`"
                   :class="isInsufficient(key as string, req) ? 'badge-error text-error-content' : 'badge-neutral'">
                <span class="opacity-70">{{ req.name }}</span>
                <span class="font-mono font-bold">
                  {{ req.quantity > 0 ? '×' + req.quantity : '' }}
                  {{ req.totalUse > 0 ? '(耐' + req.totalUse.toFixed(2) + ')' : '' }}
                </span>
                <Icon v-if="isInsufficient(key as string, req)" icon="fluent:warning-12-filled" class="text-[10px]" />
              </div>
            </div>
          </div>

          <!-- 保存表单 -->
          <div class="flex flex-col sm:flex-row gap-3 items-end pt-4">
            <label class="floating-label grow w-full">
              <input v-model="newName" type="text" placeholder="生产线名称" class="input w-full" />
              <span>生产线名称 (例如: 粗制硝酸工厂)</span>
            </label>
            <div class="flex gap-2 w-full sm:w-auto">
              <button @click="handleSaveDraft" class="btn btn-primary grow sm:grow-0" :disabled="!newName">
                <Icon icon="fluent:save-16-filled" />
                保存
              </button>
              <button @click="productionStore.clearDraft()" class="btn btn-ghost text-error">
                <Icon icon="fluent:dismiss-16-regular" />
                清空
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入区域 -->
    <div class="card bg-base-100 border border-base-300 shadow-sm">
      <div class="card-body p-5">
        <h3 class="font-bold text-sm flex items-center gap-2 mb-3">
          <Icon icon="fluent:share-16-filled" class="text-primary" />
          导入生产线
        </h3>
        <div class="flex gap-2">
          <input v-model="importCode" type="text" placeholder="在此粘贴分享代码 (EAPv2:... / EAPv1:...)" class="input input-sm grow" />
          <button @click="handleImport" class="btn btn-sm btn-primary px-4" :disabled="!importCode">
            预览并导入
          </button>
        </div>
      </div>
    </div>

    <!-- 已保存的生产线 -->
    <ProductionLineList
      v-model:selectedCycles="selectedCycles"
      :highlight-ids="importedHighlightIds"
      :flash-token="importFlashToken"
      :scroll-to-id="importScrollToId"
      @edit-line="handleEdit"
    />

    <!-- 提示区 -->
    <div class="alert alert-soft p-4 rounded-2xl flex items-start gap-4">
      <Icon icon="fluent:info-16-filled" class="text-info text-xl shrink-0 mt-1" />
      <div class="text-sm space-y-1">
        <p class="font-bold">生产线规则：</p>
        <ul class="list-disc list-inside opacity-70 text-[11px] lg:text-xs">
          <li>单条生产线步骤组合上限为 20。</li>
          <li>启动后，所有任务将按顺序加入待办队列。</li>
          <li>若中间某个任务因材料短缺无法完成，后续任务将继续尝试。</li>
          <li>行动类步骤会严格检查当前地图是否支持（部分行动仅限特定地图）。</li>
        </ul>
      </div>
    </div>

    <!-- 弹窗 -->
    <ProductionActionModal 
      :visible="showActionModal" 
      :initialStep="editingStep"
      :index="editingIndex"
      @close="showActionModal = false" 
    />
    <ProductionFormulaModal 
      :visible="showFormulaModal" 
      :initialStep="editingStep"
      :index="editingIndex"
      @close="showFormulaModal = false"
    />

    <!-- 嵌套生产线选择 -->
    <dialog v-if="showLineModal" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <Icon icon="fluent:factory-16-filled" class="text-accent" />
          选择嵌套生产线
        </h3>
        
        <div class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">搜索并选择生产线</span></label>
            <SearchableSelect
              v-model="lineModalSelectedKey"
              :options="productionStore.productionLines
                .filter(l => l.id !== productionStore.currentEditingId)
                .map(l => ({ label: l.name, value: l.id }))"
              placeholder="选择生产线..."
              append-to-body
            />
          </div>

          <div v-if="lineModalSelectedKey" class="bg-base-200 p-3 rounded-xl border border-base-300 text-xs text-base-content/60">
            已选择: {{ productionStore.productionLines.find(l => l.id === lineModalSelectedKey)?.name }}
          </div>
          
          <div v-if="productionStore.productionLines.filter(l => l.id !== productionStore.currentEditingId).length === 0" class="text-center py-6 text-base-content/40 text-xs">
            暂无其它的生产线可用
          </div>
        </div>

        <div class="modal-action">
          <button @click="handleAddLineStep" class="btn btn-primary" :disabled="!lineModalSelectedKey">确认添加</button>
          <button @click="showLineModal = false" class="btn">取消</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showLineModal = false">
        <button>close</button>
      </form>
    </dialog>

    <!-- 执行条件设置对话框 -->
    <Teleport to="body">
      <div v-if="showConditionModal" class="modal modal-open">
        <div class="modal-box max-w-sm">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <Icon icon="fluent:flash-settings-20-filled" class="text-warning" />
            配置步骤执行条件
          </h3>
          <p class="text-xs opacity-50 mb-4 font-bold">针对特定资源的库存量进行判断</p>
          
          <div class="space-y-4">
            <ProductionConditionEditor
              v-model:loopUntil="conditionInput.loopUntil"
              v-model:targetItem="conditionInput.key"
              v-model:targetCount="conditionInput.value"
              v-model:conditionType="conditionInput.operator"
              :allItems="allItems"
              mode="pre"
            />

            <div class="px-2">
              <p class="text-[10px] opacity-50 italic">
                * 满足上述条件时，该步骤才会被加入执行队列。如果不选择物品，则表示总是执行。
              </p>
            </div>
          </div>

          <div class="modal-action">
            <button @click="saveCondition" class="btn btn-warning btn-sm px-6">应用条件</button>
            <button @click="showConditionModal = false" class="btn btn-ghost btn-sm">取消</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 导入预览对话框 -->
    <Teleport to="body">
      <dialog v-if="showImportPreviewModal && importPreview" class="modal modal-open">
        <div class="modal-box max-w-3xl">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2">
            <Icon icon="fluent:document-checkmark-20-filled" class="text-primary" />
            导入生产线预览
          </h3>
          <p class="text-xs text-base-content/60 mb-3">
            顶级生产线：<span class="font-bold">{{ importPreview.rootName }}</span>
            <span class="ml-2">共 {{ importPreview.lines.length }} 条{{ importPreview.hasNested ? '（含嵌套）' : '' }}</span>
          </p>

          <div class="alert" :class="importWarningCount > 0 ? 'alert-warning alert-soft' : 'alert-success alert-soft'" role="alert">
            <Icon :icon="importWarningCount > 0 ? 'fluent:warning-16-filled' : 'fluent:checkmark-circle-16-filled'" />
            <span class="text-xs">
              {{ importWarningCount > 0 ? `发现 ${importWarningCount} 条 ID 冲突且内容/名称不一致，请确认处理方式。` : '未发现需要警告的冲突，可直接导入。' }}
            </span>
          </div>

          <div class="max-h-[58vh] overflow-y-auto mt-3 border border-base-300 rounded-xl">
            <ul class="list divide-y divide-base-300 bg-base-100">
              <li v-for="item in importPreview.items" :key="item.id" class="list-row p-2.5">
                <div class="list-col-grow space-y-1" :style="{ paddingLeft: `${item.depth * 14}px` }">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="badge badge-xs" :class="item.depth === 0 ? 'badge-primary' : 'badge-neutral'">
                      {{ item.depth === 0 ? '顶级' : `子级 ${item.depth}` }}
                    </span>
                    <span class="font-bold text-sm">{{ item.name }}</span>
                    <span class="text-[10px] opacity-60 font-mono">{{ item.id }}</span>
                    <span class="text-[10px] opacity-50">{{ item.stepCount }} 步</span>
                  </div>

                  <div v-if="item.conflict" class="text-[11px]">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="badge badge-xs" :class="item.conflict.warning ? 'badge-warning' : 'badge-success'">
                        {{ item.conflict.warning ? '冲突' : '一致' }}
                      </span>
                      <span>本地：{{ item.conflict.existingName }}</span>
                      <span :class="item.conflict.sameName ? 'text-success' : 'text-warning'">名称{{ item.conflict.sameName ? '一致' : '不一致' }}</span>
                      <span :class="item.conflict.sameContent ? 'text-success' : 'text-warning'">内容{{ item.conflict.sameContent ? '一致' : '不一致' }}</span>
                    </div>

                    <div v-if="item.conflict.warning" class="mt-1 flex items-center gap-2">
                      <span class="text-[10px] opacity-70">冲突处理：</span>
                      <select v-model="conflictActions[item.id]" class="select select-xs">
                        <option value="keep">不处理（覆盖同 ID）</option>
                        <option value="reset">重置 ID（创建新产线）</option>
                      </select>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <div class="modal-action mt-4">
            <button @click="confirmImport" class="btn btn-primary btn-sm">确认导入</button>
            <button @click="closeImportPreviewModal" class="btn btn-ghost btn-sm">取消</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop" @click="closeImportPreviewModal">
          <button>close</button>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.list-row:last-child {
  border-bottom: none;
}
</style>

