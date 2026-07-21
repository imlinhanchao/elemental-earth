<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductionStore } from '@/stores/modules/production'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { useTaskStore } from '@/stores/modules/task'
import { Maps } from '@/data/maps'
import Icon from '@/components/Icon.vue'

const productionStore = useProductionStore()
const stateStore = useStateStore()
const packStore = usePackStore()
const taskStore = useTaskStore()

const newName = ref('')
const selectedCycles = ref(1)

function handleSaveDraft() {
  if (!newName.value || productionStore.draftSteps.length === 0) return
  productionStore.saveProductionLine(newName.value)
  newName.value = ''
}

function handleExecute(id: string) {
  productionStore.executeProductionLine(id, selectedCycles.value)
}

function getMapName(key: string) {
  return Maps.find(m => m.key === key)?.name || key
}
</script>

<template>
  <div class="p-4 max-w-4xl mx-auto space-y-6 pb-24">
    <!-- 头部说明 -->
    <div class="flex items-center gap-4 mb-4 lg:mb-8 mt-2">
      <div class="bg-primary px-3 py-3 rounded-2xl flex items-center justify-center">
        <Icon icon="fluent:factory-16-filled" class="text-3xl text-primary-content" />
      </div>
      <div>
        <h1 class="text-2xl lg:text-3xl font-bold">自动化生产线</h1>
        <p class="text-xs lg:text-sm text-base-content/60">组合已完成的行动与配方，实现大规模自动化执行。</p>
      </div>
    </div>

    <!-- 正在编辑的草稿 -->
    <div class="card bg-base-100 border border-base-300 shadow-sm overflow-hidden">
      <div class="bg-base-200/50 px-6 py-4 border-b border-base-300 flex justify-between items-center">
        <h2 class="font-bold flex items-center gap-2">
          <Icon icon="fluent:edit-16-filled" />
          当前设计草稿
        </h2>
        <span class="badge badge-sm badge-neutral" v-if="productionStore.draftSteps.length > 0">
          {{ productionStore.draftSteps.length }} 个步骤
        </span>
      </div>
      
      <div class="p-6">
        <div v-if="productionStore.draftSteps.length === 0" class="text-center py-10 lg:py-12 text-base-content/40 space-y-3">
          <Icon icon="fluent:box-20-regular" class="text-5xl opacity-20" />
          <div class="space-y-1">
            <p class="text-sm">尚未添加任何步骤</p>
            <p class="text-[10px] opacity-70">在“制造”页面的行动或“实验室”的配方中选择“加入生产线”</p>
          </div>
        </div>

        <div v-else class="space-y-4">
          <!-- 步骤列表 -->
          <ul class="list bg-base-200/30 rounded-box border border-base-300 divide-y divide-base-300">
            <li v-for="(step, idx) in productionStore.draftSteps" :key="idx" class="list-row items-center p-3">
              <div class="text-base-content/30 font-mono w-8 text-center text-xs">{{ idx + 1 }}</div>
              <div class="list-col-grow">
                <div class="flex items-center gap-2">
                  <Icon :icon="step.type === 'action' ? 'fluent:puzzle-cube-16-filled' : 'fluent:beaker-16-filled'" 
                        :class="step.type === 'action' ? 'text-primary' : 'text-secondary'" />
                  <span class="font-medium text-sm">{{ step.name }}</span>
                  <span class="text-[10px] opacity-50 px-1 bg-base-300 rounded">{{ step.type === 'action' ? '行动' : '实验室' }}</span>
                </div>
              </div>
              <button @click="productionStore.removeStepFromDraft(idx)" class="btn btn-ghost btn-sm text-error btn-square">
                <Icon icon="fluent:delete-16-regular" />
              </button>
            </li>
          </ul>

          <!-- 保存表单 -->
          <div class="flex flex-col sm:flex-row gap-3 items-end pt-4">
            <label class="floating-label grow w-full">
              <input v-model="newName" type="text" placeholder="生产线名称" class="input w-full" />
              <span>生产线名称 (例如: 粗制硝酸工厂)</span>
            </label>
            <div class="flex gap-2 w-full sm:w-auto">
              <button @click="handleSaveDraft" class="btn btn-primary grow sm:grow-0" :disabled="!newName">
                <Icon icon="fluent:save-16-filled" />
                保存
              </button>
              <button @click="productionStore.clearDraft()" class="btn btn-ghost text-error">
                <Icon icon="fluent:dismiss-16-regular" />
                清空
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 已保存的生产线 -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold flex items-center gap-2 px-2">
        <Icon icon="fluent:bookmark-multiple-16-filled" class="text-primary" />
        已配置生产线
      </h2>
      
      <div v-if="productionStore.productionLines.length === 0" class="card bg-base-100 border border-dashed border-base-300 p-12 text-center text-base-content/40 text-sm">
        暂无保存的生产线
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="line in productionStore.productionLines" :key="line.id" 
             class="card bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-all">
          <div class="card-body p-5">
            <div class="flex justify-between items-start mb-3">
              <h3 class="card-title text-lg font-bold flex items-center gap-2">
                <Icon icon="fluent:factory-16-regular" class="text-primary" />
                {{ line.name }}
              </h3>
              <div class="flex gap-1">
                <button @click="productionStore.removeProductionLine(line.id)" class="btn btn-ghost btn-xs btn-square text-error/60 hover:text-error">
                   <Icon icon="fluent:delete-12-regular" />
                </button>
              </div>
            </div>

            <!-- 步骤展示 -->
            <div class="text-xs space-y-1 mb-4 opacity-70">
              <div v-for="(step, idx) in line.steps.slice(0, 3)" :key="idx" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-base-300 flex items-center justify-center text-[8px] font-bold">{{ idx+1 }}</span>
                <span class="truncate">{{ step.name }}</span>
              </div>
              <div v-if="line.steps.length > 3" class="pl-5 italic">等 {{ line.steps.length }} 个步骤...</div>
            </div>

            <!-- 地图适配警示 -->
            <div v-if="!productionStore.validateMapCompatibility(line).ok" class="alert alert-soft alert-warning p-2 mb-4 rounded-xl text-[10px] leading-tight">
              <Icon icon="fluent:warning-16-filled" class="shrink-0" />
              <span>当前地图 {{ getMapName(stateStore.state.map) }} 条件不符</span>
            </div>

            <div class="card-actions flex-nowrap items-center gap-2 border-t border-base-200 pt-4">
              <div class="join grow">
                <span class="join-item btn btn-sm no-animation bg-base-200 border-base-300 font-normal">循环</span>
                <input v-model.number="selectedCycles" type="number" min="1" max="100" class="join-item input input-sm w-full text-center border-base-300" />
              </div>
              <button @click="handleExecute(line.id)" class="btn btn-sm btn-primary px-6"
                      :disabled="!productionStore.validateMapCompatibility(line).ok || taskStore.tasks.length >= 100">
                <Icon icon="fluent:play-16-filled" />
                启动
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 提示区 -->
    <div class="alert alert-soft p-4 rounded-2xl flex items-start gap-4">
      <Icon icon="fluent:info-16-filled" class="text-info text-xl shrink-0 mt-1" />
      <div class="text-sm space-y-1">
        <p class="font-bold">生产线规则：</p>
        <ul class="list-disc list-inside opacity-70 text-[11px] lg:text-xs">
          <li>单条生产线步骤组合上限为 20。</li>
          <li>启动后，所有任务将按顺序加入待办队列。</li>
          <li>若中间某个任务因材料短缺无法完成，后续任务将继续尝试。</li>
          <li>行动类步骤会严格检查当前地图是否支持（部分行动仅限特定地图）。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-row:last-child {
  border-bottom: none;
}
</style>

