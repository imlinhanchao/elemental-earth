<template>
  <div class="flex flex-col h-screen" v-if="appStore.isReady" :data-theme="appStore.theme">
    <!-- Header Toolbar -->
    <Header />

      <!-- 多标签页警告 -->
      <div
        v-if="showMultiTabWarning && !multiTabDismissed"
        class="fixed top-16 left-0 right-0 z-50 p-3 bg-yellow-200 text-yellow-900 text-center flex items-center justify-center gap-4"
      >
        <span>请不要在多个页面同时打开游戏，这可能会导致存档冲突和数据丢失。</span>
        <button @click="multiTabDismissed = true" class="btn btn-sm btn-ghost">我知道了</button>
      </div>

    <!-- Body: three-column layout -->
    <div class="flex flex-1 overflow-hidden relative">
      <!-- 移动端遮罩 -->
      <div 
        v-if="appStore.isMobile && (appStore.leftSidebarOpen || appStore.rightSidebarOpen)" 
        class="absolute inset-0 bg-black/50 z-20"
        @click="closeSidebars"
      ></div>

      <!-- Left Sidebar -->
      <Left :class="{ 'absolute inset-y-0 left-0 z-99 shadow-2xl': appStore.isMobile }" />

      <!-- Main / Center Column -->
      <Content />

      <!-- Right Sidebar -->
      <Right :class="{ 'absolute inset-y-0 right-0 z-99 shadow-2xl': appStore.isMobile }" />
    </div>

    <!-- 游戏特效/弹窗/引导/日志 -->
    <ElementDiscovery
      :visible="showElementDiscovery"
      :elementNumber="discoveryElement"
      @done="onElementDiscoveryDone"
    />
    <EraTransition
      :visible="showEraTransition"
      :eraKey="transitionEra"
      @done="onEraTransitionDone"
    />
    <WonderDiscovery
      :visible="appStore.showWonderDiscovery"
      :actionKey="appStore.wonderActionKey"
      @done="appStore.showWonderDiscovery = false"
    />
    <DiscoveryDialog
      :visible="showDiscoveryDialog"
      :itemKey="discoveryItemKey"
      @done="onDiscoveryDialogDone"
    />
    <LabSuccessOverlay
      :visible="appStore.showLabSuccess"
      :formulaKey="appStore.labSuccessFormula"
      :products="appStore.labSuccessProducts"
      @close="appStore.showLabSuccess = false"
    />
    <TutorialOverlay />
    <Toast />
  </div>
  <LoadingOverlay v-if="!appStore.isReady" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppStore } from '../stores/modules/app.ts'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { useTutorialStore } from '@/stores/modules/tutorial'
import { initAutoSave } from '@/utils/archive.ts'
import { useMultiTabGuard } from '@/utils/multiTabGuard'
import Content from './components/Content.vue'
import Header from './components/Header.vue'
import Left from './components/Left.vue'
import Right from './components/Right.vue'
import ElementDiscovery from '@/components/ElementDiscovery.vue'
import EraTransition from '@/components/EraTransition.vue'
import DiscoveryDialog from '@/components/DiscoveryDialog.vue'
import WonderDiscovery from '@/components/WonderDiscovery.vue'
import LabSuccessOverlay from '../components/LabSuccessOverlay.vue'
import TutorialOverlay from '@/components/TutorialOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import Toast from '@/components/Toast.vue'
import { gameSDK } from '@/utils/sdk'
import { syncCloudArchive } from '@/utils/archive'


const appStore = useAppStore()

const pageId = Date.now();

const { showMultiTabWarning, multiTabDismissed } = useMultiTabGuard(pageId)
const stateStore = useStateStore()
const packStore = usePackStore()
const tutorialStore = useTutorialStore()

function closeSidebars() {
  appStore.leftSidebarOpen = false
  appStore.rightSidebarOpen = false
}

onMounted(() => {
  initAutoSave()
  tutorialStore.initTutorial()
  // Ensure the layout has a frame to render before signaling ready
  setTimeout(() => {
    appStore.isReady = true
  }, 100)
  setTimeout(() => {
    stateStore.checkEraAdvance()
  }, 2000)
})

// ─── 元素发现动画 ────────────────────────────────────────────────
const showElementDiscovery = ref(false)
const discoveryElement = ref<number | null>(null)

watch(() => stateStore.discoveryQueue[0], (val) => {
  if (val !== undefined && val !== null) {
    discoveryElement.value = val
    showElementDiscovery.value = true
  }
})

function onElementDiscoveryDone() {
  showElementDiscovery.value = false
  discoveryElement.value = null
  stateStore.clearPendingDiscovery()
}

// ─── 时代晋级动画 ────────────────────────────────────────────────
const showEraTransition = ref(false)
const transitionEra = ref<string | null>(null)

watch(() => stateStore.pendingEraTransition, (val) => {
  if (val !== null) {
    transitionEra.value = val
    showEraTransition.value = true
  }
})

function onEraTransitionDone() {
  showEraTransition.value = false
  transitionEra.value = null
  stateStore.clearEraTransition()
  // If the tutorial is active and we're on step 9, advance to step 10 when the era animation is closed
  if (tutorialStore.isTutorialActive && tutorialStore.currentStep === 9) {
    tutorialStore.currentStep = 10
  }
}

// ─── 物品发现命名弹窗 ────────────────────────────────────────────
const showDiscoveryDialog = ref(false)
const discoveryItemKey = ref<string | null>(null)

watch(() => packStore.discoveryQueue[0], (val) => {
  if (val) {
    discoveryItemKey.value = val
    showDiscoveryDialog.value = true
  } else {
    showDiscoveryDialog.value = false
    discoveryItemKey.value = null
  }
})

function onDiscoveryDialogDone() {
  // packStore.clearPendingDiscovery() 已在 DiscoveryDialog.vue 中调用
}


interface Tab {
  name: string
  path: string
  label: string
  icon: string
}

const tabs: Tab[] = [
  { name: 'Home', path: '/home', label: '首页', icon: '🏠' },
  { name: 'Explore', path: '/explore', label: '发现', icon: '🔍' },
  { name: 'Settings', path: '/settings', label: '设置', icon: '⚙️' },
]

let wakeLock: any = null;
const requestWakeLock = async () => {
   try {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log('屏幕已锁定为常亮状态');
   } catch (err: any) {
      console.error(`请求失败: ${err.name}, ${err.message}`);
   }
};
requestWakeLock();

onMounted(async () => {
  const isFreshLogin = await gameSDK.initAuth()
  
  // 处理存档同步
  if (isFreshLogin) {
    // 刚刚登录（从平台重定向回来），检查差异
    await syncCloudArchive(false)
  }

  if (await gameSDK.isAuthenticated()) {
    gameSDK.connectRealtime((msg) => {
      console.log('Received message:', msg);
    });
  }

})

// multi-tab guard handled by `useMultiTabGuard` composable

onBeforeUnmount(() => {
  if (wakeLock) {
    wakeLock.release().then(() => {
      console.log('屏幕常亮已释放');
    });
  }
});
</script>
