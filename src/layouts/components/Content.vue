<script setup lang="ts">
import Menu from './Menu.vue'
import MobileSummary from './MobileSummary.vue'
</script>

<template>
    <main class="flex-1 flex flex-col overflow-hidden bg-base-100">
        <!-- Tab Bar -->
        <MobileSummary />
        <Menu />

        <!-- Router View -->
        <div class="flex-1 overflow-y-auto p-4 lg:p-6">
          <RouterView />
        </div>
    </main>
</template>