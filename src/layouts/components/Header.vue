<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/modules/app'
import { useStateStore } from '@/stores/modules/state'
import { useTaskStore } from '@/stores/modules/task'
import { Eras } from '@/data/eras'
import { saveGame, getLastSavedLabel } from '@/utils/archive'
import MapSwitchModal from './MapSwitch/MapSwitchModal.vue'
import MapSwitchOverlay from './MapSwitch/MapSwitchOverlay.vue'
import EraDetailModal from './EraDetailModal.vue'
import { Icon } from '@iconify/vue'
import { computed } from 'vue'

const appStore = useAppStore()
const stateStore = useStateStore()
const taskStore = useTaskStore()

const currentTargetEra = computed(() => stateStore.currentEra)
const displayEra = computed(() => {
  const order = currentTargetEra.value?.order || 0
  if (order === 0) return currentTargetEra.value
  return Eras.find(e => e.order === order - 1)
})

const eraProgress = computed(() => stateStore.eraProgress * 100)

const eraBadgeStyle = computed(() => {
  const prog = eraProgress.value
  // 使用主题中的中性色（通常是深色）作为进度填充
  const fillColor = 'var(--color-accent)'
  const baseColor = 'transparent'
  
  if (appStore.isMobile) {
    // 移动端：锥形渐变（Conic Gradient）
    return {
      backgroundImage: `conic-gradient(from 0deg, ${fillColor} ${prog}%, ${baseColor} ${prog}%)`,
      backgroundColor: 'transparent'
    }
  }
  // 桌面端：线性渐变填充
  return {
    backgroundImage: `linear-gradient(to right, ${fillColor} ${prog}%, ${baseColor} ${prog}%)`,
    backgroundColor: 'transparent'
  }
})

const saving = ref(false)
const modalVisible = ref(false)
const eraModalVisible = ref(false)

function handleSave() {
  if (saving.value) return
  saving.value = true
  const ok = saveGame()
  if (!ok) {
    saving.value = false
    return
  }
  setTimeout(() => { saving.value = false }, 1000)
}

function openSwitchModal() {
  if (stateStore.isSwitching) return
  if (taskStore.tasks.length > 0) return
  modalVisible.value = true
}

function handleSelectMap(targetKey: string) {
  if (targetKey === stateStore.state.map) return
  stateStore.startSwitch(targetKey)
  modalVisible.value = false
}

function openEraModal() {
  eraModalVisible.value = true
  stateStore.markEraDetailsSeen()
}
</script>
<template>
    <header class="navbar bg-base-100 shadow-sm z-10 flex-none">
      <div class="flex-none">
        <button class="btn btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleLeftSidebar">
          <Icon :icon="appStore.leftSidebarOpen ? 'icon-park-outline:expand-right' : 'icon-park-outline:expand-left'" class="text-xl" />
        </button>
      </div>
      <div class="flex-1 px-2 flex items-center gap-2">
        <Icon icon="pinhead:bohr-atomic-model" class="text-2xl text-primary"></Icon>
        <span class="text-xl font-bold" :class="{ 'hidden': appStore.isMobile }">元素纪元</span>
        <div 
          v-if="displayEra" 
        >
          <div 
            class="badge badge-soft badge-accent border-accent gap-1 ml-2 cursor-pointer relative tooltip tooltip-bottom indicator overflow-hidden !bg-transparent" 
            @click="openEraModal"
            data-tip="点击查看纪元进度"
          >
            <span class="absolute top-0 left-0 flex w-full h-full opacity-20" :style="eraBadgeStyle"></span>
            <Icon :icon="displayEra.icon" class="text-sm z-1" />
            <span v-if="!appStore.isMobile" class="z-1 font-bold">{{ displayEra.name }}</span>
            <span v-if="!stateStore.state.eraDetailsSeen" class="indicator-item status status-error animate-pulse mr-2 mt-1"></span>
          </div>
        </div>
      </div>
      <div class="flex-none gap-2 flex items-center">

        <!-- 当前地图 -->
        <div id="header-map-switch" class="flex items-center gap-1">
          <button class="btn btn-ghost btn-sm gap-1 pl-1" :disabled="stateStore.isSwitching || taskStore.tasks.length > 0" @click="openSwitchModal" title="点击切换地图">
            <Icon :icon="stateStore.getMap?.icon || 'tabler:map-filled'" class="text-xl" />
            <span :class="{ 'hidden': appStore.isMobile }">{{ stateStore.getMap?.name }}</span>
            <Icon icon="tabler:chevron-down" class="text-sm opacity-60" />
          </button>
        </div>

        <button class="btn btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleTheme" :title="appStore.isDarkTheme ? '切换浅色' : '切换深色'">
          <span v-if="!appStore.isDarkTheme"><Icon icon="tabler:moon" class="text-xl" /></span>
          <span v-else><Icon icon="tabler:sun" class="text-xl" /></span>
        </button>
        <button class="btn btn-circle" :disabled="stateStore.isSwitching || saving" @click="handleSave" :title="getLastSavedLabel()">
          <Icon :icon="saving ? 'tabler:check' : 'tabler:device-floppy'" class="text-xl" />
        </button>
        <button class="btn btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleRightSidebar" title="切换右侧栏">
          <Icon :icon="appStore.rightSidebarOpen ? 'icon-park-outline:expand-left' : 'icon-park-outline:expand-right'" class="text-xl" />
        </button>
      </div>
    </header>

    <!-- 地图选择弹窗 -->
    <MapSwitchModal v-if="modalVisible" @select="handleSelectMap" @close="modalVisible = false" />

    <!-- 时代详情弹窗 -->
    <EraDetailModal v-if="eraModalVisible" @close="eraModalVisible = false" />

    <!-- 切换中全屏遮罩 -->
    <MapSwitchOverlay v-if="stateStore.isSwitching" @cancel="() => {}" />
</template>
