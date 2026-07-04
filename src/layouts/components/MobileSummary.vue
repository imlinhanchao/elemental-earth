<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/modules/app'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { useTutorialStore } from '@/stores/modules/tutorial'

const appStore = useAppStore()
const packStore = usePackStore()
const taskStore = useTaskStore()
const tutorialStore = useTutorialStore()

const showSummary = computed(() => {
  return appStore.isMobile && (!appStore.leftSidebarOpen || !appStore.rightSidebarOpen)
})

const summaryItems = computed(() => {
  return packStore.items.slice(0, 5)
})

const tasks = computed(() => taskStore.getTasks)
</script>

<template>
  <div v-if="showSummary" class="flex flex-col gap-1 p-2 bg-base-200/50 border-b border-base-300 text-xs shadow-inner">
    <!-- 背包摘要 (左侧栏关闭时显示) -->
    <div v-if="!appStore.leftSidebarOpen" class="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <Icon icon="raphael:package" class="opacity-40 flex-none" />
      <span class="opacity-50 flex-none font-bold">背包:</span>
      <section class="truncate">
        <div v-for="item in summaryItems" :key="item.key" class="badge badge-sm badge-ghost gap-1 px-1.5 h-6">
          <span class="max-w-16 truncate">{{ packStore.getDisplayName(item.key) }}</span>
          <span class="opacity-70 font-mono">x{{ item.quantity }}</span>
        </div>
      </section>
      <span v-if="packStore.items.length === 0" class="opacity-50">空</span>
    </div>

    <!-- 任务摘要 (右侧栏关闭时显示) -->
    <div v-if="!appStore.rightSidebarOpen" class="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <Icon icon="tabler:list-details" class="opacity-40" />
      <span class="opacity-50 flex-none font-bold">任务:</span>
      <div v-for="task in tasks.slice(0, 3)" :key="task.id" class="badge badge-sm badge-primary gap-1 px-1.5 h-6 text-[10px]">
        <span class="max-w-24 truncate">{{ task.name }}</span>
      </div>
      <span v-if="tasks.length > 3" class="opacity-30 text-[10px]">等{{ tasks.length }}个</span>
      <span v-if="tasks.length === 0" class="opacity-50 text-[10px] badge">无</span>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
