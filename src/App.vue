<template>
  <RouterView />
  <ElementDiscovery
    :visible="showElementDiscovery"
    :elementNumber="discoveryElement"
    @done="onElementDiscoveryDone"
  />
  <EraTransition
    :visible="showEraTransition"
    :eraKey="transitionEra"
    @done="onEraTransitionDone"
  />
  <DiscoveryDialog
    :visible="showDiscoveryDialog"
    :itemKey="discoveryItemKey"
    @done="onDiscoveryDialogDone"
  />
  <TutorialOverlay />
  <LoadingOverlay v-if="!appStore.isReady" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useStateStore } from '@/stores/modules/state'
import { usePackStore } from '@/stores/modules/pack'
import { useTutorialStore } from '@/stores/modules/tutorial'
import { useAppStore } from '@/stores/modules/app'
import ElementDiscovery from '@/components/ElementDiscovery.vue'
import EraTransition from '@/components/EraTransition.vue'
import DiscoveryDialog from '@/components/DiscoveryDialog.vue'
import TutorialOverlay from '@/components/TutorialOverlay.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

const stateStore = useStateStore()
const packStore = usePackStore()
const tutorialStore = useTutorialStore()
const appStore = useAppStore()

onMounted(() => {
  tutorialStore.initTutorial()
})

// ─── 元素发现动画 ────────────────────────────────────────────────
const showElementDiscovery = ref(false)
const discoveryElement = ref<number | null>(null)

watch(() => stateStore.discoveryQueue[0], (val) => {
  if (val !== undefined && val !== null) {
    discoveryElement.value = val
    showElementDiscovery.value = true
  }
})

function onElementDiscoveryDone() {
  showElementDiscovery.value = false
  discoveryElement.value = null
  stateStore.clearPendingDiscovery()
}

// ─── 时代晋级动画 ────────────────────────────────────────────────
const showEraTransition = ref(false)
const transitionEra = ref<string | null>(null)

watch(() => stateStore.pendingEraTransition, (val) => {
  if (val !== null) {
    transitionEra.value = val
    showEraTransition.value = true
  }
})

function onEraTransitionDone() {
  showEraTransition.value = false
  transitionEra.value = null
  stateStore.clearEraTransition()
}

// ─── 物品发现命名弹窗 ────────────────────────────────────────────
const showDiscoveryDialog = ref(false)
const discoveryItemKey = ref<string | null>(null)

watch(() => packStore.discoveryQueue[0], (val) => {
  if (val) {
    discoveryItemKey.value = val
    showDiscoveryDialog.value = true
  } else {
    showDiscoveryDialog.value = false
    discoveryItemKey.value = null
  }
})

function onDiscoveryDialogDone() {
  // packStore.clearPendingDiscovery() 已在 DiscoveryDialog.vue 中调用
}
</script>
