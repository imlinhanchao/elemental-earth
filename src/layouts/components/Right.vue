<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
    <aside
        class="bg-base-200 border-l border-base-300 flex-none overflow-y-auto transition-all duration-300"
        :class="appStore.rightSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'"
      >
      </aside>
</template>