<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Formulas, getFormula } from '@/data/formula'
import { LabActions, type ILabAction } from '@/data/labs'
import { Items, getItem } from '@/data/items'
import { usePackStore } from '@/stores/modules/pack'
import { useProductionStore } from '@/stores/modules/production'
import { useTaskStore } from '@/stores/modules/task'
import Icon from '@/components/Icon.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import ProductionConditionEditor from '@/components/ProductionConditionEditor.vue'
import { Techs } from '@/data/techs'

const props = defineProps<{
  visible: boolean
  initialStep?: any
  index?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const packStore = usePackStore()
const productionStore = useProductionStore()
const taskStore = useTaskStore()

const selectedFormulaKey = ref('')
const batches = ref(1)

// 选择的配置
const selectedContainer = ref('')
const selectedMaterials = ref<Record<number, string>>({})
const selectedFireSource = ref('')
const fuelMap = ref<Record<string, number>>({})
const selectedBattery = ref('')
const selectedChainOps = ref<string[]>([])

// 循环条件支持
const loopUntil = ref(false)
const targetItem = ref('')
const targetCount = ref(0)
const conditionType = ref<'ge' | 'le'>('ge')

let isLoading = false

// 监听并填充
watch(() => props.visible, (val) => {
  if (val && props.initialStep) {
    isLoading = true
    const s = props.initialStep
    selectedFormulaKey.value = s.key
    batches.value = s.count || 1
    if (s.condition) {
      loopUntil.value = s.condition.loopUntil || false
      targetItem.value = s.condition.key
      targetCount.value = s.condition.value
      conditionType.value = s.condition.operator === '>=' ? 'ge' : 'le'
    }

    // 从 meta 恢复具体选择
    if (s.payload?.meta) {
      const meta = s.payload.meta
      selectedContainer.value = meta.selectedContainer || ''
      selectedMaterials.value = meta.selectedMaterials ? { ...meta.selectedMaterials } : {}
      selectedFireSource.value = meta.selectedFireSource || ''
      fuelMap.value = meta.fuelMap ? { ...meta.fuelMap } : {}
      selectedBattery.value = meta.selectedBattery || ''
      selectedChainOps.value = meta.selectedChainOps ? [...meta.selectedChainOps] : []
    }
    setTimeout(() => { isLoading = false }, 0)
  } else if (val) {
    isLoading = false
    selectedFormulaKey.value = ''
    batches.value = 1
    loopUntil.value = false
    selectedMaterials.value = {}
    selectedChainOps.value = []
    fuelMap.value = {}
  }
})

const allItems = computed(() => {
  return Array.from(packStore.discoveredItems)
    .map(key => {
      const qty = packStore.getItemQuantity(key)
      const dur = packStore.getTotalDurability(key)
      const item = getItem(key)
      let label = packStore.getDisplayName(key)
      if (qty > 0 || dur > 0) {
        label += ` (${qty}${item?.durable ? ', 耐: ' + dur.toFixed(1) : ''})`
      }
      return {
        value: key,
        label
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'))
})

const provenFormulas = computed(() => {
  return Formulas.filter(f => packStore.provenFormulas.includes(f.key))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .map(f => ({
      label: f.name,
      value: f.key
    }))
})

const currentFormula = computed(() => getFormula(selectedFormulaKey.value))

watch(selectedFormulaKey, () => {
  if (isLoading) return
  handleFormulaChange()
})

const currentOperation = computed(() => {
  if (!currentFormula.value?.required_actions) return null
  return LabActions.find(a => a.key === currentFormula.value?.required_actions?.key)
})

function getReqOptions(req: any) {
  const keys = Array.isArray(req.key) ? req.key : [req.key]
  return keys.map((k: string) => {
    const qty = packStore.getItemQuantity(k)
    const dur = packStore.getTotalDurability(k)
    const item = getItem(k)
    let label = packStore.getDisplayName(k)
    if (qty > 0 || dur > 0) {
      label += ` (${qty}${item?.durable ? ', 耐: ' + dur.toFixed(1) : ''})`
    }
    return { value: k, label }
  })
}

/** 获取当前配方产物中实际需要的追加操作 */
const neededChainOps = computed(() => {
  if (!currentFormula.value) return []
  
  // 获取配方产物中所有需要的追加操作 Key
  const formulaOps = new Set(
    currentFormula.value.products
      .map(p => p.required_chain_operation)
      .filter(Boolean)
  )

  return LabActions.filter(a => {
    if (!a.is_chain) return false
    
    // 只显示本配方产物能够使用的追加操作
    if (!formulaOps.has(a.key)) return false

    // 检查科技
    if (a.required_techs && !a.required_techs.every(t => packStore.hasTech(t))) return false
    
    // 检查所需物品 (同步 FormulaDialog 逻辑，但使用预期库存)
    if (a.required_item) {
      if (!a.required_item.every(req => {
        const keys = Array.isArray(req.key) ? req.key : [req.key]
        return keys.some(k => (taskStore.projectedInventory.get(k) || 0) > 0)
      })) return false
    }
    
    return true
  }) as ILabAction[]
})

// 数据过滤助手
const allContainers = computed(() => {
  const base = Items.filter(i => i.type.includes('container'))
    .filter(i => {
      if (currentFormula.value?.required_container) {
        return i.key === currentFormula.value?.required_container
      }
      return true
    })
  return base.map(c => ({
    key: c.key,
    name: `${c.name} (持有: ${packStore.getItemQuantity(c.key)}, 耐久: ${packStore.getTotalDurability(c.key).toFixed(1)})`
  }))
})

const allFireSources = computed(() => {
  return Items.filter(i => i.type.includes('fire_source'))
    .map(f => ({
      key: f.key,
      name: `${f.name} (持有: ${packStore.getItemQuantity(f.key)}, 耐久: ${packStore.getTotalDurability(f.key).toFixed(1)})`
    }))
})

const allFuels = computed(() => Items.filter(i => (i.attrs as any)?.burn_time > 0))

const allBatteries = computed(() => {
  return Items.filter(i => i.type.includes('tool') && i.key.includes('battery'))
    .map(b => ({
      key: b.key,
      name: `${b.name} (持有: ${packStore.getItemQuantity(b.key)}, 耐久: ${packStore.getTotalDurability(b.key).toFixed(1)})`
    }))
})

function getItemName(key: string) {
  return getItem(key)?.name || key
}

function handleFormulaChange() {
  selectedMaterials.value = {}
  selectedChainOps.value = []
  fuelMap.value = {}
  
  if (!currentFormula.value) return

  // 初始化材料
  currentFormula.value.required_items.forEach((req, idx) => {
    selectedMaterials.value[idx] = Array.isArray(req.key) ? req.key[0] : req.key
  })

  // 默认容器
  if (currentFormula.value.required_container) {
    selectedContainer.value = currentFormula.value.required_container
  } else {
    selectedContainer.value = allContainers.value[0]?.key || ''
  }

  // 默认火源
  selectedFireSource.value = allFireSources.value[0]?.key || ''
  
  // 默认电池
  if (currentOperation.value?.requires_electricity) {
    selectedBattery.value = allBatteries.value.find(b => b.key.includes('lead_acid'))?.key || allBatteries.value[0]?.key || ''
  }

  // 默认目标设置为主要的产物
  const mainProduct = currentFormula.value.products[0]?.key
  if (mainProduct) {
    targetItem.value = mainProduct
    targetCount.value = packStore.getItemQuantity(mainProduct) + 10
  }
}

// 自动填满燃料 (可选功能)
function autoFillFuel() {
  if (!currentFormula.value || !currentOperation.value) return
  const neededUnit = currentOperation.value.time_required || currentFormula.value.time_required
  const totalNeeded = neededUnit * batches.value
  
  fuelMap.value = {}
  let currentTotal = 0
  
  // 按燃烧效率排序
  const sortedFuels = [...allFuels.value]
  
  for (const fuel of sortedFuels) {
    if (currentTotal >= totalNeeded) break
    const burnTime = (fuel.attrs as any).burn_time
    const count = Math.ceil((totalNeeded - currentTotal) / burnTime)
    fuelMap.value[fuel.key] = count
    currentTotal += count * burnTime
  }
}

const totalBurnTime = computed(() => {
  let total = 0
  for (const [key, qty] of Object.entries(fuelMap.value)) {
    const fuel = getItem(key)
    if (fuel && (fuel.attrs as any)?.burn_time) {
      total += (fuel.attrs as any).burn_time * qty
    }
  }
  return total
})

const neededBurnTime = computed(() => {
  if (!currentFormula.value || !currentOperation.value) return 0
  const base = currentOperation.value.time_required || currentFormula.value.time_required
  return base * batches.value
})

/** 判断某个 Reactant 是否为催化剂 */
function isReactantCatalyst(index: number): boolean {
  if (!currentFormula.value) return false
  const key = selectedMaterials.value[index]
  if (!key) return false
  const req = currentFormula.value.required_items[index]
  return (currentFormula.value.products || []).some(p => {
    if (p.required_chain_operation && !selectedChainOps.value.includes(p.required_chain_operation)) return false
    return p.key === key && p.multiple === req.quantity
  })
}

/** 判断某个 Product 是否为催化剂 */
function isProductCatalyst(productKey: string, multiple: number): boolean {
  if (!currentFormula.value) return false
  return (currentFormula.value.required_items || []).some((req, i) => {
    return selectedMaterials.value[i] === productKey && req.quantity === multiple
  })
}

function handleAdd() {
  if (!currentFormula.value || !currentOperation.value) return

  const formula = currentFormula.value
  const operation = currentOperation.value

  // 解析选中的材料（每轮消耗量）
  // 催化剂在生产线中依然按每轮消耗/产出 1 次来计算，最终 getNetRequirements 会抵消
  const consumedMaterials = (formula.required_items || []).map((m, idx) => {
    const key = selectedMaterials.value[idx] || (Array.isArray(m.key) ? m.key[0] : m.key)
    return { key, quantity: m.quantity }
  })

  // 解析选中的燃料（每轮均摊量）
  const consumedFuels = Object.entries(fuelMap.value)
    .filter(([_, qty]) => qty > 0)
    .map(([key, qty]) => ({ key, quantity: qty / batches.value }))

  // 追加操作的额外材料消耗
  const chainOpRequirements: { key: string; quantity: number; use?: number }[] = []
  selectedChainOps.value.forEach(opKey => {
    const op = LabActions.find(a => a.key === opKey)
    if (op?.required_item) {
      op.required_item.forEach(req => {
        // 这里的 req 可能是数组（可选），生产线中选取第一个作为代表或按逻辑选取
        const key = Array.isArray(req.key) ? req.key[0] : req.key
        chainOpRequirements.push({ key, quantity: req.quantity, use: req.use })
      })
    }
  })

  // 过滤奖励
  const filteredRewards = (formula.products || []).filter(p => {
    if (p.required_chain_operation && !selectedChainOps.value.includes(p.required_chain_operation)) {
      return false
    }
    if (p.required_item) {
      const requiredSeeds = Array.isArray(p.required_item) ? p.required_item : [p.required_item]
      const hasSeed = consumedMaterials.some(m => requiredSeeds.includes(m.key))
      if (!hasSeed) return false
    }
    return true
  }).map(p => ({
    key: p.key,
    quantity: p.multiple
  }))

  const milestones: string[] = []
  if (operation.milestone) milestones.push(operation.milestone)
  selectedChainOps.value.forEach(k => {
    const cm = LabActions.find(a => a.key === k)?.milestone
    if (cm) milestones.push(cm)
  })

  // 容器耐久消耗
  let containerUse = 0.05
  for (const req of (operation.required_item || [])) {
    const reqKeys = Array.isArray(req.key) ? req.key : [req.key]
    if (reqKeys.includes(selectedContainer.value) && req.use) {
      containerUse = req.use
      break
    }
  }

  // 计算总耗时（含追加操作）
  let totalTime = formula.time_required
  selectedChainOps.value.forEach(k => {
    const op = LabActions.find(a => a.key === k)
    if (op) totalTime += op.time_required
  })

  const payload = {
    name: `${formula.name}${selectedChainOps.value.map(k => ' → ' + (LabActions.find(a => a.key === k)?.name || k)).join('')}`,
    key: formula.key,
    description: formula.name,
    time_required: totalTime,
    rewards: filteredRewards,
    required_items: [
      { key: selectedContainer.value, quantity: 1, use: containerUse },
      ...consumedMaterials,
      ...consumedFuels,
      ...chainOpRequirements,
      ...(selectedFireSource.value ? [{ key: selectedFireSource.value, quantity: 0, use: 0.01 }] : []),
      ...(selectedBattery.value ? [{ key: selectedBattery.value, quantity: 0, use: formula.power_consumption || 0.1 }] : []),
    ],
    formulaKey: formula.key,
    milestones,
    // 保存原始选择以便编辑
    meta: {
      selectedContainer: selectedContainer.value,
      selectedMaterials: { ...selectedMaterials.value },
      selectedFireSource: selectedFireSource.value,
      fuelMap: { ...fuelMap.value },
      selectedBattery: selectedBattery.value,
      selectedChainOps: [...selectedChainOps.value]
    }
  }

  const condition = (loopUntil.value && targetItem.value) ? {
    key: targetItem.value,
    value: targetCount.value,
    operator: (conditionType.value === 'ge' ? '>=' : '<=') as '>=' | '<=',
    loopUntil: true
  } : props.initialStep?.condition

  const stepData = {
    type: 'formula' as const,
    key: formula.key,
    name: formula.name,
    payload,
    condition,
    count: batches.value
  }

  if (props.index !== undefined && props.index !== null && props.index >= 0) {
    productionStore.updateStepInDraft(props.index, stepData)
  } else {
    productionStore.addStepToDraft(stepData, batches.value)
  }

  emit('close')
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg flex items-center gap-2 mb-4">
          <Icon icon="fluent:beaker-16-filled" class="text-secondary" />
          {{ index !== undefined ? '编辑配方步骤' : '配置配方步骤' }}
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 左侧：基础配置 -->
          <div class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">选择已知配方</span></label>
              <SearchableSelect
                v-model="selectedFormulaKey"
                :options="provenFormulas"
                placeholder="-- 请选择配方 --"
                size="sm"
              />
            </div>

            <div v-if="currentFormula" class="space-y-4 pt-2">
              <div class="form-control">
                <label class="label"><span class="label-text">执行批量次数</span></label>
                <input v-model.number="batches" type="number" min="1" :disabled="loopUntil" class="input input-bordered w-full" />
                
                <!-- 循环条件 -->
                <ProductionConditionEditor
                  v-model:loopUntil="loopUntil"
                  v-model:targetItem="targetItem"
                  v-model:targetCount="targetCount"
                  v-model:conditionType="conditionType"
                  :allItems="allItems"
                />
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text">材料选择</span></label>
                <div v-for="(req, idx) in currentFormula.required_items" :key="idx" class="space-y-1 mb-2">
                  <div class="flex justify-between items-center text-[10px] opacity-60">
                    <div class="flex items-center gap-1">
                      <span>{{ req.isMain ? '主材料' : '消耗品' }} (每轮 x{{ req.quantity }})</span>
                      <span v-if="isReactantCatalyst(idx)" class="badge badge-outline badge-xs text-secondary border-secondary/30 scale-90">催化剂</span>
                    </div>
                    <span :class="packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) >= req.quantity * (isReactantCatalyst(idx) ? 1 : batches) ? 'text-success' : 'text-error'">
                      持有: {{ packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) }}/{{ req.quantity * (isReactantCatalyst(idx) ? 1 : batches) }}
                    </span>
                  </div>
                  <template v-if="Array.isArray(req.key)">
                    <SearchableSelect
                      v-model="selectedMaterials[idx]"
                      :options="getReqOptions(req)"
                      placeholder="选择材料"
                      size="sm"
                    />
                  </template>
                  <div v-else class="text-xs font-bold pl-1 flex justify-between">
                    <span>{{ getItemName(req.key) }}</span>
                    <span v-if="getItem(req.key)?.durable" class="bg-base-300 px-1 rounded font-normal scale-90">
                      耐久: {{ packStore.getTotalDurability(req.key).toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧：环境配置 -->
          <div v-if="currentFormula" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">容器</span></label>
              <select v-model="selectedContainer" class="select select-bordered w-full">
                <option v-for="c in allContainers" :key="c.key" :value="c.key">
                  {{ c.name }} (持有: {{ packStore.getItemQuantity(c.key) }}, 耐久: {{ packStore.getTotalDurability(c.key).toFixed(1) }})
                </option>
              </select>
            </div>

            <!-- 燃烧配置 -->
            <div v-if="currentOperation?.requires_burning" class="bg-base-200 p-3 rounded-xl space-y-3">
              <div class="text-xs font-bold opacity-50 uppercase">燃烧设置</div>
              <div class="form-control">
                <label class="label"><span class="label-text-alt text-[10px]">火源 (耐久: {{ packStore.getTotalDurability(selectedFireSource).toFixed(1) }})</span></label>
                <select v-model="selectedFireSource" class="select select-bordered select-xs w-full">
                  <option v-for="f in allFireSources" :key="f.key" :value="f.key">
                    {{ f.name }} (持有: {{ packStore.getItemQuantity(f.key) }}, 耐久: {{ packStore.getTotalDurability(f.key).toFixed(1) }})
                  </option>
                </select>
              </div>
              <div class="form-control">
                <div class="flex justify-between items-center mb-1">
                  <label class="label-text-alt text-[10px]">燃料 (需要 {{ neededBurnTime }}s / 已选 {{ totalBurnTime }}s)</label>
                  <button @click="autoFillFuel" class="btn btn-ghost btn-xs text-primary">自动填充</button>
                </div>
                <div class="max-h-34 overflow-y-auto space-y-1">
                  <div v-for="f in allFuels" :key="f.key" class="flex flex-col text-[10px] bg-base-100 p-1 rounded">
                    <div class="flex justify-between items-center">
                      <span>{{ f.name }}</span>
                      <span :class="packStore.getItemQuantity(f.key) > 0 ? 'opacity-60' : 'text-error'">持有: {{ packStore.getItemQuantity(f.key) }}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                      <span class="opacity-40 italic">焚烧: {{ (f.attrs as any)?.burn_time }}s</span>
                      <input v-model.number="fuelMap[f.key]" type="number" min="0" class="input input-xs input-bordered w-12 text-center" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 电力配置 -->
            <div v-if="currentOperation?.requires_electricity" class="form-control">
              <label class="label"><span class="label-text">电池/电源 (耐久: {{ packStore.getTotalDurability(selectedBattery).toFixed(1) }})</span></label>
              <select v-model="selectedBattery" class="select select-bordered w-full">
                <option v-for="b in allBatteries" :key="b.key" :value="b.key">
                  {{ b.name }} (持有: {{ packStore.getItemQuantity(b.key) }}, 耐久: {{ packStore.getTotalDurability(b.key).toFixed(1) }})
                </option>
              </select>
            </div>

            <!-- 追加操作 -->
            <div v-if="neededChainOps.length > 0" class="form-control">
              <label class="label"><span class="label-text">后置/追加操作</span></label>
              <div class="flex flex-wrap gap-2">
                <label v-for="op in neededChainOps" :key="op.key" class="label cursor-pointer gap-2 bg-base-200 px-2 py-1 rounded-lg">
                  <input type="checkbox" :value="op.key" v-model="selectedChainOps" class="checkbox checkbox-xs" />
                  <span class="label-text text-xs">{{ op.name }}</span>
                </label>
              </div>
            </div>

            <!-- 产物预览 -->
            <div class="form-control">
              <label class="label"><span class="label-text">产物预览</span></label>
              <div class="flex flex-wrap gap-2 p-2 bg-base-300/30 rounded-xl min-h-12">
                <div v-for="p in currentFormula.products.filter(p => !p.required_chain_operation || selectedChainOps.includes(p.required_chain_operation))" :key="p.key"
                     class="flex items-center gap-1.5 bg-base-100 px-2 py-1 rounded-lg border border-base-300 text-xs">
                  <span class="opacity-70">{{ getItemName(p.key) }}</span>
                  <span class="text-secondary font-mono font-bold">x{{ p.multiple * batches }}</span>
                  <span v-if="isProductCatalyst(p.key, p.multiple)" class="badge badge-outline badge-xs text-secondary/50 scale-[0.8]">催化</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="close">取消</button>
          <button class="btn btn-secondary" :disabled="!selectedFormulaKey || (currentOperation?.requires_burning && totalBurnTime < neededBurnTime)" @click="handleAdd">
            {{ index !== undefined ? '保存修改' : '确认添加' }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="close"></div>
    </div>
  </Teleport>
</template>
