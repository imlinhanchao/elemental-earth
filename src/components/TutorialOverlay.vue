<template>
  <div v-if="tutorialStore.showIntroPanel" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-base-300/60 backdrop-blur-sm">
    <div class="card w-full max-w-md bg-base-100 shadow-xl border border-primary/20 animate-in fade-in zoom-in duration-300">
      <div class="card-body gap-4 text-center">
        <div class="flex flex-col items-center gap-2">
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Icon icon="pinhead:bohr-atomic-model" size="40px" />
          </div>
          <h2 class="card-title text-2xl font-bold">欢迎来到《元素纪元》</h2>
          <p class="text-base-content/70">这是一个关于化学元素、炼金术与文明进步的放置游戏。<br />你将从蛮荒走向现代。</p>
        </div>
        
        <div class="divider">新手引导</div>
        
        <p class="text-sm text-center">
          我们建议新手玩家跟随教程，快速熟悉游戏核心流程：
          <span class="block mt-2 font-medium">采集素材 → 研究科技 → 制作工具 → 实验室反应</span>
        </p>

        <div class="card-actions justify-center mt-4">
          <button class="btn btn-ghost" @click="tutorialStore.skipTutorial">跳过教程</button>
          <button class="btn btn-primary px-8" @click="tutorialStore.startTutorial">开始游玩</button>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="tutorialStore.isTutorialActive && tutorialStore.currentStepData" 
    class="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
    
    <!-- 全屏镂空遮罩 (四块拼接，确保中间洞口可点击) -->
    <template v-if="spotlightRect">
      <div class="absolute bg-base-300/50 pointer-events-auto transition-all duration-300" 
           :style="{ top: 0, left: 0, right: 0, height: `${spotlightRect.y - 4}px` }"></div>
      <div class="absolute bg-base-300/50 pointer-events-auto transition-all duration-300" 
           :style="{ top: `${spotlightRect.y - 4}px`, left: 0, width: `${spotlightRect.x - 4}px`, height: `${spotlightRect.height + 8}px` }"></div>
      <div class="absolute bg-base-300/50 pointer-events-auto transition-all duration-300" 
           :style="{ top: `${spotlightRect.y - 4}px`, right: 0, width: `calc(100% - ${spotlightRect.x + spotlightRect.width + 4}px)`, height: `${spotlightRect.height + 8}px` }"></div>
      <div class="absolute bg-base-300/50 pointer-events-auto transition-all duration-300" 
           :style="{ top: `${spotlightRect.y + spotlightRect.height + 4}px`, left: 0, right: 0, bottom: 0 }"></div>
    </template>
    <div v-else class="absolute inset-0 bg-base-300/50 pointer-events-none"></div>

    <!-- 引导面板 -->
    <div 
      class="absolute z-10 w-[calc(100%-2rem)] max-w-sm pointer-events-auto flex items-start gap-4 transition-all duration-300"
      :style="panelPosition"
    >
      <div class="bg-base-100 shadow-2xl border-l-4 border-l-primary p-4 rounded-r-lg flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="badge badge-primary badge-sm">教程 {{ tutorialStore.currentStep }}/{{ tutorialStore.stepsCount }}</span>
          <h3 class="font-bold text-lg">{{ tutorialStore.currentStepData.title }}</h3>
        </div>
        <p class="text-sm opacity-90">{{ tutorialStore.currentStepData.content }}</p>
        
        <div class="mt-4 flex items-center justify-between">
          <div class="flex gap-2">
            <button 
              class="btn btn-xs btn-outline" 
              :disabled="tutorialStore.currentStep <= 1"
              @click="tutorialStore.currentStep--"
            >
              上一步
            </button>
            <button 
              class="btn btn-xs btn-outline" 
              :disabled="tutorialStore.currentStep >= tutorialStore.stepsCount"
              @click="tutorialStore.currentStep++"
            >
              下一步
            </button>
          </div>

          <button class="btn btn-xs btn-ghost gap-1" @click="tutorialStore.skipTutorial">
            <Icon icon="mdi:close" class="text-xs" />
            跳过教程
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTutorialStore } from '@/stores/modules/tutorial'
import Icon from '@/components/Icon.vue'
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const tutorialStore = useTutorialStore()
const route = useRoute()

const spotlightRect = ref<DOMRect | null>(null)

function updateSpotlight(shouldScroll: any = false) {
  const targetId = tutorialStore.currentStepData?.target
  if (targetId) {
    const el = document.getElementById(targetId)
    if (el) {
      spotlightRect.value = el.getBoundingClientRect()
      // 严格检查是否为 true，防止被 scroll 事件对象触发
      if (shouldScroll === true) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return true
    }
  }
  spotlightRect.value = null
  return false
}

watch([() => tutorialStore.currentStepData, () => route.path], () => {
  // 更新教程 Store 中的路径，使其触发 computed 重新计算
  tutorialStore.currentPath = route.path
  
  const targetId = tutorialStore.currentStepData?.target
  let hasScrolled = false
  let attempts = 0
  const tryUpdate = async () => {
    await nextTick() // 等待 DOM 更新
    // 只有在第一次成功找到元素时进行滚动
    const found = updateSpotlight(!hasScrolled) 
    if (found) hasScrolled = true
    
    // 即使找到了元素，也继续重试几次以应对布局抖动或动画展开
    if (attempts < 10) {
      attempts++
      setTimeout(tryUpdate, 100)
    }
  }
  tryUpdate()
}, { immediate: true, deep: true })

// 监听滚动和调整大小
onMounted(() => {
  window.addEventListener('scroll', () => updateSpotlight(false), true)
  window.addEventListener('resize', () => updateSpotlight(false))
  // 初次尝试获取位置
  setTimeout(() => updateSpotlight(false), 500)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateSpotlight, true)
  window.removeEventListener('resize', updateSpotlight)
})

const panelPosition = computed(() => {
  if (!spotlightRect.value) {
    return {
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)'
    }
  }

  const { y, height } = spotlightRect.value
  const screenHeight = window.innerHeight
  const panelHeight = 150 // 预估高度
  
  // 如果目标在屏幕上半部分，面板显示在下方；否则显示在上方
  const showBelow = y < screenHeight / 2
  
  if (showBelow) {
    return {
      top: `${y + height + 20}px`,
      left: '50%',
      transform: 'translateX(-50%)'
    }
  } else {
    return {
      bottom: `${screenHeight - y + 20}px`,
      left: '50%',
      transform: 'translateX(-50%)'
    }
  }
})
</script>

<style scoped>
.animate-in {
  animation-fill-mode: forwards;
}
</style>
