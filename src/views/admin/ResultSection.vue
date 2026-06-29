<template>
  <div class="card bg-base-200">
    <div class="card-body p-3">
      <h3 class="font-bold text-sm">
        {{ title }}
        <span class="badge badge-sm">{{ items.length }}</span>
        <span class="text-xs font-normal opacity-50 ml-2">已选 {{ checkedCount }}</span>
      </h3>
      <div v-if="items.length === 0" class="text-xs text-base-content/40 py-2">（未生成）</div>
      <div v-for="(item, idx) in items" :key="item.key || idx"
        class="flex items-center gap-2 border-t border-base-300 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
        <input type="checkbox" class="checkbox checkbox-xs" v-model="checked[idx]" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm truncate">{{ item.name || item.key }}</span>
            <span class="text-xs text-base-content/40 shrink-0">{{ item.key }}</span>
          </div>
          <p class="text-xs text-base-content/60 truncate">{{ item.description }}</p>
        </div>
        <button class="btn btn-xs btn-ghost shrink-0" @click="$emit('edit', type, idx)"><Icon icon="tabler:edit" class="text-xs" /></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  items: any[]
  type: string
  checked: boolean[]
}>()

defineEmits<{ edit: [type: string, idx: number] }>()

const checkedCount = computed(() => props.checked.filter(Boolean).length)
</script>
