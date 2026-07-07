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
  return packStore.items
})

const displayTasks = computed(() => {
  const allTasks = taskStore.getTasks
  if (!appStore.foldTasks) return allTasks.map(t => ({ task: t, count: 1 }))
  
  const groups: { task: any; count: number }[] = []
  for (const t of allTasks) {
    const last = groups[groups.length - 1]
    if (last && last.task.name === t.name && last.task.type === t.type && last.task.key === t.key) {
      last.count++
    } else {
      groups.push({ task: t, count: 1 })
    }
  }
  return groups
})
</script>

<template>
  <div v-if="showSummary" class="flex flex-col gap-1 p-2 bg-base-200/50 border-b border-base-300 text-xs shadow-inner">
    <!-- 背包摘要 (左侧栏关闭时显示) -->
    <div v-if="!appStore.leftSidebarOpen" class="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <Icon icon="raphael:package" class="opacity-40 flex-none" />
      <span class="opacity-50 flex-none font-bold">背包:</span>
      <section class="flex items-center gap-1 overflow-x-auto">
        <div v-for="item in summaryItems" :key="item.key" class="badge badge-sm badge-ghost gap-1 px-1.5 h-6 flex-none">
          <span class="max-w-16 truncate">{{ packStore.getDisplayName(item.key) }}</span>
          <span class="opacity-70 font-mono">x{{ item.quantity }}</span>
        </div>
      </section>
      <span v-if="packStore.items.length === 0" class="opacity-50">空</span>
    </div>

    <!-- 任务摘要 (右侧栏关闭时显示) -->
    <div v-if="!appStore.rightSidebarOpen" class="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <Icon icon="tabler:list-details" class="opacity-40 flex-none" />
      <span class="opacity-50 flex-none font-bold">任务:</span>
      <section class="flex items-center gap-1">
        <div v-for="(item, index) in displayTasks" :key="index" class="badge badge-sm badge-primary gap-1 px-1.5 h-6 text-[10px] flex-none">
          <span class="max-w-24 truncate">{{ item.task.name }}</span>
          <span v-if="item.count > 1" class="opacity-70 font-mono">x{{ item.count }}</span>
        </div>
      </section>
      <span v-if="displayTasks.length === 0" class="opacity-50 text-[10px] badge">无</span>
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
