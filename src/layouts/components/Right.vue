<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Task from '@/components/Task.vue';
import { useAppStore } from '@/stores/modules/app'
import { useTaskStore, type ITask } from '@/stores/modules/task'
import { useLogStore } from '@/stores/modules/log'
import { useTutorialStore } from '@/stores/modules/tutorial'
import { useProductionStore } from '@/stores/modules/production'
import { useStateStore } from '@/stores/modules/state'
import { useRouter, useRoute } from 'vue-router'
import { Maps } from '@/data/maps'
import Icon from '@/components/Icon.vue'

const appStore = useAppStore()
const taskStore = useTaskStore()
const logStore = useLogStore()
const tutorialStore = useTutorialStore()
const productionStore = useProductionStore()
const stateStore = useStateStore()
const router = useRouter()
const route = useRoute()

// const tasks = taskStore.tasks
const currentMapKey = computed(() => stateStore.state.map)
const viewingMapKey = computed(() => taskStore.viewingMap || currentMapKey.value)
const tasks = computed(() => {
  const key = viewingMapKey.value || currentMapKey.value;
  if (!taskStore.tasksMap[key]) {
    taskStore.tasksMap[key] = [];
  }
  return taskStore.tasksMap[key];
});

// 地图切换相关
const mapsWithTasks = computed(() => {
  const activeMaps = Object.keys(taskStore.tasksMap).filter(k => taskStore.tasksMap[k]?.length > 0)
  // 始终包含当前地图，或者当前查看的地图
  const set = new Set([currentMapKey.value, viewingMapKey.value, ...activeMaps])
  return Array.from(set).map(k => Maps.find(m => m.key === k)).filter(Boolean) as any[]
})

const selectMap = (key: string) => {
  if (key === currentMapKey.value) {
    taskStore.viewingMap = ''
  } else {
    taskStore.viewingMap = key
  }
}

const isReadOnly = computed(() => viewingMapKey.value !== currentMapKey.value)

watch(
  () => tasks.value.length,
  (newLength) => {
    if (newLength === 0) {
      document.title = '元素纪元';
    }
  }
);

const logStyles: Record<string, { icon: string; iconColor: string }> = {
  process:     { icon: 'tabler:arrows-right',  iconColor: 'text-base-content' },
  reward:      { icon: 'tabler:gift',          iconColor: 'text-success' },
  lab:         { icon: 'tabler:flask',         iconColor: 'text-info' },
  craft:       { icon: 'tabler:hammer',        iconColor: 'text-warning' },
  elements:    { icon: 'tabler:atom',          iconColor: 'text-warning' },
  tech:        { icon: 'ic:sharp-biotech',     iconColor: 'text-info' },
  tip:         { icon: 'tabler:bulb',          iconColor: 'text-warning' },
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
  const allTasks = taskStore.tasks
  if (!appStore.foldTasks) return allTasks.map(t => ({ task: t, ids: [t.id], count: 1 }))
  
  const groups: { task: ITask; ids: (number | string)[]; count: number }[] = []
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

const showDraftModule = computed(() => {
  return productionStore.draftSteps.length > 0 && route.name !== 'Production'
})
</script>

<template>
    <aside
        class="bg-base-100 border-l border-base-300 flex-none transition-all duration-300 flex flex-col"
        :class="[
            appStore.rightSidebarOpen ? (appStore.isMobile ? 'w-[80vw]' : 'w-72 p-2') : 'w-0 overflow-hidden',
            tutorialStore.isTutorialActive ? 'z-[100]' : ''
        ]"
    >
        <!-- 核心草稿提示 -->
        <section v-if="showDraftModule" class="mb-4 bg-primary/5 rounded-xl border border-primary/20 overflow-hidden shrink-0">
          <header class="bg-primary/10 px-3 py-2 flex items-center justify-between">
            <div class="text-[10px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <Icon icon="icon-park-outline:robot-two" />
              <span>生产线草稿</span>
            </div>
            <button @click="router.push('/production')" class="btn btn-ghost btn-xs text-primary scale-90">
              去保存
            </button>
          </header>
          <div class="p-2 space-y-1">
            <div v-for="(step, idx) in productionStore.draftSteps.slice(0, 5)" :key="idx" class="flex items-center gap-2 text-[10px] opacity-70">
              <Icon :icon="step.type === 'action' ? 'fluent:puzzle-cube-16-filled' : 'fluent:beaker-16-filled'" 
                    class="text-[9px]" :class="step.type === 'action' ? 'text-primary' : 'text-secondary'" />
              <span class="truncate">{{ step.name }}</span>
              <span v-if="step.count > 1" class="font-bold">x{{ step.count }}</span>
            </div>
            <div v-if="productionStore.draftSteps.length > 5" class="text-[9px] opacity-40 italic pl-4">
              等 {{ productionStore.draftSteps.length }} 个步骤...
            </div>
          </div>
        </section>

        <!-- 上半：任务队列 -->
        <section class="flex-1 min-h-0 overflow-y-auto mb-1">
            <header class="bg-base-100 sticky top-0 z-10 flex items-center justify-between">
              <div class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1 px-1 flex items-center gap-1">
                <span>任务队列 <span v-if="isReadOnly" class="text-warning text-[9px] normal-case opacity-60">(查看模式)</span></span>
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
              <div v-if="tasks.length > 0 && !isReadOnly" class="flex justify-end mb-1 px-1">
                <button class="btn btn-ghost btn-xs text-base-content/30 hover:text-base-content/60 transition-colors" @click="taskStore.clearTasks()">清空</button>
              </div>
            </header>
            <div v-if="tasks.length === 0" class="text-[11px] text-base-content/20 px-1">空闲中</div>
            <div v-else class="flex gap-1 flex-wrap">
                <Task 
                    v-for="(item, i) in displayTasks" 
                    :key="item.task.id" 
                    :task="item.task" 
                    :ids="item.ids"
                    :count="item.count"
                    :show-in-title="i === 0"
                    :read-only="isReadOnly"
                />
            </div>
        </section>

        <!-- 地图切换 Tabs -->
        <div v-if="mapsWithTasks.length > 1" class="px-2 py-1 mb-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-t border-base-300 bg-base-200/30">
          <template
            v-for="m in mapsWithTasks" 
            :key="m.key"
          >
            <button 
              v-if="taskStore.tasksMap[m.key]?.length" 
              class="badge badge-sm cursor-pointer whitespace-nowrap transition-all border-none "
              :class="viewingMapKey === m.key ? 'badge-primary' : 'badge-ghost opacity-40 hover:opacity-100'"
              @click="selectMap(m.key)"
              :data-tip="m.name + ' (' + taskStore.tasksMap[m.key].length + ' 个任务)'"
            >
              <Icon :icon="m.icon || 'tabler:map-filled'" class="text-xs mr-1" />
            </button>
          </template>
        </div>

        <!-- 下半：日志 -->
        <section class="flex-1 min-h-0 overflow-y-auto border-t border-base-300/50 relative">
            <header class="bg-base-100 sticky top-0 z-10 p-2">
                <div class="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider flex items-center justify-between">
                    <span>日志</span>
                    <div v-if="typeEntries.length > 1" class="flex flex-wrap gap-0">
                        <button
                            v-for="[type, style] in typeEntries"
                            :key="type"
                            class="btn-ghost btn-circle text-[10px] btn btn-xs"
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