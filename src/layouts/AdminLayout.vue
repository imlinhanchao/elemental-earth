<template>
  <div class="min-h-screen bg-base-300" data-theme="dark">
    <router-view v-slot="{ Component }">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
</script>
