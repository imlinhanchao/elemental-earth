<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Formulas } from '@/data/formula'
import { LabActions, type ILabAction } from '@/data/labs'
import { Items } from '@/data/items'
import { usePackStore } from '@/stores/modules/pack'
import { useProductionStore } from '@/stores/modules/production'
import Icon from '@/components/Icon.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const packStore = usePackStore()
const productionStore = useProductionStore()

const selectedFormulaKey = ref('')
const batches = ref(1)

// 选择的配置
const selectedContainer = ref('')
const selectedMaterials = ref<Record<number, string>>({})
const selectedFireSource = ref('')
const fuelMap = ref<Record<string, number>>({})
const selectedBattery = ref('')
const selectedChainOps = ref<string[]>([])

const provenFormulas = computed(() => {
  return Formulas.filter(f => packStore.provenFormulas.includes(f.key))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
})

const currentFormula = computed(() => Formulas.find(f => f.key === selectedFormulaKey.value))

watch(selectedFormulaKey, () => {
  handleFormulaChange()
})

const currentOperation = computed(() => {
  if (!currentFormula.value?.required_actions) return null
  return LabActions.find(a => a.key === currentFormula.value?.required_actions?.key)
})

// 数据过滤助手
const allContainers = computed(() => {
  const base = Items.filter(i => i.type.includes('container'))
  if (currentFormula.value?.required_container) {
    return base.filter(i => i.key === currentFormula.value?.required_container)
  }
  return base
})
const allFireSources = computed(() => Items.filter(i => i.type.includes('fire_source')))
const allFuels = computed(() => Items.filter(i => (i.attrs as any)?.burn_time > 0))
const allBatteries = computed(() => Items.filter(i => i.type.includes('tool') && i.key.includes('battery')))

const availableChainOps = computed(() => {
  if (!currentOperation.value?.chain_operations) return []
  return currentOperation.value.chain_operations
    .map(key => LabActions.find(a => a.key === key))
    .filter(Boolean) as ILabAction[]
})

function getItemName(key: string) {
  return Items.find(i => i.key === key)?.name || key
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
    const fuel = Items.find(i => i.key === key)
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

function handleAdd() {
  if (!currentFormula.value || !currentOperation.value) return

  const formula = currentFormula.value
  const operation = currentOperation.value

  // 解析选中的材料（每轮消耗量）
  const consumedMaterials = (formula.required_items || []).map((m, idx) => {
    const key = selectedMaterials.value[idx] || (Array.isArray(m.key) ? m.key[0] : m.key)
    return { key, quantity: m.quantity }
  })

  // 解析选中的燃料（每轮均摊量）
  // 注意：燃料总量 / 总循环次数 = 每轮平均耗量
  const consumedFuels = Object.entries(fuelMap.value)
    .filter(([_, qty]) => qty > 0)
    .map(([key, qty]) => ({ key, quantity: qty / batches.value }))

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
    quantity: p.multiple // 生产线每轮执行 1 次，奖励量为多倍率
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

  const payload = {
    name: formula.name,
    key: formula.key,
    description: formula.name,
    time_required: formula.time_required,
    rewards: filteredRewards,
    required_items: [
      { key: selectedContainer.value, quantity: 1, use: containerUse },
      ...consumedMaterials,
      ...consumedFuels,
      ...(selectedFireSource.value ? [{ key: selectedFireSource.value, quantity: 0, use: 0.01 }] : []),
      ...(selectedBattery.value ? [{ key: selectedBattery.value, quantity: 0, use: formula.power_consumption || 0.1 }] : []),
    ],
    formulaKey: formula.key,
    milestones
  }

  productionStore.addStepToDraft({
    type: 'formula',
    key: formula.key,
    name: formula.name,
    payload
  }, batches.value)

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
          配置配方步骤
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
                <label class="label"><span class="label-text">执行循环次数</span></label>
                <input v-model.number="batches" type="number" min="1" class="input input-bordered w-full" />
              </div>

              <div class="form-control">
                <label class="label"><span class="label-text">材料选择</span></label>
                <div v-for="(req, idx) in currentFormula.required_items" :key="idx" class="space-y-1 mb-2">
                  <div class="flex justify-between items-center text-[10px] opacity-60">
                    <span>{{ req.isMain ? '主材料' : '消耗品' }} (每轮 x{{ req.quantity }})</span>
                    <span :class="packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) >= req.quantity * batches ? 'text-success' : 'text-error'">
                      持有: {{ packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) }}/{{ req.quantity * batches }}
                    </span>
                  </div>
                  <template v-if="Array.isArray(req.key)">
                    <select v-model="selectedMaterials[idx]" class="select select-bordered select-sm w-full">
                      <option v-for="k in req.key" :key="k" :value="k">
                        {{ getItemName(k) }} (持有: {{ packStore.getItemQuantity(k) }}{{ Items.find(i=>i.key===k)?.durable ? ', 耐久: ' + packStore.getTotalDurability(k).toFixed(1) : '' }})
                      </option>
                    </select>
                  </template>
                  <div v-else class="text-xs font-bold pl-1 flex justify-between">
                    <span>{{ getItemName(req.key) }}</span>
                    <span v-if="Items.find(i => i.key === req.key)?.durable" class="bg-base-300 px-1 rounded font-normal scale-90">
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
            <div v-if="availableChainOps.length > 0" class="form-control">
              <label class="label"><span class="label-text">追加链式操作</span></label>
              <div class="flex flex-wrap gap-2">
                <label v-for="op in availableChainOps" :key="op.key" class="label cursor-pointer gap-2 bg-base-200 px-2 py-1 rounded-lg">
                  <input type="checkbox" :value="op.key" v-model="selectedChainOps" class="checkbox checkbox-xs" />
                  <span class="label-text text-xs">{{ op.name }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="close">取消</button>
          <button class="btn btn-secondary" :disabled="!selectedFormulaKey || (currentOperation?.requires_burning && totalBurnTime < neededBurnTime)" @click="handleAdd">
            确认添加
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="close"></div>
    </div>
  </Teleport>
</template>
