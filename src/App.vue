<template>
  <RouterView />
  <ElementDiscovery
    :visible="showElementDiscovery"
    :elementNumber="discoveryElement"
    @done="onElementDiscoveryDone"
  />
  <DiscoveryDialog
    :visible="showDiscoveryDialog"
    :itemKey="discoveryItemKey"
    @done="onDiscoveryDialogDone"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import ElementDiscovery from '@/components/ElementDiscovery.vue'
import DiscoveryDialog from '@/components/DiscoveryDialog.vue'

const stateStore = useStateStore()
const packStore = usePackStore()

// ─── 元素发现动画 ────────────────────────────────────────────────
const showElementDiscovery = ref(false)
const discoveryElement = ref<number | null>(null)

watch(() => stateStore.pendingDiscovery, (val) => {
  if (val !== null) {
    discoveryElement.value = val
    showElementDiscovery.value = true
  }
})

function onElementDiscoveryDone() {
  showElementDiscovery.value = false
  discoveryElement.value = null
  stateStore.clearPendingDiscovery()
}

// ─── 物品发现命名弹窗 ────────────────────────────────────────────
const showDiscoveryDialog = ref(false)
const discoveryItemKey = ref<string | null>(null)

watch(() => packStore.pendingDiscovery, (val) => {
  if (val !== null) {
    discoveryItemKey.value = val
    showDiscoveryDialog.value = true
  }
})

function onDiscoveryDialogDone() {
  showDiscoveryDialog.value = false
  discoveryItemKey.value = null
}
</script>
