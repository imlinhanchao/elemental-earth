<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import GameTip from '@/components/GameTip.vue'

const emit = defineEmits<{
  (e: 'cancel'): void
}>()

const stateStore = useStateStore()
let timer: ReturnType<typeof setInterval> | null = null

const remainingMs = ref(0)

const remainingSeconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

const remainingLabel = computed(() => {
  const s = remainingSeconds.value
  if (s <= 0) return '即将完成…'
  if (s < 60) return `剩余 ${s} 秒`
  const min = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `剩余 ${min} 分 ${sec} 秒` : `剩余 ${min} 分钟`
})

function updateProgress() {
  if (!stateStore.isSwitching) {
    remainingMs.value = 0
    stopTimer()
    return
  }
  const elapsed = Date.now() - stateStore.state.switchStartTime
  remainingMs.value = Math.max(0, stateStore.state.switchDuration - elapsed)

  if (stateStore.switchProgress >= 1) {
    stateStore.completeSwitch()
    stopTimer()
  }
}

function startTimer() {
  stopTimer()
  updateProgress()
  timer = setInterval(updateProgress, 200)
}

function stopTimer() {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

function handleCancel() {
  stopTimer()
  stateStore.cancelSwitch()
  emit('cancel')
}

onMounted(async () => {
  await nextTick() // 等待 DOM 更新，确保界面正确显示切换状态
  // 如果刷新后切换已完成（耗尽了），立即完成
  if (stateStore.isSwitching && stateStore.switchProgress >= 1) {
    stateStore.completeSwitch()
    return
  }
  // 否则启动计时
  if (stateStore.isSwitching) {
    startTimer()
  }
})

onUnmounted(() => stopTimer())
</script>
<template>
  <Teleport to="body">
    <div v-if="stateStore.isSwitching" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div class="bg-base-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-base-300">
        <!-- 标题 -->
        <div class="text-center mb-6">
          <h3 class="text-xl font-bold">切换地图中</h3>
          <p class="text-sm text-base-content/60 mt-1">请稍候</p>
        </div>

        <!-- 地图前后对比 -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="flex flex-col items-center gap-1">
            <Icon :icon="stateStore.getMap?.icon || 'tabler:map-filled'" class="text-3xl" />
            <span class="text-sm font-medium">{{ stateStore.getMap?.name }}</span>
          </div>
          <Icon icon="tabler:arrow-right" class="text-xl text-base-content/50" />
          <div class="flex flex-col items-center gap-1">
            <Icon :icon="stateStore.getSwitchTargetMap?.icon || 'tabler:map-filled'" class="text-3xl" />
            <span class="text-sm font-medium">{{ stateStore.getSwitchTargetMap?.name }}</span>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="mb-4">
          <progress class="progress progress-primary w-full h-4" :value="stateStore.switchProgress * 100" max="100"></progress>
        </div>

        <!-- 百分比 + 倒计时 -->
        <div class="flex justify-between items-center mb-6">
          <span class="text-lg font-mono font-bold">{{ Math.round(stateStore.switchProgress * 100) }}%</span>
          <span class="text-sm text-base-content/70">{{ remainingLabel }}</span>
        </div>

        <!-- 游戏小贴士 -->
        <div class="mb-6">
          <GameTip />
        </div>

        <!-- 取消按钮 -->
        <button class="btn btn-outline btn-error w-full" @click="handleCancel">
          <Icon icon="tabler:x" class="text-lg" />
          取消切换
        </button>
      </div>
    </div>
  </Teleport>
</template>
