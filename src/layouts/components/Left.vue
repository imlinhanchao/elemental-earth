<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
    <aside
        class="bg-base-200 border-r border-base-300 flex-none overflow-y-auto transition-all duration-300"
        :class="appStore.leftSidebarOpen ? 'w-60' : 'w-0 overflow-hidden'"
        >
        
    </aside>
</template>