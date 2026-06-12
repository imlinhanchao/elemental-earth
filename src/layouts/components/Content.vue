<script setup lang="ts">
import Menu from './Menu.vue'

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

<template>
    <main class="flex-1 flex flex-col overflow-hidden bg-base-100">
        <!-- Tab Bar -->
        <Menu />

        <!-- Router View -->
        <div class="flex-1 overflow-y-auto p-6">
          <RouterView />
        </div>
    </main>
</template>