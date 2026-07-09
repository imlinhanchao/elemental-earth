<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { useStateStore } from '@/stores/modules/state'
import { useLogStore } from '@/stores/modules/log'
import { useLabStore } from '@/stores/modules/lab'
import { getItem } from '@/data/items'
import { LabActions, type ILabAction } from '@/data/labs'
import { Formulas, type IFormula } from '@/data/formula'
import { Eras } from '@/data/eras'

const packStore = usePackStore()
const taskStore = useTaskStore()
const stateStore = useStateStore()
const logStore = useLogStore()
const labStore = useLabStore()

/** 将配方物品 key 统一为数组（单个字符串也视为数组） */
function reqKeys(key: string | string[]): string[] {
  return Array.isArray(key) ? key : [key]
}

/** 在 selectedMaterials 中查找满足某一项配方需求的物品 key */
function findMatchingMaterial(keys: string[], needQty: number): string | null {
  return keys.find(k => (labStore.selectedMaterials.get(k) || 0) >= needQty) || null
}

// ---- 用户选择 ----
const selectedContainerKey = computed({
  get: () => labStore.selectedContainerKey,
  set: (val) => labStore.selectedContainerKey = val
})
const selectedMaterials = computed({
  get: () => labStore.selectedMaterials,
  set: (val) => labStore.selectedMaterials = val
})
const selectedOperationKey = computed({
  get: () => labStore.selectedOperationKey,
  set: (val) => labStore.selectedOperationKey = val
})
const selectedChainOperationKey = ref<Set<string>>(new Set())
const selectedFireSourceKey = ref<string | null>(null)
const selectedPowerSourceKey = ref<string | null>(null)
const selectedFuels = ref<Map<string, number>>(new Map())
const cycles = ref(1)
const materialModalOpen = ref(false)
const materialSearchQuery = ref('')
const selectedCategory = ref<string | null>(null)

// 切换操作时重置引火/燃料/chain选择
watch(selectedOperationKey, () => {
  selectedFireSourceKey.value = null
  selectedPowerSourceKey.value = null
  selectedFuels.value = new Map()
  selectedChainOperationKey.value = new Set()
  cycles.value = 1
})

// ---- 材料弹窗中的临时选择 ----
const draftMaterials = ref<Map<string, number>>(new Map())

// ---- 可用容器 ----
const availableContainers = computed(() => {
  const map = new Map<string, typeof packStore.items[0]>()
  for (const pItem of packStore.items) {
    const def = getItem(pItem.key)
    if (!def?.type.includes('container')) continue
    const existing = map.get(pItem.key)
    if (!existing || pItem.durable > existing.durable) map.set(pItem.key, pItem)
  }
  return Array.from(map.values())
})

const availableMaterials = computed(() => {
  return packStore.items.filter(pItem => pItem.key !== selectedContainerKey.value)
})

const availableCategories = computed(() => {
  const cats = new Set<string>()
  availableMaterials.value.forEach(item => {
    const def = getItem(item.key)
    if (def?.category) cats.add(def.category)
  })
  return Array.from(cats).sort()
})

const filteredAvailableMaterials = computed(() => {
  let list = availableMaterials.value

  if (selectedCategory.value) {
    list = list.filter(item => {
      const def = getItem(item.key)
      return def?.category === selectedCategory.value
    })
  }

  const query = materialSearchQuery.value.toLowerCase().trim()
  if (query) {
    return list.filter(item => 
      item.name.toLowerCase().includes(query) || 
      item.key.toLowerCase().includes(query)
    )
  }
  return list
})

const selectedOperation = computed<ILabAction | null>(() => {
  if (!selectedOperationKey.value) return null
  return LabActions.find(a => a.key === selectedOperationKey.value) || null
})

const selectedContainerPack = computed(() => {
  if (!selectedContainerKey.value) return null
  // 自动选择耐久最高的实例
  const matches = packStore.items.filter(i => i.key === selectedContainerKey.value)
  if (matches.length === 0) return null
  return matches.reduce((best, cur) => cur.durable > best.durable ? cur : best)
})

// ---- 追加操作 ----
const selectedChainOperations = computed<ILabAction[]>(() => {
  return LabActions.filter(a => selectedChainOperationKey.value.has(a.key))
})

const availableChainOperations = computed(() => {
  const op = selectedOperation.value
  if (!op) return []
  // 所有操作都可作为追加操作，排除已选的主操作本身
  return LabActions.filter(a => a.key !== op.key)
})

/** 操作以及追加操作所需的容器/设备是否已满足 */
const operationRequirementMet = computed(() => {
  const ops = [selectedOperation.value, ...selectedChainOperations.value].filter(Boolean) as ILabAction[]
  if (ops.length === 0) return true
  
  for (const op of ops) {
    if (!op.required_item) continue
    for (const req of op.required_item) {
      const keys = reqKeys(req.key)
      
      // 1. 优先尝试从容器位匹配
      const isContainerMatched = selectedContainerKey.value && keys.includes(selectedContainerKey.value)
      if (isContainerMatched) {
        // 如果容器匹配，检查其耐久（仅当配方已验证且存在时，执行严格检查）
        if (matchedFormula.value && formulaProven.value) {
          const pack = selectedContainerPack.value
          if (!pack || pack.durable < (req.use ?? 1) * cycles.value) return false
        }
        continue
      }
      
      // 2. 容器不匹配，尝试从已选材料中匹配（针对非容器类设备，如集气瓶）
      const materialKey = keys.find(k => selectedMaterials.value.has(k))
      if (materialKey) {
        // 如果找到了匹配材料，检查数量是否满足单次需求
        if ((selectedMaterials.value.get(materialKey) || 0) < req.quantity) return false
        // 工具类耐久检查（配方已验证时）
        if (matchedFormula.value && formulaProven.value && req.use !== undefined) {
          const pack = packStore.items.find(i => i.key === materialKey)
          if (!pack || pack.durable < req.use * cycles.value) return false
        }
        continue
      }
      
      return false
    }
  }
  return true
})

/** 获取所有选中操作（主+追加）的所有设备/道具需求 */
const allOperationRequirements = computed(() => {
  const ops = [selectedOperation.value, ...selectedChainOperations.value].filter(Boolean) as ILabAction[]
  const allReqs: { key: string | string[]; quantity: number, use?: number }[] = []
  for (const op of ops) {
    if (op.required_item) {
      allReqs.push(...op.required_item)
    }
  }
  return allReqs
})

// ---- 材料弹窗 ----
function openMaterialModal() {
  draftMaterials.value = new Map(selectedMaterials.value)
  materialSearchQuery.value = ''
  selectedCategory.value = null
  materialModalOpen.value = true
}
function confirmMaterials() {
  selectedMaterials.value = new Map(draftMaterials.value)
  materialModalOpen.value = false
  materialSearchQuery.value = ''
}
function cancelMaterials() {
  draftMaterials.value = new Map(selectedMaterials.value)
  materialModalOpen.value = false
  materialSearchQuery.value = ''
}
function draftIncrement(itemKey: string) {
  const m = new Map(draftMaterials.value)
  m.set(itemKey, (m.get(itemKey) || 0) + 1)
  draftMaterials.value = m
}
function draftDecrement(itemKey: string) {
  const m = new Map(draftMaterials.value)
  const cur = m.get(itemKey) || 0
  if (cur <= 1) m.delete(itemKey)
  else m.set(itemKey, cur - 1)
  draftMaterials.value = m
}
function getDraftQty(itemKey: string): number {
  return draftMaterials.value.get(itemKey) || 0
}

function onDraftInput(e: Event, key: string, max: number) {
  const val = parseInt((e.target as HTMLInputElement).value) || 0
  const m = new Map(draftMaterials.value)
  const safeVal = Math.max(0, Math.min(val, max))
  if (safeVal === 0) m.delete(key)
  else m.set(key, safeVal)
  draftMaterials.value = m
}

const materialSummary = computed(() => {
  const entries = [...selectedMaterials.value.entries()]
  if (entries.length === 0) return '未选择'
  return entries.map(([k, q]) => {
    const def = getItem(k)
    return `${def?.name || k}×${q}`
  }).join('、')
})
const materialCount = computed(() => selectedMaterials.value.size)

// ---- 匹配配方 ----
const matchedFormula = computed<IFormula | null>(() => {
  const op = selectedOperation.value
  if (!op) return null
  
  const currentEraObj = Eras.find(e => e.key === stateStore.state.currentEra)
  const currentOrder = currentEraObj?.order ?? 0

  const matches = Formulas.filter(f => {
    // 时代限制
    if (f.required_era) {
      const targetEraObj = Eras.find(e => e.key === f.required_era)
      if (targetEraObj && targetEraObj.order > currentOrder) return false
    }

    if (f.required_actions && f.required_actions.key !== op.key) return false
    if (f.required_container && f.required_container !== selectedContainerKey.value) return false
    if (f.required_items) {
      for (const req of f.required_items) {
        if (!findMatchingMaterial(reqKeys(req.key), req.quantity)) return false
      }
    }
    if (f.required_techs && !f.required_techs.every(t => packStore.hasTech(t))) return false
    // min/max 次数检查
    const actMin = f.required_actions?.min ?? 1
    const actMax = f.required_actions?.max
    if (cycles.value < actMin) return false
    if (actMax && cycles.value > actMax) return false
    return true
  })

  if (matches.length === 0) return null
  // 优先匹配需求项更多的配方（更精确匹配，解决石灰石焙烧 vs 水泥制造的冲突）
  return matches.sort((a, b) => (b.required_items?.length || 0) - (a.required_items?.length || 0))[0]
})

const formulaProven = computed(() => {
  if (!matchedFormula.value) return false
  return packStore.hasProvenFormula(matchedFormula.value.key)
})

const formulaProducts = computed(() => {
  const f = matchedFormula.value
  if (!f) return []
  const chainOps = selectedChainOperationKey.value
  return f.products
    .filter(p => {
      const itemDef = getItem(p.key)
      if (!itemDef) return false
      // 需要特定追加操作才能收集的产物
      if (p.required_chain_operation) {
        return chainOps.has(p.required_chain_operation)
      }
      // 需要特定反应物才产生的产物
      if (p.required_item) {
        const reqKeys = Array.isArray(p.required_item) ? p.required_item : [p.required_item]
        const consumed = [...selectedMaterials.value.keys()]
        return reqKeys.some(k => consumed.includes(k))
      }
      // 气体：有追加操作时由追加操作决定
      if (itemDef.type.includes('gas')) {
        return chainOps.has('gas_collecting')
      }
      return true
    })
    .map(p => ({
      key: p.key,
      name: packStore.getDisplayName(p.key),
      quantity: p.multiple * batches.value,
    }))
})

/** 配方中是否含有气体产物 */
const hasGasProducts = computed(() => {
  const f = matchedFormula.value
  if (!f) return false
  return f.products.some(p => {
    const itemDef = getItem(p.key)
    return itemDef?.type.includes('gas')
  })
})

// ---- 批次数（每个配方的操作最小次数为一组） ----
const batchSize = computed(() => {
  if (!matchedFormula.value?.required_actions) return 1
  return matchedFormula.value.required_actions.min ?? 1
})

const batches = computed(() => {
  if (!matchedFormula.value || batchSize.value === 0) return 0
  return Math.floor(cycles.value / batchSize.value)
})

// ---- 燃烧系统 ----
const burningNeeded = computed(() => selectedOperation.value?.requires_burning ?? false)

const containerCanHeat = computed(() => {
  if (!selectedContainerKey.value) return false
  const def = getItem(selectedContainerKey.value)
  return def?.attrs?.can_heat === true
})

const fuelItems = computed(() => {
  return packStore.items.filter(pItem => {
    const def = getItem(pItem.key)
    return def && def.type.includes('fuel') && def.attrs?.burn_time
  })
})

const fireSourceItems = computed(() => {
  return packStore.items.filter(pItem => {
    const def = getItem(pItem.key)
    return def && def.type.includes('fire_source')
  })
})

// 选中的引火物数据
const selectedFireSourcePack = computed(() => {
  if (!selectedFireSourceKey.value) return null
  return packStore.items.find(i => i.key === selectedFireSourceKey.value) || null
})

// ---- 电力系统 ----
const electricityNeeded = computed(() => selectedOperation.value?.requires_electricity ?? false)

const powerSourceItems = computed(() => {
  return packStore.items.filter(pItem => {
    const def = getItem(pItem.key)
    return def && (def.key.includes('battery') || def.type.includes('tool')) && pItem.durable > 0
  })
})

const selectedPowerSourcePack = computed(() => {
  if (!selectedPowerSourceKey.value) return null
  return packStore.items.find(i => i.key === selectedPowerSourceKey.value) || null
})

// 最大周期：电源耐久限制
const maxCyclesByPower = computed(() => {
  if (!electricityNeeded.value || !selectedPowerSourcePack.value) return 0
  // 如果配方没有定义消耗，则假设默认消耗 0.1
  const consumption = matchedFormula.value?.power_consumption ?? 0.1
  return Math.floor(selectedPowerSourcePack.value.durable / consumption)
})

// 最大周期：引火物耐久限制
const maxCyclesByFire = computed(() => {
  if (!burningNeeded.value || !selectedFireSourcePack.value) return 0
  return Math.floor(selectedFireSourcePack.value.durable / 0.01)
})

// 最大周期：燃料总燃烧时间限制
const maxCyclesByFuel = computed(() => {
  if (!burningNeeded.value || !selectedOperation.value) return Infinity
  let totalBurn = 0
  for (const [key, qty] of selectedFuels.value.entries()) {
    const def = getItem(key)
    totalBurn += ((def?.attrs?.burn_time as number) || 0) * qty
  }
  return Math.floor(totalBurn / selectedOperation.value.time_required)
})

// ---- 周期限制 ----
const cycleOptionsAll = [1, 2, 3, 5, 10]

// 各维度最大可用次数
const maxByContainer = computed(() => {
  if (!selectedOperation.value?.required_item) return null
  const pack = selectedContainerPack.value
  if (!pack) return null
  let max = Infinity
  for (const req of selectedOperation.value.required_item) {
    const keys = reqKeys(req.key)
    if (!selectedContainerKey.value || !keys.includes(selectedContainerKey.value)) continue
    if (req.use) {
      max = Math.min(max, Math.floor(pack.durable / req.use))
    }
  }
  return max === Infinity ? null : max
})

const maxByFormula = computed(() => {
  if (!matchedFormula.value?.required_actions?.max) return null
  return matchedFormula.value.required_actions.max
})

// 全局最大可用次数
const globalMaxCycles = computed(() => {
  const limits: (number | null)[] = []
  if (burningNeeded.value) {
    limits.push(maxCyclesByFire.value > 0 ? maxCyclesByFire.value : null)
    if (maxCyclesByFuel.value !== Infinity) limits.push(maxCyclesByFuel.value)
  }
  if (electricityNeeded.value) {
    limits.push(maxCyclesByPower.value > 0 ? maxCyclesByPower.value : null)
  }
  // 只有已验证的配方才应用容器和配方限制（未验证时属于自由探索，不应限制次数）
  if (matchedFormula.value && formulaProven.value) {
    limits.push(maxByContainer.value)
    limits.push(maxByFormula.value)
  }
  const nums = limits.filter((l): l is number => l !== null)
  if (nums.length === 0) return null
  return Math.min(...nums)
})

// 当前次数是否超出限制
const cyclesExceedsLimit = computed(() => {
  if (globalMaxCycles.value !== null && cycles.value > globalMaxCycles.value) return true
  if (matchedFormula.value && formulaProven.value && matchedFormula.value.required_actions?.min && cycles.value < matchedFormula.value.required_actions.min) return true
  return false
})

// 最大限制标签文字
const limitLabel = computed(() => {
  const parts: string[] = []
  if (burningNeeded.value) {
    if (maxCyclesByFire.value > 0) parts.push(`引火物 ${maxCyclesByFire.value}次`)
    if (maxCyclesByFuel.value !== Infinity) parts.push(`燃料 ${maxCyclesByFuel.value}次`)
  }
  if (electricityNeeded.value) {
    if (maxCyclesByPower.value > 0) parts.push(`电源 ${maxCyclesByPower.value}次`)
  }
  if (matchedFormula.value && formulaProven.value) {
    if (maxByContainer.value !== null) parts.push(`容器 ${maxByContainer.value}次`)
    if (maxByFormula.value !== null) parts.push(`配方上限 ${maxByFormula.value}次`)
  }
  return parts.join('、')
})

// 可用周期选项（受资源限制，用于预设按钮）
const cycleOptions = computed(() => {
  if (globalMaxCycles.value === null) return cycleOptionsAll
  return cycleOptionsAll.filter(n => n <= globalMaxCycles.value!)
})

// 输入框解析
function onCyclesInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value) || 1
  cycles.value = Math.max(1, val)
}

// 当前周期的燃料消耗明细
const fuelConsumptionDetail = computed(() => {
  if (!selectedOperation.value || cycles.value === 0) return []
  const result: { key: string; name: string; quantity: number }[] = []
  let remaining = selectedOperation.value.time_required * cycles.value
  // 按燃烧效率从高到低排序使用
  const sorted = [...selectedFuels.value.entries()].sort((a, b) => {
    const btA = (getItem(a[0])?.attrs?.burn_time as number) || 0
    const btB = (getItem(b[0])?.attrs?.burn_time as number) || 0
    return btB - btA
  })
  for (const [key, qty] of sorted) {
    if (remaining <= 0) break
    const burnTime = (getItem(key)?.attrs?.burn_time as number) || 1
    const maxCanUse = Math.min(qty, Math.ceil(remaining / burnTime))
    const use = Math.min(maxCanUse, Math.ceil(remaining / burnTime))
    if (use > 0) {
      const def = getItem(key)
      result.push({ key, name: def?.name || key, quantity: use })
      remaining -= use * burnTime
    }
  }
  return result
})

const hasEnoughFuel = computed(() => {
  if (!burningNeeded.value) return true
  return fuelConsumptionDetail.value.length > 0 &&
    fuelConsumptionDetail.value.reduce((s, f) => s + f.quantity, 0) > 0
})

const fireSourceAvailable = computed(() => {
  if (!burningNeeded.value || !selectedFireSourcePack.value) return false
  return selectedFireSourcePack.value.durable >= 0.01 * cycles.value
})

const hasEnoughPower = computed(() => {
  if (!electricityNeeded.value) return true
  if (!selectedPowerSourcePack.value) return false
  const consumption = matchedFormula.value?.power_consumption ?? 0.1
  return selectedPowerSourcePack.value.durable >= consumption * cycles.value
})

// ---- 总耗时 ----
const totalTime = computed(() => {
  if (!selectedOperation.value) return 0
  let t = selectedOperation.value.time_required * cycles.value
  for (const op of selectedChainOperations.value) {
    t += op.time_required * cycles.value
  }
  return t
})

// ---- 能否开始 ----
const canStart = computed(() => {
  if (!selectedContainerKey.value) return false
  if (selectedMaterials.value.size === 0) return false
  if (!selectedOperation.value) return false
  
  // 检查技能需求
  if (selectedOperation.value.required_techs &&
      !selectedOperation.value.required_techs.every(t => packStore.hasTech(t))) return false

  // 检查设备需求（主操作+追加操作）
  if (!operationRequirementMet.value) return false

  // 有匹配配方时才检查配方材料是否充足
  if (matchedFormula.value?.required_items) {
    for (const req of matchedFormula.value.required_items) {
      if (!findMatchingMaterial(reqKeys(req.key), req.quantity * batches.value)) return false
    }
  }

  if (burningNeeded.value) {
    if (!containerCanHeat.value) return false
    if (!selectedFireSourceKey.value) return false
    if (!fireSourceAvailable.value) return false
    if (selectedFuels.value.size === 0) return false
    if (!hasEnoughFuel.value) return false
  }

  if (electricityNeeded.value) {
    if (!selectedPowerSourceKey.value) return false
    if (!hasEnoughPower.value) return false
  }

  // 批次数必须至少为 1（仅当有配方时）
  if (matchedFormula.value && batches.value < 1) return false

  return true
})

// ---- 燃料操作 ----
function fuelIncrement(key: string, max: number) {
  const m = new Map(selectedFuels.value)
  m.set(key, Math.min((m.get(key) || 0) + 1, max))
  selectedFuels.value = m
}
function fuelDecrement(key: string) {
  const m = new Map(selectedFuels.value)
  const cur = m.get(key) || 0
  if (cur <= 1) m.delete(key)
  else m.set(key, cur - 1)
  selectedFuels.value = m
}
function getFuelQty(key: string): number {
  return selectedFuels.value.get(key) || 0
}

// ---- 开始实验 ----
function startExperiment() {
  if (!canStart.value || !selectedOperation.value) return

  const consumedItems: { key: string; quantity: number; use?: number }[] = []

  const ops = [selectedOperation.value, ...selectedChainOperations.value].filter(Boolean) as ILabAction[]
  for (const op of ops) {
    for (const req of op.required_item || []) {
      const keys = reqKeys(req.key)
      // 1. 优先尝试从容器位扣除
      if (selectedContainerKey.value && keys.includes(selectedContainerKey.value)) {
        consumedItems.push({ key: selectedContainerKey.value, quantity: 0, use: (req.use ?? 1) * cycles.value })
      } else {
        // 2. 尝试从已选材料中匹配并扣除（针对非容器类设备，如集气瓶）
        const matchedMaterialKey = keys.find(k => selectedMaterials.value.size > 0 && Array.from(selectedMaterials.value.keys()).includes(k))
        if (matchedMaterialKey) {
          // 如果提供了 use，则消耗耐久（工具类）；否则消耗数量
          if (req.use !== undefined) {
            consumedItems.push({ key: matchedMaterialKey, quantity: 0, use: req.use * cycles.value })
          } else {
            consumedItems.push({ key: matchedMaterialKey, quantity: req.quantity * cycles.value })
          }
        }
      }
    }
  }

  // 有匹配配方时才扣除配方材料并记录已验证配方
  if (matchedFormula.value) {
    for (const req of matchedFormula.value.required_items) {
      const matchedKey = findMatchingMaterial(reqKeys(req.key), req.quantity * batches.value)
      if (matchedKey) {
        consumedItems.push({ key: matchedKey, quantity: req.quantity * batches.value })
      }
    }
    // 实验室里程碑（从操作数据读取）
    const opMilestone = selectedOperation.value?.milestone
    if (opMilestone) stateStore.checkMilestone(opMilestone)
    const chainMilestone = selectedChainOperations.value.find(o => o.milestone)
    if (chainMilestone) stateStore.checkMilestone(chainMilestone.milestone!)
  }

  if (burningNeeded.value) {
    for (const f of fuelConsumptionDetail.value) {
      consumedItems.push({ key: f.key, quantity: f.quantity })
    }
    if (selectedFireSourcePack.value) {
      consumedItems.push({ key: selectedFireSourcePack.value.key, quantity: 0, use: 0.01 * cycles.value })
    }
  }

  if (electricityNeeded.value) {
    if (selectedPowerSourcePack.value) {
      const consumption = matchedFormula.value?.power_consumption ?? 0.1
      consumedItems.push({ key: selectedPowerSourcePack.value.key, quantity: 0, use: consumption * cycles.value })
    }
  }

  for (const item of consumedItems) {
    packStore.removeItem(item.key, item.quantity, item.use)
  }

  taskStore.pushLabTask({
    name: `实验室 - ${selectedOperation.value.name}${selectedChainOperations.value.map(o => ' → ' + o.name).join('')}`,
    key: `lab_${selectedOperation.value.key}_${Date.now()}`,
    description: selectedOperation.value.description,
    time_required: totalTime.value,
    rewards: formulaProducts.value.map(p => ({ key: p.key, quantity: p.quantity, probability: 1 })),
    required_items: consumedItems,
    formulaKey: matchedFormula.value?.key,
  })

  selectedContainerKey.value = null
  selectedMaterials.value = new Map()
  selectedOperationKey.value = null
  selectedChainOperationKey.value = new Set()
  selectedFireSourceKey.value = null
  selectedFuels.value = new Map()
  cycles.value = 1
}
</script>
<template>
  <div class="p-4 max-w-2xl mx-auto space-y-4">
    <h2 class="text-xl font-bold flex items-center gap-2">
      <Icon icon="fluent:beaker-16-filled" class="text-2xl" />
      实验室
    </h2>

    <!-- 1. 容器选择 -->
    <div id="lab-step-1" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">1. 选择容器</h3>
        <select v-model="selectedContainerKey" class="select select-bordered w-full">
          <option :value="null" disabled>-- 请选择容器 --</option>
          <option v-for="c in availableContainers" :key="c.key" :value="c.key">
            {{ c.name }} (耐久: {{ Math.round(c.durable * 100) / 100 }})
          </option>
        </select>
        <p v-if="availableContainers.length === 0" class="text-xs text-base-content/60">背包中无可用容器</p>
        <div v-if="selectedContainerKey" class="mt-1 text-xs space-x-2">
          <span v-if="containerCanHeat" class="text-success"><Icon icon="tabler:flame" class="text-sm inline-block align-middle" />可加热</span>
          <span v-else class="text-error"><Icon icon="tabler:flame-off" class="text-sm inline-block align-middle" />不可加热</span>
        </div>
      </div>
    </div>

    <!-- 2. 材料选择 -->
    <div id="lab-step-2" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">2. 选择材料</h3>
        <button class="btn btn-outline btn-sm w-full justify-start gap-2" @click="openMaterialModal">
          <Icon icon="tabler:package" class="text-lg" />
          <span v-if="materialCount === 0" class="text-base-content/50">点击选择材料</span>
          <span v-else class="font-normal">{{ materialSummary }}</span>
        </button>
      </div>
    </div>

    <!-- 3. 操作选择 -->
    <div id="lab-step-3" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">3. 选择操作</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="op in LabActions"
            :key="op.key"
            class="btn btn-outline btn-sm gap-1"
            :class="selectedOperationKey === op.key ? 'btn-primary' : ''"
            v-show="!op.required_techs || op.required_techs.every(t => packStore.hasTech(t))"
            @click="selectedOperationKey = op.key"
          >
            <Icon v-if="op.requires_burning" icon="tabler:flame" class="text-sm" />
            {{ op.name }}
            <span class="text-xs opacity-60">{{ op.time_required }}秒</span>
          </button>
        </div>
        <div v-if="selectedOperation" class="mt-2 text-xs text-base-content/70 space-y-0.5">
          <p>{{ selectedOperation.description }}</p>
          <p v-if="selectedOperation.requires_burning" class="text-warning"><Icon icon="tabler:flame" class="text-sm inline-block align-middle" />需要火源</p>
          <p v-if="allOperationRequirements.length > 0"
             :class="operationRequirementMet ? '' : 'text-error'">
            需要: {{ allOperationRequirements.map(r => {
              const keys = Array.isArray(r.key) ? r.key : [r.key]
              return keys.map(k => {
                const def = getItem(k)
                const inContainer = selectedContainerKey && keys.includes(selectedContainerKey)
                const inMaterial = selectedMaterials.has(k)
                const status = (inContainer || inMaterial) ? '✓' : ''
                return `${def?.name || k}${status}${r.use ? ` (耐久 -${r.use}/次)` : ''}`
              }).join(' 或 ')
            }).join('、') }}
            <span v-if="!operationRequirementMet" class="text-error"> ⚠️ 未满足（可在容器或材料位提供）</span>
          </p>
          <p v-if="selectedOperation.required_techs && !selectedOperation.required_techs.every(t => packStore.hasTech(t))" class="text-error">
            前置科技未解锁
          </p>
        </div>
      </div>
    </div>

    <!-- 3.5 追加操作（可选） -->
    <div id="lab-step-3-5" v-if="availableChainOperations.length > 0" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">3.5 追加操作（可选）</h3>
        <p class="text-xs text-base-content/50 mb-2">在主操作完成后追加额外操作（仅增加耗时，不消耗额外材料）</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="op in availableChainOperations"
            :key="op.key"
            class="btn btn-outline btn-sm gap-1"
            :class="selectedChainOperationKey.has(op.key) ? 'btn-secondary' : ''"
            @click="selectedChainOperationKey.has(op.key) ? selectedChainOperationKey.delete(op.key) : selectedChainOperationKey.add(op.key); selectedChainOperationKey = new Set(selectedChainOperationKey)"
            v-show="!op.required_techs || op.required_techs.every(t => packStore.hasTech(t))"
          >
            {{ op.name }}
            <span class="text-xs opacity-60">{{ op.time_required }}秒</span>
          </button>
        </div>
        <div v-if="selectedChainOperations.length > 0" class="mt-2 text-xs text-base-content/70 space-y-0.5">
          <p v-for="op in selectedChainOperations" :key="op.key">{{ op.description }}</p>
        </div>
      </div>
    </div>

    <!-- 4. 引火与燃料（仅需火源的操作） -->
    <div v-if="burningNeeded" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">4. 引火与燃料</h3>

        <!-- 引火物选择 -->
        <div class="mb-3">
          <span class="text-xs font-medium mb-1 block">引火物</span>
          <select v-model="selectedFireSourceKey" class="select select-bordered w-full select-sm">
            <option :value="null" disabled>-- 请选择引火物 --</option>
            <option v-for="fs in fireSourceItems" :key="fs.key" :value="fs.key">
              {{ fs.name }} (耐久: {{ Math.round(fs.durable * 100) / 100 }})
            </option>
          </select>
          <p v-if="fireSourceItems.length === 0" class="text-xs text-error mt-1">背包中无引火物</p>
          <div v-if="selectedFireSourcePack" class="text-xs text-base-content/50 mt-0.5">
            可用 {{ maxCyclesByFire }} 次（每次消耗 0.01 耐久）
          </div>
        </div>

        <!-- 燃料选择 -->
        <div>
          <span class="text-xs font-medium mb-1 block">燃料</span>
          <div v-if="fuelItems.length === 0" class="text-xs text-error">背包中无燃料</div>
          <div v-else class="space-y-1">
            <div
              v-for="fuel in fuelItems"
              :key="fuel.key"
              class="flex items-center justify-between px-3 py-1.5 rounded-lg border text-sm"
              :class="getFuelQty(fuel.key) > 0 ? 'border-warning bg-warning/5' : 'border-base-300'"
            >
              <div class="flex items-center gap-2">
                <span>{{ fuel.name }}</span>
                <span class="text-xs text-base-content/50">
                  背包 {{ fuel.quantity }} | {{ (getItem(fuel.key)?.attrs?.burn_time as number) || '?' }}秒/个
                </span>
              </div>
              <div class="flex items-center gap-1">
                <button class="btn btn-xs btn-circle btn-ghost" :disabled="getFuelQty(fuel.key) <= 0" @click="fuelDecrement(fuel.key)">−</button>
                <span class="w-6 text-center font-mono text-sm">{{ getFuelQty(fuel.key) }}</span>
                <button class="btn btn-xs btn-circle btn-ghost" :disabled="getFuelQty(fuel.key) >= fuel.quantity" @click="fuelIncrement(fuel.key, fuel.quantity)">+</button>
              </div>
            </div>
          </div>

          <!-- 燃料燃烧摘要 -->
          <div v-if="selectedFuels.size > 0" class="mt-2 text-xs space-y-0.5">
            <div class="text-base-content/70">
              燃烧时长: {{ selectedFuels.size > 0
                ? [...selectedFuels.entries()].reduce((s, [k, q]) => s + ((getItem(k)?.attrs?.burn_time as number) || 0) * q, 0)
                : 0 }}秒
            </div>
            <div class="text-base-content/70">
              每次操作需: {{ selectedOperation?.time_required ?? '?' }}秒
              <span v-if="maxCyclesByFuel !== Infinity">，最多 {{ maxCyclesByFuel }} 次</span>
            </div>
            <div v-if="!hasEnoughFuel && cycles > 0" class="text-error">⚠️ 燃料不足以完成 {{ cycles }} 次操作</div>
            <div v-if="cycleOptions.length === 0" class="text-error">⚠️ 燃料不足以完成任何操作</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5 电源选择（仅需电力的操作） -->
    <div v-if="electricityNeeded" class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">{{ burningNeeded ? 5 : 4 }}. 选择电源</h3>

        <!-- 电源选择 -->
        <div class="mb-3">
          <span class="text-xs font-medium mb-1 block">电源</span>
          <select v-model="selectedPowerSourceKey" class="select select-bordered w-full select-sm">
            <option :value="null" disabled>-- 请选择电源 --</option>
            <option v-for="ps in powerSourceItems" :key="ps.key" :value="ps.key">
              {{ ps.name }} (耐久/电量: {{ Math.round(ps.durable * 100) / 100 }})
            </option>
          </select>
          <p v-if="powerSourceItems.length === 0" class="text-xs text-error mt-1">背包中无可用电源（电池等）</p>
          <div v-if="selectedPowerSourcePack" class="text-xs text-base-content/50 mt-0.5">
            可用 {{ maxCyclesByPower }} 次（每次消耗 {{ matchedFormula?.power_consumption ?? 0.1 }} 耐久）
          </div>
        </div>
      </div>
    </div>

    <!-- 5. 执行实验 -->
    <div class="card bg-base-200">
      <div class="card-body p-4">
        <h3 class="card-title text-sm">{{ burningNeeded && electricityNeeded ? '6' : ( burningNeeded || electricityNeeded ? '5' : '4') }}. 执行实验</h3>

        <!-- 周期选择 -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <span class="text-sm">执行次数:</span>
          <input
            type="number"
            min="1"
            :max="globalMaxCycles ?? ''"
            :value="cycles"
            @input="onCyclesInput"
            class="input input-bordered input-sm w-16 text-center font-mono"
            :class="cyclesExceedsLimit ? 'input-error text-error' : ''"
          />
          <span class="text-xs">次</span>
          <div class="join">
            <button
              v-for="n in cycleOptionsAll"
              :key="n"
              class="join-item btn btn-sm"
              :class="[
                cycles === n ? 'btn-primary' : '',
                !cycleOptions.includes(n) ? 'btn-disabled opacity-30' : ''
              ]"
              :disabled="!cycleOptions.includes(n)"
              @click="cycles = n"
            >{{ n }}×</button>
          </div>
          <span class="text-xs text-base-content/60">
            总耗时: {{ totalTime > 60 ? Math.floor(totalTime / 60) + '分' + (totalTime % 60) + '秒' : totalTime + '秒' }}
          </span>
          <!-- 超出限制警告 -->
          <span v-if="cyclesExceedsLimit && limitLabel" class="text-xs text-error w-full">
            ⚠️ 超出限制：{{ limitLabel }}
          </span>
          <span v-else-if="cyclesExceedsLimit" class="text-xs text-error w-full">
            ⚠️ 当前次数超出可用范围
          </span>
        </div>

        <!-- 配方提示 -->
        <div v-if="matchedFormula" class="border rounded-lg p-3 mb-3"
          :class="formulaProven ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'">
          <template v-if="formulaProven">
            <div class="flex items-center gap-1 text-sm font-medium text-success">
              <Icon icon="tabler:flask" class="text-lg" />
              匹配配方: {{ matchedFormula.name }}
            </div>
            <div class="text-xs text-base-content/70 mt-1">{{ matchedFormula.description }}</div>
            <div class="flex flex-wrap gap-2 mt-2">
              <span v-for="p in formulaProducts" :key="p.key" class="badge badge-success badge-sm">
                产出 {{ p.name }} ×{{ p.quantity }}
              </span>
            </div>
            <!-- 气体提示 -->
            <div v-if="matchedFormula && hasGasProducts" class="text-xs text-warning mt-1">
              ⚠️ 该配方会产生气体，需追加对应集气操作才能收集
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-1 text-sm font-medium text-warning">
              <Icon icon="tabler:question-mark" class="text-lg" />
              未知结果
            </div>
            <div class="text-xs text-base-content/70 mt-1">
              当前配方的产物尚不清楚，或许会有新发现！
            </div>
          </template>
        </div>
        <div v-else-if="selectedOperation"  class="border rounded-lg p-3 mb-3 border-warning/30 bg-warning/5">
          <div class="flex items-center gap-1 text-sm font-medium text-warning">
            <Icon icon="tabler:question-mark" class="text-lg" />
            未知结果
          </div>
          <div class="text-xs text-base-content/70 mt-1">
            当前配方的产物尚不清楚，或许会有新发现！
          </div>
        </div>

        <!-- 开始按钮 -->
        <button id="lab-execute-btn" class="btn btn-primary w-full gap-2" :disabled="!canStart" @click="startExperiment">
          <Icon icon="tabler:flask" class="text-lg" />
          开始实验
        </button>

        <p v-if="!canStart && selectedOperation" class="text-xs text-base-content/40 text-center mt-1">
          请检查材料、容器和燃料是否充足
        </p>
      </div>
    </div>
  </div>

  <!-- 材料选择弹窗 -->
  <dialog :open="materialModalOpen" class="modal">
    <div class="modal-box max-w-md">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg">选择材料</h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="cancelMaterials">
          <Icon icon="tabler:x" class="text-xl" />
        </button>
      </div>

      <!-- 分类过滤 -->
      <div v-if="availableCategories.length > 0" class="flex flex-wrap gap-1.5 mb-3">
        <button 
          v-for="cat in availableCategories" 
          :key="cat"
          class="btn btn-xs rounded-full border-none font-normal"
          :class="selectedCategory === cat ? 'btn-primary shadow-sm' : 'btn-ghost bg-base-300/50 hover:bg-base-300 text-base-content/60'"
          @click="selectedCategory = selectedCategory === cat ? null : cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- 搜索框 -->
      <div class="relative mb-3 input input-bordered input-sm w-full">
        <Icon icon="tabler:search" class="text-base-content/40" />
        <input
          v-model="materialSearchQuery"
          type="text"
          placeholder="搜索材料名称或代码..."
          class="w-full"
          ref="searchInput"
        />
        <button 
          v-if="materialSearchQuery" 
          class="btn btn-ghost btn-xs btn-circle"
          @click="materialSearchQuery = ''"
        >
          <Icon icon="tabler:x" />
        </button>
      </div>

      <div v-if="filteredAvailableMaterials.length === 0" class="text-sm text-base-content/50 py-4 text-center">
        {{ materialSearchQuery ? '未找到匹配材料' : '背包中无可用材料' }}
      </div>
      <div v-else class="space-y-1 max-h-80 overflow-y-auto pr-1">
        <div
          v-for="item in filteredAvailableMaterials"
          :key="item.key"
          class="flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors"
          :class="getDraftQty(item.key) > 0 ? 'border-primary bg-primary/5' : 'border-base-300'"
          @click="getDraftQty(item.key) >= item.quantity ? null : draftIncrement(item.key)"
        >
          <div class="flex items-center gap-2">
            <span>{{ item.name }}</span>
            <span class="text-xs text-base-content/50">背包: {{ item.quantity }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-xs btn-circle btn-ghost" :disabled="getDraftQty(item.key) <= 0" @click.stop="draftDecrement(item.key)">−</button>
            <input
              type="number"
              class="w-12 text-center font-mono text-sm p-0 input input-xs input-bordered"
              min="0"
              :max="item.quantity"
              :value="getDraftQty(item.key) || ''"
              @input="onDraftInput($event, item.key, item.quantity)"
              @click.stop
            />
            <button class="btn btn-xs btn-circle btn-ghost" :disabled="getDraftQty(item.key) >= item.quantity" @click.stop="draftIncrement(item.key)">+</button>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="cancelMaterials">取消</button>
        <button class="btn btn-primary" @click="confirmMaterials">确定</button>
      </div>
    </div>
  </dialog>
</template>
