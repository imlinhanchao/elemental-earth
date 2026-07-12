<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import { Eras } from '@/data/eras'
import { Icon } from '@iconify/vue'

const emit = defineEmits(['close'])
const stateStore = useStateStore()

// 默认显示玩家当前正在进行的时代（stateStore.currentEra）及其下一个
const currentEraKey = computed(() => stateStore.state.currentEra)
const currentEraData = computed(() => Eras.find(e => e.key === currentEraKey.value))
const defaultViewingIndex = computed(() => currentEraData.value?.order || 0)

const viewingIndex = ref(defaultViewingIndex.value)

// 右侧卡片：当前查看的主角时代
const viewingEra = computed(() => Eras.find(e => e.order === viewingIndex.value))
// 左侧卡片：焦点时代的上一个时代
const prevEraPreview = computed(() => Eras.find(e => e.order === viewingIndex.value - 1))

// 状态判断
function isEraCompleted(eraOrder: number) {
  const currentOrder = currentEraData.value?.order || 0
  return eraOrder < currentOrder
}

function isEraInProgress(eraOrder: number) {
  const currentOrder = currentEraData.value?.order || 0
  return eraOrder === currentOrder
}

function isMilestoneCompleted(key: string) {
  return stateStore.state.completedMilestones.includes(key)
}

function prevEra() {
  if (viewingIndex.value > 0) viewingIndex.value--
}

function nextEra() {
  // 不允许翻过玩家当前正在攻克的时代
  if (viewingIndex.value < (currentEraData.value?.order || 0)) {
    viewingIndex.value++
  }
}

function getEraProgress(era: any) {
  if (isEraCompleted(era.order)) return 100
  if (!isEraInProgress(era.order)) return 0
  return stateStore.eraProgress * 100
}
</script>

<template>
  <dialog id="era_detail_modal" class="modal modal-open" @click.self="emit('close')">
    <div class="modal-box max-w-4xl bg-base-100 p-0 overflow-hidden flex flex-col h-[700px]">
      <!-- 头部控制 -->
      <header class="p-4 bg-base-200 border-b border-base-300 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-4">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <Icon icon="tabler:history" class="text-primary" />
            文明史册
          </h3>
          <div class="join bg-base-100 border border-base-300">
            <button class="btn btn-xs join-item" :disabled="viewingIndex <= 0" @click="prevEra">
              <Icon icon="tabler:chevron-left" />
            </button>
            <div class="px-3 flex items-center text-xs font-mono min-w-24 justify-center">
              焦点纪元: {{ viewingIndex + 1 }}
            </div>
            <button class="btn btn-xs join-item" :disabled="viewingIndex >= (currentEraData?.order || 0)" @click="nextEra">
              <Icon icon="tabler:chevron-right" />
            </button>
          </div>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" @click="emit('close')">✕</button>
      </header>
      
      <!-- 内容区：显示当前焦点时代及其前序时代的对比 -->
      <div class="flex-1 overflow-y-auto p-6 bg-base-300/30">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          <!-- 左侧卡片：前序时代 -->
          <div v-if="prevEraPreview" class="card bg-base-100 shadow-xl border border-base-300 opacity-80 scale-95 origin-right transition-all">
            <div class="card-body p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <Icon :icon="prevEraPreview.icon" class="text-3xl" />
                  </div>
                  <div>
                    <h2 class="card-title text-xl font-black opacity-60">{{ prevEraPreview.name }}</h2>
                    <div class="badge badge-success badge-xs">历史纪元</div>
                  </div>
                </div>
                <div class="text-right font-mono text-sm opacity-50">#{{ prevEraPreview.order + 1 }}</div>
              </div>

              <p class="text-sm opacity-40 mb-6 min-h-[3em]">{{ prevEraPreview.description }}</p>

              <!-- 进度指示（历史时代总是 100%） -->
              <div class="space-y-2 mb-6 opacity-40">
                <div class="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                  <span>时代完成进度</span>
                  <span>100%</span>
                </div>
                <progress class="progress progress-success w-full h-2" :value="100" max="100"></progress>
              </div>

              <!-- 里程碑列表 -->
              <div class="space-y-3">
                <h4 class="text-xs font-bold opacity-40">达成的里程碑</h4>
                <div class="space-y-2">
                  <div 
                    v-for="m in prevEraPreview.milestones" 
                    :key="m.key"
                    class="flex items-center gap-2 p-2 rounded-lg text-xs border border-success/20 bg-success/5 text-success/60"
                  >
                    <Icon icon="tabler:circle-check-filled" class="text-lg flex-none" />
                    <span>{{ m.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 无前序时代占位 -->
          <div v-else class="card bg-base-200 border border-dashed border-base-300 h-full flex items-center justify-center min-h-[400px] opacity-30">
            <div class="text-center p-8 space-y-2">
              <Icon icon="tabler:origin" class="text-4xl mx-auto" />
              <h3 class="font-bold">文明之源</h3>
              <p class="text-xs">在一切开始之前...</p>
            </div>
          </div>

          <!-- 右侧卡片：当前焦点时代 -->
          <div v-if="viewingEra" class="card bg-base-100 shadow-2xl border-2 border-primary/20 relative z-20">
            <div class="card-body p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-12 h-12 rounded-xl flex items-center justify-center"
                    :class="isEraCompleted(viewingEra.order) ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'"
                  >
                    <Icon :icon="viewingEra.icon" class="text-3xl" />
                  </div>
                  <div>
                    <h2 class="card-title text-xl font-black">{{ viewingEra.name }}</h2>
                    <div class="flex gap-1 mt-0.5">
                      <div v-if="isEraCompleted(viewingEra.order)" class="badge badge-success badge-xs">已达成</div>
                      <div v-else class="badge badge-primary badge-xs">演进中</div>
                    </div>
                  </div>
                </div>
                <div class="text-right font-mono text-sm opacity-50">#{{ viewingEra.order + 1 }}</div>
              </div>

              <p class="text-sm opacity-70 mb-6 min-h-[3em]">{{ viewingEra.description }}</p>

              <!-- 进度指示 -->
              <div class="space-y-2 mb-6">
                <div class="flex justify-between text-[10px] uppercase font-bold tracking-widest opacity-40">
                  <span>时代完成进度</span>
                  <span>{{ getEraProgress(viewingEra).toFixed(0) }}%</span>
                </div>
                <progress 
                  class="progress w-full h-2 shadow-inner" 
                  :class="isEraCompleted(viewingEra.order) ? 'progress-success' : 'progress-primary'"
                  :value="getEraProgress(viewingEra)" 
                  max="100"
                ></progress>
              </div>

              <!-- 里程碑列表 -->
              <div class="space-y-3">
                <h4 class="text-xs font-bold opacity-40">纪元里程碑</h4>
                <div class="space-y-2">
                  <div 
                    v-for="m in viewingEra.milestones" 
                    :key="m.key"
                    class="flex items-center gap-2 p-2 rounded-lg text-xs border border-base-200 transition-colors"
                    :class="isMilestoneCompleted(m.key) ? 'bg-success/5 border-success/20 text-success' : 'bg-base-200 opacity-60'"
                  >
                    <Icon :icon="isMilestoneCompleted(m.key) ? 'tabler:circle-check-filled' : 'tabler:circle'" class="text-lg flex-none" />
                    <span>{{ m.description }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 底部提示 -->
      <footer class="p-4 bg-base-200 border-t border-base-300 flex justify-center shrink-0">
        <div class="flex items-center gap-2 text-xs opacity-50 italic">
          <Icon icon="tabler:bulb" />
          <span>点击 Header 时代图标可随时回到此页面查看文明进程</span>
        </div>
      </footer>
    </div>
    <form method="dialog" class="modal-backdrop" @click="emit('close')">
      <button>close</button>
    </form>
  </dialog>
</template>
