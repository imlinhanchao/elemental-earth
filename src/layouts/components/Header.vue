<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/modules/app'
import { useStateStore } from '@/stores/modules/state'
import { useTaskStore } from '@/stores/modules/task'
import { saveGame, getLastSavedLabel } from '@/utils/archive'
import MapSwitchModal from './MapSwitch/MapSwitchModal.vue'
import MapSwitchOverlay from './MapSwitch/MapSwitchOverlay.vue'
import { Icon } from '@iconify/vue'

const appStore = useAppStore()
const stateStore = useStateStore()
const taskStore = useTaskStore()

const saving = ref(false)
const modalVisible = ref(false)

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
</script>
<template>
    <header class="navbar bg-base-100 shadow-sm z-10 flex-none">
      <div class="flex-none">
        <button class="btn btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleLeftSidebar">
          <Icon :icon="appStore.leftSidebarOpen ? 'icon-park-outline:expand-right' : 'icon-park-outline:expand-left'" class="text-xl" />
        </button>
      </div>
      <div class="flex-1 px-2 flex items-center gap-2">
        <Icon icon="pinhead:bohr-atomic-model" class="text-2xl text-primary" />
        <span class="text-xl font-bold" :class="{ 'hidden': appStore.isMobile }">元素纪元</span>
      </div>
      <div class="flex-none gap-2 flex items-center">

        <!-- 当前地图 -->
        <div id="header-map-switch" class="flex items-center gap-1 mr-2">
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

    <!-- 切换中全屏遮罩 -->
    <MapSwitchOverlay v-if="stateStore.isSwitching" @cancel="() => {}" />
</template>
