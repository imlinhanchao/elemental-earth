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
import { useEventListener } from '@vueuse/core'


const appStore = useAppStore()
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

const pageId = Date.now();
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

// ─── 多标签页检测（基于 localStorage 心跳） ─────────────────────────────────
const showMultiTabWarning = ref(false)
const multiTabDismissed = ref(false)
const startupGrace = ref(true)
const heartbeatPrefix = 'ashes_tab_'
const heartbeatKey = `${heartbeatPrefix}${pageId}`
let heartbeatTimer: number | null = null

function writeHeartbeat() {
  try {
    localStorage.setItem(heartbeatKey, String(Date.now()))
  } catch (e) {
    // ignore quota / privacy errors
  }
}

function checkOtherTabs() {
  const now = Date.now()
  let others = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue
    if (!key.startsWith(heartbeatPrefix)) continue
    if (key === heartbeatKey) continue
    const val = Number(localStorage.getItem(key)) || 0
    // consider alive if updated within last 5 seconds
    if (now - val < 5000) {
      others++
    } else {
      // prune stale entries
      try { localStorage.removeItem(key) } catch (e) {}
    }
  }
  showMultiTabWarning.value = others > 0 && !multiTabDismissed.value && !startupGrace.value
}

function storageHandler(e: StorageEvent) {
  if (!e.key) return
  if (!e.key.startsWith(heartbeatPrefix)) return
  // some other tab changed heartbeat -> re-check
  checkOtherTabs()
}

// start heartbeat and checks
onMounted(() => {
  writeHeartbeat()
  checkOtherTabs()
  heartbeatTimer = window.setInterval(() => {
    writeHeartbeat()
    checkOtherTabs()
  }, 2000) as unknown as number
  window.addEventListener('storage', storageHandler)
  // clear grace after short delay to avoid false positive on refresh
  setTimeout(() => { startupGrace.value = false }, 1500)
  // remove heartbeat on page unload (so refresh doesn't leave a transient entry)
  const handleBeforeUnload = () => {
    try { localStorage.removeItem(heartbeatKey) } catch (e) {}
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  onBeforeUnmount(handleBeforeUnload)
  // keep reference for cleanup
  ;(window as any).__ashes_handleBeforeUnload = handleBeforeUnload
})

onBeforeUnmount(() => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  try { localStorage.removeItem(heartbeatKey) } catch (e) {}
  window.removeEventListener('storage', storageHandler)
  const h = (window as any).__ashes_handleBeforeUnload
  if (h) {
    window.removeEventListener('beforeunload', h)
    try { delete (window as any).__ashes_handleBeforeUnload } catch (e) {}
  }
})

onBeforeUnmount(() => {
  if (wakeLock) {
    wakeLock.release().then(() => {
      console.log('屏幕常亮已释放');
    });
  }
});
</script>
