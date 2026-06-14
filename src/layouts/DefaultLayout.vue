<template>
  <div class="flex flex-col h-screen" :data-theme="appStore.theme">
    <!-- Header Toolbar -->
    <Header />

    <!-- Body: three-column layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <Left />

      <!-- Main / Center Column -->
      <Content />

      <!-- Right Sidebar -->
      <Right />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/modules/app.ts'
import Content from './components/Content.vue'
import Header from './components/Header.vue'
import Left from './components/Left.vue'
import Right from './components/Right.vue'

const appStore = useAppStore()

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
