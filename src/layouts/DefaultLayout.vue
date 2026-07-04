<template>
  <div class="flex flex-col h-screen" v-if="appStore.isReady" :data-theme="appStore.theme">
    <!-- Header Toolbar -->
    <Header />

    <!-- Body: three-column layout -->
    <div class="flex flex-1 overflow-hidden relative">
      <!-- 移动端遮罩 -->
      <div 
        v-if="appStore.isMobile && (appStore.leftSidebarOpen || appStore.rightSidebarOpen)" 
        class="absolute inset-0 bg-black/50 z-20"
        @click="closeSidebars"
      ></div>

      <!-- Left Sidebar -->
      <Left :class="{ 'absolute inset-y-0 left-0 z-30 shadow-2xl': appStore.isMobile }" />

      <!-- Main / Center Column -->
      <Content />

      <!-- Right Sidebar -->
      <Right :class="{ 'absolute inset-y-0 right-0 z-30 shadow-2xl': appStore.isMobile }" />
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
    <DiscoveryDialog
      :visible="showDiscoveryDialog"
      :itemKey="discoveryItemKey"
      @done="onDiscoveryDialogDone"
    />
    <TutorialOverlay />
    <Toast />
  </div>
  <LoadingOverlay v-if="!appStore.isReady" />
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
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
import TutorialOverlay from '@/components/TutorialOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import Toast from '@/components/Toast.vue'

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
</script>
