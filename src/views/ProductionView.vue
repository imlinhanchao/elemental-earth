<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductionStore, type IProductionLineStep } from '@/stores/modules/production'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { Maps } from '@/data/maps'
import { Items } from '@/data/items'
import Icon from '@/components/Icon.vue'
import { useToastStore } from '@/stores/modules/toast'
import ProductionActionModal from '@/components/ProductionActionModal.vue'
import ProductionFormulaModal from '@/components/ProductionFormulaModal.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'

const productionStore = useProductionStore()
const stateStore = useStateStore()
const packStore = usePackStore()
const taskStore = useTaskStore()
const toastStore = useToastStore()

const newName = ref('')
const selectedCycles = ref(1)
const importCode = ref('')

const showActionModal = ref(false)
const showFormulaModal = ref(false)
const showLineModal = ref(false)
const showConditionModal = ref(false)

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

const draftNetRequirements = computed(() => {
  return productionStore.getNetRequirements(productionStore.draftSteps, 1)
})

function handleCopy(id: string) {
  const code = productionStore.exportLine(id)
  navigator.clipboard.writeText(code).then(() => {
    toastStore.addToast('生产线代码已复制到剪贴板', 'success')
  })
}

function handleImport() {
  if (!importCode.value) return
  const res = productionStore.importLine(importCode.value.trim())
  if (res.success) {
    newName.value = res.message
    importCode.value = ''
    toastStore.addToast('已将代码导入到草稿', 'success')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    // 强制显示错误消息
    toastStore.addToast(res.message, 'error')
  }
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

function handleEdit(line: any) {
  productionStore.editProductionLine(line)
  if (!newName.value) {
    newName.value = line.name
  }
  // Scroll to draft areas
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleSaveDraft() {
  if (!newName.value || productionStore.draftSteps.length === 0) return
  productionStore.saveProductionLine(newName.value)
  newName.value = ''
}

function handleExecute(id: string) {
  productionStore.executeProductionLine(id, selectedCycles.value)
}

function getMapName(key: string) {
  return Maps.find(m => m.key === key)?.name || key
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
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="bg-base-200/50 px-6 py-4 border-b border-base-300 flex justify-between items-center">
        <h2 class="font-bold flex items-center gap-2">
          <Icon icon="fluent:edit-16-filled" />
          当前设计草稿
        </h2>
        <div class="flex items-center gap-2">
          <button @click="showActionModal = true" class="btn btn-xs btn-primary gap-1">
            <Icon icon="fluent:add-16-filled" />
            行动
          </button>
          <button @click="showFormulaModal = true" class="btn btn-xs btn-secondary gap-1">
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
                    <span>条件: {{ packStore.getDisplayName(step.condition.key) }} {{ step.condition.operator }} {{ step.condition.value }}</span>
                    <span v-if="step.condition.loopUntil" class="badge badge-warning badge-xs scale-[0.8] origin-left">循环</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-1">
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
                   class="badge badge-sm gap-1.5 py-2.5 transition-colors"
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
          <input v-model="importCode" type="text" placeholder="在此粘贴分享代码 (EAPv1:...)" class="input input-sm grow" />
          <button @click="handleImport" class="btn btn-sm btn-primary px-4" :disabled="!importCode">
            导入到草稿
          </button>
        </div>
      </div>
    </div>

    <!-- 已保存的生产线 -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold flex items-center gap-2 px-2">
        <Icon icon="fluent:bookmark-multiple-16-filled" class="text-primary" />
        已配置生产线
      </h2>
      
      <div v-if="productionStore.productionLines.length === 0" class="card bg-base-100 border border-dashed border-base-300 p-12 text-center text-base-content/40 text-sm">
        暂无保存的生产线
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="line in productionStore.productionLines" :key="line.id" 
             class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all">
          <div class="card-body p-5">
            <div class="flex justify-between items-start mb-3">
              <h3 class="card-title text-lg font-bold flex items-center gap-2 truncate">
                <Icon icon="fluent:factory-16-regular" class="text-primary" />
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

            <!-- 需求展示 (已创建产线) -->
            <div class="mb-4">
              <div class="collapse collapse-arrow bg-base-200/50 rounded-xl border border-base-300">
                <input type="checkbox" />
                <div class="collapse-title py-2 px-4 min-h-0 text-[11px] font-bold opacity-60 flex justify-between items-center pr-10">
                  <span>预估总量物料清单 (循环 {{ selectedCycles }} 次)</span>
                  <span class="text-primary font-mono font-bold">总耗时: {{ getActualTime(productionStore.getTotalTime(line.steps, selectedCycles)) }}s</span>
                </div>
                <div class="collapse-content px-4 pb-3">
                  <div class="flex flex-wrap gap-1.5 pt-2">
                    <template v-for="(req, key) in productionStore.getNetRequirements(line.steps, selectedCycles)" :key="key">
                      <div class="flex items-center gap-1 bg-base-100 px-2 py-0.5 rounded border border-base-300 text-[10px] transition-colors"
                           :class="isInsufficient(key as string, req) ? 'text-error border-error/50 bg-error/5' : ''">
                        <span>{{ req.name }}</span>
                        <span class="font-mono font-bold" :class="isInsufficient(key as string, req) ? '' : 'text-primary'">
                          {{ req.quantity > 0 ? '×' + req.quantity : '' }}
                          {{ req.totalUse > 0 ? '(耐' + req.totalUse.toFixed(2) + ')' : '' }}
                        </span>
                        <Icon v-if="isInsufficient(key as string, req)" icon="fluent:warning-12-filled" />
                      </div>
                    </template>
                    <div v-if="Object.keys(productionStore.getNetRequirements(line.steps, selectedCycles)).length === 0" class="text-[10px] opacity-40 italic">
                      无净物料需求
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 步骤展示 (缩减版) -->
            <div class="text-[10px] space-y-1 mb-3 opacity-60">
              <div v-for="(step, idx) in productionStore.collapseSteps(line.steps).slice(0, 3)" :key="idx" class="flex items-center gap-1.5">
                <Icon :icon="step.type === 'action' ? 'fluent:puzzle-cube-16-filled' : 'fluent:beaker-16-filled'" 
                      class="text-[10px]" :class="step.type === 'action' ? 'text-primary' : 'text-secondary'" />
                <span class="truncate">{{ step.name }}</span>
                <span v-if="step.count > 1" class="text-primary font-bold">x{{ step.count }}</span>
              </div>
              <div v-if="productionStore.collapseSteps(line.steps).length > 3" class="pl-4 italic">等 {{ productionStore.collapseSteps(line.steps).length }} 个步骤...</div>
            </div>

            <!-- 地图适配警示 -->
            <div v-if="!productionStore.validateMapCompatibility(line).ok" class="alert alert-soft alert-warning p-2 mb-4 rounded-xl text-[10px] leading-tight">
              <Icon icon="fluent:warning-16-filled" class="shrink-0" />
              <span>当前地图 {{ getMapName(stateStore.state.map) }} 条件不符</span>
            </div>

            <div class="card-actions flex-nowrap items-center gap-2 border-t border-base-200 pt-4">
              <div class="join grow">
                <span class="join-item btn btn-sm no-animation bg-base-200 border-base-300 font-normal">循环</span>
                <input v-model.number="selectedCycles" type="number" min="1" max="100" class="join-item input input-sm w-full text-center border-base-300" />
              </div>
              <button @click="handleExecute(line.id)" class="btn btn-sm btn-primary px-6"
                      :disabled="!productionStore.validateMapCompatibility(line).ok || taskStore.tasks.length >= 100">
                <Icon icon="fluent:play-16-filled" />
                启动
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

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
      @close="showActionModal = false" 
    />
    <ProductionFormulaModal 
      :visible="showFormulaModal" 
      @close="showFormulaModal = false"
    />

    <!-- 嵌套生产线选择 -->
    <dialog v-if="showLineModal" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
          <Icon icon="fluent:factory-16-filled" class="text-accent" />
          选择嵌套生产线
        </h3>
        
        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div v-for="line in productionStore.productionLines.filter(l => l.id !== productionStore.currentEditingId)" :key="line.id" 
               @click="productionStore.addStepToDraft({ type: 'line', key: line.id, name: line.name }, 1); showLineModal = false"
               class="p-3 border border-base-300 rounded-xl hover:bg-base-200 cursor-pointer flex justify-between items-center transition-colors">
            <div>
              <div class="font-medium text-sm">{{ line.name }}</div>
              <div class="text-[10px] opacity-40">{{ line.steps.length }} 个内部步骤</div>
            </div>
            <Icon icon="fluent:add-12-filled" class="opacity-30" />
          </div>
          <div v-if="productionStore.productionLines.filter(l => l.id !== productionStore.currentEditingId).length === 0" class="text-center py-6 text-base-content/40 text-xs">
            暂无其他生产线
          </div>
        </div>

        <div class="modal-action">
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
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
            <Icon icon="fluent:flash-settings-20-filled" class="text-warning" />
            设置执行条件
          </h3>
          
          <div class="space-y-4">
            <div class="form-control">
              <span class="label text-xs opacity-60">条件触发物品 (例如：煤)</span>
              <SearchableSelect
                v-model="conditionInput.key"
                :options="Items.map(i => ({ label: i.name, value: i.key }))"
                placeholder="选择物品..."
              />
              <p v-if="conditionInput.key" class="text-xs opacity-50">
                持有 {{ packStore.getItemQuantity(conditionInput.key) }} 个
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="form-control">
                <span class="label text-xs opacity-60">比较方式</span>
                <select v-model="conditionInput.operator" class="select select-bordered w-full">
                  <option value=">">大于 (&gt;)</option>
                  <option value="<">小于 (&lt;)</option>
                  <option value=">=">大于等于 (&gt;=)</option>
                  <option value="<=">小于等于 (&lt;=)</option>
                  <option value="==">等于 (=)</option>
                  <option value="!=">不等于 (≠)</option>
                </select>
              </div>
              <div class="form-control">
                <span class="label text-xs opacity-60">数值 (背包数量)</span>
                <input v-model.number="conditionInput.value" type="number" class="input input-bordered w-full" />
              </div>
            </div>

            <div class="form-control bg-base-200/50 p-3 rounded-xl border border-base-300">
              <label class="label cursor-pointer py-0">
                <div class="space-y-0.5">
                  <span class="label-text font-bold">循环直到条件满足</span>
                  <div class="text-[10px] opacity-50">如果条件不满足，将持续添加任务直到满足或达到次数上限</div>
                </div>
                <input type="checkbox" v-model="conditionInput.loopUntil" class="toggle toggle-primary" />
              </label>
            </div>

            <p class="text-[10px] opacity-50 italic">
              * 满足上述条件时，该步骤才会被加入执行队列。如果不选择物品，则条件为空，表示总是执行。
            </p>
          </div>

          <div class="modal-action">
            <button @click="saveCondition" class="btn btn-primary">确定</button>
            <button @click="showConditionModal = false" class="btn">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.list-row:last-child {
  border-bottom: none;
}
</style>

