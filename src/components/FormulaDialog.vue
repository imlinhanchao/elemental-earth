<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="visible" class="dialog-overlay" @click.self="cancel">
        <div class="dialog-panel">
          <!-- 标题 -->
          <div class="dialog-header">
            <h3>{{ formula?.name || '执行配方' }}</h3>
            <button class="dialog-close" @click="cancel">&times;</button>
          </div>

          <!-- 描述 -->
          <p class="dialog-desc">{{ formula?.description }}</p>

          <!-- 执行次数 -->
          <div class="form-row">
            <label>执行次数</label>
            <div class="batch-selector">
              <button class="btn btn-sm" :disabled="batches <= 1" @click="batches--">−</button>
              <span class="batch-value">{{ batches }}</span>
              <button class="btn btn-sm" @click="batches++">+</button>
            </div>
          </div>

          <!-- 材料选择 -->
          <div class="form-row" v-for="(req, i) in formula?.required_items || []" :key="i">
            <label :class="{ 'label-insufficient': insufficientMaterials[i] }">
              {{ getItem(Array.isArray(req.key) ? req.key[0] : req.key)?.name || `材料 ${i + 1}` }} x {{ req.quantity * batches }}
              <span v-if="insufficientMaterials[i]" class="insufficient-hint">不足</span>
            </label>
            <div class="material-select-row">
              <select v-model="selectedMaterials[i]" class="select select-bordered select-sm flex-1"
                :class="{ 'select-warning': insufficientMaterials[i] }">
                <option :value="null" disabled>-- 请选择 --</option>
                <option v-for="opt in materialOptions(req)" :key="opt.key" :value="opt.key">
                  {{ opt.name }}（拥有 {{ opt.qty }}）
                </option>
              </select>
            </div>
          </div>

          <!-- 容器选择 -->
          <div v-if="formula?.required_container" class="form-row">
            <label>容器（需 {{ containerName }}）</label>
            <select v-model="selectedContainer" class="select select-bordered select-sm w-full">
              <option :value="null" disabled>-- 请选择 --</option>
              <option v-for="c in containerOptions" :key="c.key" :value="c.key">
                {{ c.name }}（耐久 {{ c.durable.toFixed(2) }}）
              </option>
            </select>
          </div>

          <!-- 燃烧相关 -->
          <template v-if="operation?.requires_burning">
            <div class="divider text-xs opacity-50">燃烧配置</div>

            <div class="form-row">
              <label>火种</label>
              <select v-model="selectedFireSource" class="select select-bordered select-sm w-full">
                <option :value="null" disabled>-- 请选择 --</option>
                <option v-for="f in fireSourceOptions" :key="f.key" :value="f.key">
                  {{ f.name }}（耐久 {{ f.durable.toFixed(2) }}）
                </option>
              </select>
            </div>

            <div class="form-row">
              <label>燃料</label>
              <div v-if="fuelOptions.length === 0" class="text-xs text-warning">没有可用的燃料</div>
              <div v-for="f in fuelOptions" :key="f.key" class="fuel-row">
                <span class="fuel-name">{{ f.name }}</span>
                <span class="fuel-info">拥有 {{ f.qty }} · 燃烧 {{ f.burnTime }}s</span>
                <div class="fuel-controls">
                  <button class="btn btn-xs" :disabled="(fuelMap.get(f.key) || 0) <= 0" @click="decFuel(f.key)">−</button>
                  <span class="fuel-qty">{{ fuelMap.get(f.key) || 0 }}</span>
                  <button class="btn btn-xs" :disabled="(fuelMap.get(f.key) || 0) >= f.qty" @click="incFuel(f.key)">+</button>
                </div>
              </div>
              <div class="fuel-total" v-if="totalBurnTime > 0">
                总燃烧时间: {{ totalBurnTime }}s
                <span v-if="neededBurnTime > totalBurnTime" class="text-warning">（需要 {{ neededBurnTime }}s）</span>
                <span v-else class="text-success">（足够）</span>
              </div>
            </div>
          </template>

          <!-- 产物预览 -->
          <div class="product-preview">
            <span class="product-label">预计产物：</span>
            <span v-for="p in productList" :key="p.key" class="product-tag">
              {{ p.name }} ×{{ p.qty * batches }}
            </span>
            <span v-if="productList.length === 0" class="text-warning">（尚未确认配方，可能没有有用产物）</span>
          </div>

          <!-- 总耗时 -->
          <div class="total-time">⏱ 预计耗时：{{ totalTime }} 秒</div>

          <!-- 操作按钮 -->
          <div class="dialog-footer">
            <button class="btn btn-ghost" @click="cancel">取消</button>
            <button class="btn btn-primary" :disabled="!canConfirm" @click="confirm">
              ⚡ 开始执行
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Formulas, type IFormula } from '@/data/formula'
import { LabActions } from '@/data/labs'
import { getItem } from '@/data/items'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { useLogStore } from '@/stores/modules/log'

const props = defineProps<{
  visible: boolean
  formulaKey: string
  operationKey: string
}>()

const emit = defineEmits<{
  close: []
}>()

const packStore = usePackStore()
const taskStore = useTaskStore()
const logStore = useLogStore()

// ─── 基础数据 ──────────────────────────────────────────────────
const formula = computed<IFormula | undefined>(() =>
  Formulas.find(f => f.key === props.formulaKey)
)

const operation = computed(() =>
  LabActions.find(a => a.key === props.operationKey)
)

/** 容器的显示名称 */
const containerName = computed(() => {
  if (!formula.value?.required_container) return ''
  return getItem(formula.value.required_container)?.name || formula.value.required_container
})

// ─── 执行次数 ──────────────────────────────────────────────────
const batches = ref(1)

// ─── 已选材料 ──────────────────────────────────────────────────
const selectedMaterials = ref<(string | null)[]>([])

watch(() => props.visible, (v) => {
  if (v) {
    batches.value = 1
    // 默认选中每一项材料的第一个可用选项
    selectedMaterials.value = (formula.value?.required_items || []).map(req => {
      const opts = materialOptions(req)
      return opts.length > 0 ? opts[0].key : null
    })
    selectedContainer.value = null
    selectedFireSource.value = null
    fuelMap.value = new Map()
  }
})

/** 某组材料的可选选项（从玩家背包中查找匹配项） */
function materialOptions(req: IFormula['required_items'][number]) {
  const keys = Array.isArray(req.key) ? req.key : [req.key]
  return keys
    .map(k => {
      const def = getItem(k)
      const qty = packStore.getItemQuantity(k)
      return { key: k, name: def?.name || k, qty }
    })
    .filter(o => o.qty > 0)
}

// ─── 容器选择 ──────────────────────────────────────────────────
const selectedContainer = ref<string | null>(null)

const containerOptions = computed(() => {
  const reqContainer = formula.value?.required_container
  if (!reqContainer) return []
  return packStore.items
    .filter(i => i.key === reqContainer && i.durable > 0)
    .map(i => ({ key: i.key, name: getItem(i.key)?.name || i.key, durable: i.durable }))
})

// ─── 火种选择 ──────────────────────────────────────────────────
const selectedFireSource = ref<string | null>(null)

const fireSourceOptions = computed(() => {
  return packStore.items
    .filter(i => {
      const def = getItem(i.key)
      return def?.type.includes('fire_source') && i.durable > 0
    })
    .map(i => ({ key: i.key, name: getItem(i.key)?.name || i.key, durable: i.durable }))
})

// ─── 燃料选择 ──────────────────────────────────────────────────
const fuelMap = ref(new Map<string, number>())

const fuelOptions = computed(() => {
  return packStore.items
    .filter(i => {
      const def = getItem(i.key)
      return def?.type.includes('fuel') && def?.attrs?.burn_time && i.quantity > 0
    })
    .map(i => {
      const def = getItem(i.key)!
      return {
        key: i.key,
        name: def.name,
        qty: i.quantity,
        burnTime: def.attrs!.burn_time as number,
      }
    })
})

function incFuel(key: string) {
  fuelMap.value.set(key, (fuelMap.value.get(key) || 0) + 1)
  fuelMap.value = new Map(fuelMap.value)
}

function decFuel(key: string) {
  const cur = fuelMap.value.get(key) || 0
  if (cur <= 1) fuelMap.value.delete(key)
  else fuelMap.value.set(key, cur - 1)
  fuelMap.value = new Map(fuelMap.value)
}

const totalBurnTime = computed(() => {
  let total = 0
  for (const [key, qty] of fuelMap.value) {
    const def = getItem(key)
    if (def?.attrs?.burn_time) total += (def.attrs.burn_time as number) * qty
  }
  return total
})

const neededBurnTime = computed(() => {
  if (!operation.value) return 0
  return operation.value.time_required * batches.value
})

// ─── 产物预览 ──────────────────────────────────────────────────
const productList = computed(() => {
  if (!formula.value) return []
  return formula.value.products.map(p => ({
    key: p.key,
    name: getItem(p.key)?.name || p.key,
    qty: p.multiple,
  }))
})

// ─── 材料充足校验（按当前次数）─────────────────────────────────
const insufficientMaterials = computed(() => {
  const result: boolean[] = []
  const items = formula.value?.required_items || []
  for (let i = 0; i < items.length; i++) {
    const key = selectedMaterials.value[i]
    const req = items[i]
    if (!key) {
      result.push(true)
    } else {
      const need = req.quantity * batches.value
      const have = packStore.getItemQuantity(key)
      result.push(have < need)
    }
  }
  return result
})

// ─── 总耗时 ────────────────────────────────────────────────────
const totalTime = computed(() => {
  if (!formula.value) return 0
  return formula.value.time_required * batches.value
})

// ─── 校验 ──────────────────────────────────────────────────────
const canConfirm = computed(() => {
  // 所有材料必须已选择且数量充足
  for (let i = 0; i < (formula.value?.required_items.length || 0); i++) {
    const key = selectedMaterials.value[i]
    if (!key) return false
    const req = formula.value!.required_items[i]
    if (!packStore.hasItem(key, req.quantity * batches.value)) return false
  }

  // 需要容器时检查
  if (formula.value?.required_container && !selectedContainer.value) return false

  // 需要燃烧时检查火种和燃料
  if (operation.value?.requires_burning) {
    if (!selectedFireSource.value) return false
    const fs = packStore.items.find(i => i.key === selectedFireSource.value)
    if (!fs || fs.durable < 0.01 * batches.value) return false
    if (neededBurnTime.value > totalBurnTime.value) return false
  }

  if (taskStore.tasks.length >= 100) return false
  return true
})

// ─── 确认 / 取消 ────────────────────────────────────────────────
function confirm() {
  if (!canConfirm.value || !formula.value) return

  const consumedItems: { key: string; quantity: number; use?: number }[] = []

  // 1. 消耗材料
  for (let i = 0; i < formula.value.required_items.length; i++) {
    const key = selectedMaterials.value[i]!
    const req = formula.value.required_items[i]
    consumedItems.push({ key, quantity: req.quantity * batches.value })
  }

  // 2. 消耗容器耐久
  if (selectedContainer.value) {
    consumedItems.push({ key: selectedContainer.value, quantity: 0, use: 0.05 * batches.value })
  }

  // 3. 消耗燃料和火种
  if (operation.value?.requires_burning) {
    for (const [key, qty] of fuelMap.value) {
      consumedItems.push({ key, quantity: qty })
    }
    if (selectedFireSource.value) {
      consumedItems.push({ key: selectedFireSource.value, quantity: 0, use: 0.01 * batches.value })
    }
  }

  // 4. 执行消耗
  for (const item of consumedItems) {
    packStore.removeItem(item.key, item.quantity, item.use)
  }

  // 5. 构建奖励
  const rewards = formula.value.products.map(p => ({
    key: p.key,
    quantity: p.multiple * batches.value,
    probability: 1,
  }))

  // 6. 推送任务
  taskStore.pushLabTask({
    name: formula.value.name,
    key: `action_formula_${formula.value.key}_${Date.now()}`,
    description: formula.value.description,
    time_required: totalTime.value,
    rewards,
    required_items: consumedItems,
  })

  const productNames = formula.value.products
    .map(p => `${getItem(p.key)?.name || p.key} x${p.multiple * batches.value}`)
    .join('、')
  logStore.addLog(`配方执行: ${formula.value.name} x${batches.value}`, 'craft')

  emit('close')
}

function cancel() {
  emit('close')
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.dialog-fade-enter-active { transition: opacity 0.2s; }
.dialog-fade-leave-active { transition: opacity 0.15s; }
.dialog-fade-enter-from, .dialog-fade-leave-to { opacity: 0; }

.dialog-panel {
  background: oklch(var(--b1));
  border: 1px solid oklch(var(--b3));
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}
.dialog-header h3 {
  font-size: 18px;
  font-weight: 700;
}
.dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: oklch(var(--bc));
  opacity: 0.5;
  line-height: 1;
  padding: 0 4px;
}
.dialog-close:hover { opacity: 1; }

.dialog-desc {
  font-size: 13px;
  color: oklch(var(--bc));
  opacity: 0.65;
  margin-bottom: 16px;
}

.form-row {
  margin-bottom: 12px;
}
.form-row label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: oklch(var(--bc));
  opacity: 0.8;
}
.label-insufficient {
  color: #ef4444 !important;
  opacity: 1 !important;
}
.insufficient-hint {
  display: inline-block;
  font-size: 10px;
  background: #ef4444;
  color: #fff;
  padding: 0 6px;
  border-radius: 3px;
  margin-left: 6px;
  font-weight: 600;
  vertical-align: middle;
}

.batch-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-value {
  font-size: 18px;
  font-weight: 700;
  min-width: 32px;
  text-align: center;
}

.material-select-row {
  display: flex;
  gap: 8px;
}

.fuel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: oklch(var(--b2));
  border-radius: 6px;
  margin-bottom: 4px;
}
.fuel-name { font-size: 13px; font-weight: 500; min-width: 60px; }
.fuel-info { font-size: 11px; opacity: 0.6; flex: 1; }
.fuel-controls { display: flex; align-items: center; gap: 4px; }
.fuel-qty { font-size: 14px; font-weight: 600; min-width: 20px; text-align: center; }
.fuel-total { font-size: 12px; opacity: 0.7; margin-top: 4px; }

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  color: oklch(var(--bc));
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: oklch(var(--b3));
}

.product-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: oklch(var(--b2));
  border-radius: 8px;
  margin-bottom: 8px;
  font-size: 13px;
}
.product-label { font-weight: 600; opacity: 0.7; }
.product-tag {
  background: oklch(var(--s));
  color: oklch(var(--sc));
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.total-time {
  text-align: center;
  font-size: 13px;
  opacity: 0.6;
  margin-bottom: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid oklch(var(--b3));
}
</style>
