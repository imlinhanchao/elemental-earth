<template>
  <RouterView />
  <ElementDiscovery
    :visible="showDiscovery"
    :elementNumber="discoveryElement"
    @done="onDiscoveryDone"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import ElementDiscovery from '@/components/ElementDiscovery.vue'

const stateStore = useStateStore()

const showDiscovery = ref(false)
const discoveryElement = ref<number | null>(null)

// 监听 pendingDiscovery，一旦有新元素被点亮就触发动画
watch(() => stateStore.pendingDiscovery, (val) => {
  if (val !== null) {
    discoveryElement.value = val
    showDiscovery.value = true
  }
})

function onDiscoveryDone() {
  showDiscovery.value = false
  discoveryElement.value = null
  stateStore.clearPendingDiscovery()
}
</script>
