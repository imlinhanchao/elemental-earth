<script setup lang="ts">
import { useToastStore } from '@/stores/modules/toast'
import { useAppStore } from '@/stores/modules/app'
import { computed } from 'vue'

const toastStore = useToastStore()
const appStore = useAppStore()

const alertClasses: Record<string, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
  reward: 'alert-success',
  tech: 'alert-info',
  lab: 'alert-info',
  'main-event': 'alert-primary',
}

function getAlertClass(type: string) {
  return alertClasses[type] || 'alert-info'
}
</script>

<template>
  <div v-if="appStore.isMobile" class="toast toast-top toast-center z-[9999] w-full max-w-sm px-4 pt-16 pointer-events-none">
    <TransitionGroup name="toast-list">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="alert shadow-lg mb-2 py-2 px-4 text-sm pointer-events-auto"
        :class="getAlertClass(toast.type)"
      >
        <div class="flex items-center gap-2">
          <span>{{ toast.message }}</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s ease;
}
.toast-list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}
.toast-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
