<script setup lang="ts">
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import SearchableSelect from '@/components/SearchableSelect.vue'
import { usePackStore } from '@/stores/modules/pack'
import { getItem } from '@/data/items'

const props = withDefaults(defineProps<{
  loopUntil: boolean | undefined
  targetItem: string
  targetCount: number
  conditionType: string
  /** 外部传入的所有可选物品列表，用于监控设置 */
  allItems: { value: string; label: string }[]
  /** 模式：'loop' (ActionModal风格) 或 'pre' (ProductionView配置风格) */
  mode?: 'loop' | 'pre'
}>(), {
  mode: 'loop'
})

const emit = defineEmits<{
  (e: 'update:loopUntil', val: boolean): void
  (e: 'update:targetItem', val: string): void
  (e: 'update:targetCount', val: number): void
  (e: 'update:conditionType', val: string): void
}>()

const packStore = usePackStore()

const localLoopUntil = computed({
  get: () => !!props.loopUntil,
  set: (val) => emit('update:loopUntil', val)
})

const localTargetItem = computed({
  get: () => props.targetItem,
  set: (val) => emit('update:targetItem', val)
})

const localTargetCount = computed({
  get: () => props.targetCount,
  set: (val) => emit('update:targetCount', val)
})

const localConditionType = computed({
  get: () => props.conditionType,
  set: (val) => emit('update:conditionType', val)
})

function reset() {
  emit('update:targetItem', '')
  emit('update:loopUntil', false)
  emit('update:targetCount', 0)
}
</script>

<template>
  <div class="mt-3 p-3 bg-base-300 rounded-xl space-y-2 transition-all">
    <div class="flex items-center justify-between py-0">
      <label class="label cursor-pointer justify-start gap-2 py-0 text-xs font-bold"
             :class="mode === 'loop' ? 'text-secondary' : 'text-warning'">
        <input type="checkbox" v-model="localLoopUntil" class="checkbox checkbox-xs" 
               :class="mode === 'loop' ? 'checkbox-secondary' : 'checkbox-warning'" />
        <span v-if="mode === 'loop'">持续执行直到库存满足条件 (生产中心模式)</span>
        <span v-else>循环直到条件满足</span>
      </label>
      <button v-if="localTargetItem" @click="reset" class="btn btn-ghost btn-xs opacity-40 hover:opacity-100 px-1 text-[10px]">
        重置
      </button>
    </div>
    
    <div v-if="localLoopUntil || mode === 'pre'" class="space-y-2 pt-1 border-t border-base-content/10 mt-1">
      <div v-if="mode === 'pre' && !localLoopUntil" class="text-[10px] opacity-50 px-1">
        满足以下条件时，该步骤才会被加入执行队列。
      </div>

      <div class="form-control">
        <div class="flex justify-between items-center px-1">
          <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">监控物品</span></label>
          <span v-if="localTargetItem" class="text-[10px] opacity-40 italic">
            当前: {{ packStore.getItemQuantity(localTargetItem) }}
            <template v-if="getItem(localTargetItem)?.durable">
              (耐: {{ packStore.getTotalDurability(localTargetItem).toFixed(1) }})
            </template>
          </span>
        </div>
        <SearchableSelect
          v-model="localTargetItem"
          :options="allItems"
          placeholder="选择监控的目标物品"
          size="xs"
          append-to-body
          clearable
        />
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="form-control">
          <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">判断逻辑</span></label>
          <select v-model="localConditionType" class="select select-bordered select-xs w-full bg-base-200">
            <template v-if="mode === 'loop'">
              <option value="ge">库存 ≥ 目标</option>
              <option value="le">库存 ≤ 目标</option>
            </template>
            <template v-else>
              <option value=">">库存 &gt; 目标</option>
              <option value="<">库存 &lt; 目标</option>
              <option value=">=">库存 ≥ 目标</option>
              <option value="<=">库存 ≤ 目标</option>
              <option value="==">库存 等于</option>
              <option value="!=">库存 不等于</option>
            </template>
          </select>
        </div>
        <div class="form-control">
          <label class="label py-0"><span class="label-text-alt text-[10px] opacity-60">目标数量</span></label>
          <input v-model.number="localTargetCount" type="number" class="input input-bordered input-xs w-full text-center bg-base-200" />
        </div>
      </div>
    </div>
  </div>
</template>
