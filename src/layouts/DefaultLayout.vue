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
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAppStore } from '../stores/modules/app.ts'
import { initAutoSave } from '@/utils/archive.ts'
import Content from './components/Content.vue'
import Header from './components/Header.vue'
import Left from './components/Left.vue'
import Right from './components/Right.vue'

const appStore = useAppStore()

function closeSidebars() {
  appStore.leftSidebarOpen = false
  appStore.rightSidebarOpen = false
}

onMounted(() => {
  initAutoSave()
  // Ensure the layout has a frame to render before signaling ready
  setTimeout(() => {
    appStore.isReady = true
  }, 100)
})

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
