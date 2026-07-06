<script setup lang="ts">
import { ref, computed } from 'vue'
import Task from '@/components/Task.vue';
import { useAppStore } from '@/stores/modules/app'
import { useTaskStore, type ITask } from '@/stores/modules/task'
import { useLogStore } from '@/stores/modules/log'
import { useTutorialStore } from '@/stores/modules/tutorial'

const appStore = useAppStore()
const taskStore = useTaskStore()
const logStore = useLogStore()
const tutorialStore = useTutorialStore()
const tasks = taskStore.getTasks

const logStyles: Record<string, { icon: string; iconColor: string }> = {
  process:     { icon: 'tabler:arrows-right',  iconColor: 'text-base-content' },
  reward:      { icon: 'tabler:gift',          iconColor: 'text-success' },
  lab:         { icon: 'tabler:flask',         iconColor: 'text-info' },
  craft:       { icon: 'tabler:hammer',        iconColor: 'text-warning' },
  elements:    { icon: 'tabler:atom',          iconColor: 'text-warning' },
  tech:        { icon: 'tabler:bulb',          iconColor: 'text-info' },
  warning:     { icon: 'tabler:alert-triangle', iconColor: 'text-warning' },
  'main-event': { icon: 'tabler:star',         iconColor: 'text-primary' },
  'sub-event':  { icon: 'tabler:dots',         iconColor: 'text-base-content' },
}

function logStyle(type: string) {
  return logStyles[type] || logStyles.process
}

// ---- 日志类型过滤 ----
const hiddenTypes = ref<Set<string>>(new Set())

function toggleType(type: string) {
  const s = new Set(hiddenTypes.value)
  if (s.has(type)) s.delete(type)
  else s.add(type)
  hiddenTypes.value = s
}

function isTypeVisible(type: string) {
  return !hiddenTypes.value.has(type)
}

const visibleLogs = computed(() => {
  return [...logStore.logs].reverse().filter(l => isTypeVisible(l.type))
})

const displayTasks = computed(() => {
  const allTasks = taskStore.getTasks
  if (!appStore.foldTasks) return allTasks.map(t => ({ task: t, ids: [t.id], count: 1 }))
  
  const groups: { task: ITask; ids: number[]; count: number }[] = []
  for (const t of allTasks) {
    const last = groups[groups.length - 1]
    if (last && last.task.name === t.name && last.task.type === t.type && last.task.key === t.key) {
      last.ids.push(t.id)
      last.count++
    } else {
      groups.push({ task: t, ids: [t.id], count: 1 })
    }
  }
  return groups
})

/** 连续相同内容折叠为一条 */
const collapsedLogs = computed(() => {
  const result: { content: string; type: string; count: number }[] = []
  for (const log of visibleLogs.value) {
    const last = result[result.length - 1]
    if (last && last.content === log.content && last.type === log.type) {
      last.count++
    } else {
      result.push({ content: log.content, type: log.type, count: 1 })
    }
  }
  return result
})

const typeEntries = computed(() =>
  Object.entries(logStyles).filter(([type]) =>
    logStore.logs.some(l => l.type === type)
  )
)
</script>

<template>
    <aside
        class="bg-base-100 border-l border-base-300 flex-none transition-all duration-300 flex flex-col"
        :class="[
            appStore.rightSidebarOpen ? (appStore.isMobile ? 'w-[80vw]' : 'w-72 p-2') : 'w-0 overflow-hidden',
            tutorialStore.isTutorialActive ? 'z-[100]' : ''
        ]"
    >
        <!-- 上半：任务队列 -->
        <section class="flex-1 min-h-0 overflow-y-auto mb-1">
            <header class="bg-base-100 sticky top-0 z-10 flex items-center justify-between">
              <div class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
                <span>任务队列</span>
                <button 
                  class="btn btn-ghost btn-xs p-0 h-4 min-h-0" 
                  :class="appStore.foldTasks ? 'text-primary' : 'text-base-content/30'"
                  @click="appStore.toggleFoldTasks()"
                  title="折叠相同任务"
                >
                  <Icon icon="tabler:fold" class="text-xs" />
                </button>
              </div>
              <!-- 添加清空按钮 -->
              <div v-if="tasks.length > 0" class="flex justify-end mb-1 px-1">
                <button class="btn btn-ghost btn-xs text-base-content/30 hover:text-base-content/60 transition-colors" @click="taskStore.clearTasks()">清空</button>
              </div>
            </header>
            <div v-if="tasks.length === 0" class="text-[11px] text-base-content/20 px-1">空闲中</div>
            <div v-else class="flex gap-1 flex-wrap">
                <Task 
                    v-for="item in displayTasks" 
                    :key="item.task.id" 
                    :task="item.task" 
                    :ids="item.ids"
                    :count="item.count"
                />
            </div>
        </section>

        <!-- 下半：日志 -->
        <section class="flex-1 min-h-0 overflow-y-auto border-t border-base-300/50 relative">
            <header class="bg-base-100 sticky top-0 z-10 p-2">
                <div class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider flex items-center justify-between">
                    <span>日志</span>
                    <div v-if="typeEntries.length > 1" class="flex flex-wrap gap-1">
                        <button
                            v-for="[type, style] in typeEntries"
                            :key="type"
                            class="flex btn-ghost items-center gap-0.5 rounded text-[10px] btn bg-transparent btn-xs"
                            :class="isTypeVisible(type)
                                ? ''
                                : 'opacity-40 hover:opacity-60'"
                            @click="toggleType(type)"
                            :title="`${isTypeVisible(type) ? '隐藏' : '显示'} ${type} 类型`"
                        >
                            <Icon :icon="style.icon" class="text-xs" :class="isTypeVisible(type) ? style.iconColor : ''" />
                        </button>
                    </div>
                    <button v-if="logStore.logs.length > 0" class="text-[10px] text-base-content/30 hover:text-base-content/60 transition-colors" @click="logStore.clearLogs()">清空</button>
                </div>
            </header>

            <div v-if="collapsedLogs.length === 0" class="text-[11px] text-base-content/20 px-1">暂无日志</div>
            <div v-else class="flex flex-col">
                <div
                    v-for="(log, idx) in collapsedLogs"
                    :key="idx"
                    class="flex items-start gap-1.5 px-1 py-0.5 rounded hover:bg-base-300/40 transition-colors"
                >
                    <span class="mt-0.5 shrink-0">
                        <Icon :icon="logStyle(log.type).icon" class="text-xs" :class="logStyle(log.type).iconColor" />
                    </span>
                    <span class="text-[11px] leading-snug text-base-content/70 wrap-break-word flex-1">{{ log.content }}</span>
                    <span v-if="log.count > 1" class="shrink-0 text-[10px] text-base-content/30 font-mono mt-0.5">×{{ log.count }}</span>
                </div>
            </div>
        </section>
    </aside>
</template>