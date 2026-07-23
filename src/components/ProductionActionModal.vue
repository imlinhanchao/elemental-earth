<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Actions } from '@/data/actions'
import { Items, getItem } from '@/data/items'
import { usePackStore } from '@/stores/modules/pack'
import { useProductionStore } from '@/stores/modules/production'
import { useStateStore } from '@/stores/modules/state'
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
const stateStore = useStateStore()

const selectedActionKey = ref('')
const selectedMaterials = ref<Record<number, string>>({})
const count = ref(1)

// 循环条件支持
const loopUntil = ref(false)
const targetItem = ref('')
const targetCount = ref(0)
const conditionType = ref<'ge' | 'le'>('ge')

const availableActions = computed(() => {
  return Actions.filter(a => {
    // 基础过滤：必须有科技解锁 (或者没有科技要求)
    if (a.required_techs && !a.required_techs.every(t => packStore.techs.includes(t))) return false
    
    // 必须在当前地图可用
    if (a.map && !a.map.some(m => (typeof m === 'string' ? m : (m as any).key) === stateStore.state.map)) return false

    // 必须曾拥有过所有前置物品（或者至少其中之一，如果是可选的）
    if (a.required_items.some(item => {
      const keys = Array.isArray(item.key) ? item.key : [item.key]
      return !keys.some(k => packStore.hasEverHad(k))
    })) return false

    return true
  }).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
    .map(a => ({
      label: a.name,
      value: a.key
    }))
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

const currentAction = computed(() => {
  return Actions.find(a => a.key === selectedActionKey.value)
})

// 当切换行动时，初始化材料选择
function handleActionChange() {
  selectedMaterials.value = {}
  if (!currentAction.value) return
  
  currentAction.value.required_items.forEach((req, idx) => {
    if (Array.isArray(req.key)) {
      // 默认选择第一个可用的
      selectedMaterials.value[idx] = req.key[0]
    } else {
      selectedMaterials.value[idx] = req.key
    }
  })

  // 默认目标设置为主要的产物
  const mainReward = currentAction.value.rewards[0]?.key
  if (mainReward) {
    targetItem.value = mainReward
    targetCount.value = packStore.getItemQuantity(mainReward) + 10
  }
}

watch(selectedActionKey, () => {
  handleActionChange()
})

function getItemName(key: string) {
  return getItem(key)?.name || key
}

function handleAdd() {
  if (!currentAction.value) return

  const payload = {
    required_items: currentAction.value.required_items.map((req, idx) => ({
      ...req,
      key: selectedMaterials.value[idx] || (Array.isArray(req.key) ? req.key[0] : req.key)
    }))
  }

  const condition = loopUntil.value && targetItem.value ? {
    key: targetItem.value,
    value: targetCount.value,
    operator: (conditionType.value === 'ge' ? '>=' : '<=') as '>=' | '<=',
    loopUntil: true
  } : undefined

  productionStore.addStepToDraft({
    type: 'action',
    key: currentAction.value.key,
    name: currentAction.value.name,
    payload,
    condition
  }, count.value)

  emit('close')
  selectedActionKey.value = ''
  count.value = 1
  loopUntil.value = false
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg flex items-center gap-2 mb-4">
          <Icon icon="fluent:puzzle-cube-16-filled" class="text-primary" />
          添加行动步骤
        </h3>

        <div class="space-y-4">
          <!-- 选择行动 -->
          <div class="form-control w-full">
            <label class="label"><span class="label-text">选择行动</span></label>
            <SearchableSelect
              v-model="selectedActionKey"
              :options="availableActions"
              placeholder="-- 请选择行动 --"
              size="sm"
            />
          </div>

          <!-- 材料配置 -->
          <div v-if="currentAction && currentAction.required_items.length > 0" class="space-y-3">
            <label class="label"><span class="label-text">材料状态</span></label>
            <div v-for="(req, idx) in currentAction.required_items" :key="idx" class="flex flex-col gap-1 text-xs">
              <div class="flex items-center justify-between gap-4">
                <span class="opacity-60">{{ idx + 1 }}. {{ Array.isArray(req.key) ? '选择材料' : getItemName(req.key) }}:</span>
                <div class="flex items-center gap-2">
                  <span :class="packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) >= req.quantity * count ? 'text-success' : 'text-error'">
                    持有: {{ packStore.getItemQuantity(Array.isArray(req.key) ? selectedMaterials[idx] : req.key) }}/{{ req.quantity * count }}
                  </span>
                  <span v-if="Items.find(i => i.key === (Array.isArray(req.key) ? selectedMaterials[idx] : req.key))?.durable" class="bg-base-200 px-1 rounded">
                    耐久: {{ packStore.getTotalDurability(Array.isArray(req.key) ? selectedMaterials[idx] : req.key).toFixed(1) }}
                  </span>
                </div>
              </div>
              <template v-if="Array.isArray(req.key)">
                <select v-model="selectedMaterials[idx]" class="select select-bordered select-xs w-full mt-1">
                  <option v-for="k in req.key" :key="k" :value="k">
                    {{ getItemName(k) }} (持有: {{ packStore.getItemQuantity(k) }}{{ Items.find(i=>i.key===k)?.durable ? ', 耐久: ' + packStore.getTotalDurability(k).toFixed(1) : '' }})
                  </option>
                </select>
              </template>
            </div>
          </div>

          <!-- 批量执行 -->
          <div class="form-control w-full">
            <label class="label"><span class="label-text">每轮循环执行次数</span></label>
            <div class="join w-full">
              <button class="btn btn-sm join-item" @click="count = Math.max(1, count - 1)" :disabled="loopUntil">-</button>
              <input v-model.number="count" type="number" min="1" :disabled="loopUntil" class="input input-sm input-bordered join-item grow text-center" />
              <button class="btn btn-sm join-item" @click="count++" :disabled="loopUntil">+</button>
            </div>
            
            <!-- 循环条件 -->
            <div class="mt-3 p-3 bg-base-300 rounded-xl space-y-2">
              <label class="label cursor-pointer justify-start gap-2 py-0 text-xs text-secondary font-bold">
                <input type="checkbox" v-model="loopUntil" class="checkbox checkbox-xs checkbox-secondary" />
                <span>持续执行直到库存满足条件 (生产中心模式)</span>
              </label>
              
              <div v-if="loopUntil" class="space-y-2 pt-1 border-t border-base-content/10 mt-1">
                <div class="form-control">
                  <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">监控物品</span></label>
                  <SearchableSelect
                    v-model="targetItem"
                    :options="allItems"
                    placeholder="选择监控的目标物品"
                    size="xs"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="form-control">
                    <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">判断逻辑</span></label>
                    <select v-model="conditionType" class="select select-bordered select-xs w-full bg-base-200">
                      <option value="ge">库存 ≥ 目标</option>
                      <option value="le">库存 ≤ 目标</option>
                    </select>
                  </div>
                  <div class="form-control">
                    <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">目标数量</span></label>
                    <input v-model.number="targetCount" type="number" class="input input-bordered input-xs w-full text-center bg-base-200" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="close">取消</button>
          <button class="btn btn-primary" :disabled="!selectedActionKey" @click="handleAdd">确认添加</button>
        </div>
      </div>
      <div class="modal-backdrop" @click="close"></div>
    </div>
  </Teleport>
</template>
