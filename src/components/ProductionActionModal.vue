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

const availableActions = computed(() => {
  return Actions.filter(a => {
    // 基础过滤：必须有科技解锁 (或者没有科技要求)
    if (a.required_techs && !a.required_techs.every(t => packStore.techs.includes(t))) return false
    
    // 必须在当前地图可用
    if (a.map && !a.map.includes(stateStore.state.map)) return false

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

  productionStore.addStepToDraft({
    type: 'action',
    key: currentAction.value.key,
    name: currentAction.value.name,
    payload
  }, count.value)

  emit('close')
  selectedActionKey.value = ''
  count.value = 1
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
              <button class="btn btn-sm join-item" @click="count = Math.max(1, count - 1)">-</button>
              <input v-model.number="count" type="number" min="1" class="input input-sm input-bordered join-item grow text-center" />
              <button class="btn btn-sm join-item" @click="count++">+</button>
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
