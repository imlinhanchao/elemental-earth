<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/stores/modules/app'
import { useStateStore } from '@/stores/modules/state'
import { useTaskStore } from '@/stores/modules/task'
import { saveGame, getLastSavedLabel } from '@/utils/archive'
import MapSwitchModal from './MapSwitch/MapSwitchModal.vue'
import MapSwitchOverlay from './MapSwitch/MapSwitchOverlay.vue'

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
    <header class="navbar bg-base-300 shadow-sm z-10 flex-none">
      <div class="flex-none">
        <button class="btn btn-square btn-ghost" :disabled="stateStore.isSwitching" @click="appStore.toggleLeftSidebar">
          <Icon :icon="appStore.leftSidebarOpen ? 'icon-park-solid:expand-right' : 'icon-park-solid:expand-left'" class="text-xl" />
        </button>
      </div>
      <div class="flex-1 px-2">
        <span class="text-lg font-bold">Elemental Earth</span>
      </div>
      <div class="flex-none gap-2 flex items-center">

        <!-- 当前地图 -->
        <div class="flex items-center gap-1 mr-2">
          <button class="btn btn-ghost btn-sm gap-1" :disabled="stateStore.isSwitching || taskStore.tasks.length > 0" @click="openSwitchModal" title="点击切换地图">
            <Icon :icon="stateStore.getMap?.icon || 'tabler:map-filled'" class="text-xl" />
            <span>{{ stateStore.getMap?.name }}</span>
            <Icon icon="tabler:chevron-down" class="text-sm opacity-60" />
          </button>
        </div>

        <button class="btn btn-ghost btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleTheme" :title="appStore.theme === 'light' ? '切换深色' : '切换浅色'">
          <span v-if="appStore.theme === 'light'"><Icon icon="tabler:moon-filled" class="text-xl" /></span>
          <span v-else><Icon icon="tabler:sun-filled" class="text-xl" /></span>
        </button>
        <button class="btn btn-ghost btn-circle" :disabled="stateStore.isSwitching || saving" @click="handleSave" :title="getLastSavedLabel()">
          <Icon :icon="saving ? 'tabler:check' : 'tabler:device-floppy'" class="text-xl" />
        </button>
        <button class="btn btn-ghost btn-circle" :disabled="stateStore.isSwitching" @click="appStore.toggleRightSidebar" title="切换右侧栏">
          <Icon :icon="appStore.rightSidebarOpen ? 'icon-park-solid:expand-left' : 'icon-park-solid:expand-right'" class="text-xl" />
        </button>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar" :class="{ 'pointer-events-none opacity-50': stateStore.isSwitching }">
            <div class="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">U</div>
          </div>
          <ul tabindex="0" class="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-3 w-52 p-2 shadow">
            <li><a>个人资料</a></li>
            <li><a>账户设置</a></li>
            <li><a>退出登录</a></li>
          </ul>
        </div>
      </div>
    </header>

    <!-- 地图选择弹窗 -->
    <MapSwitchModal v-if="modalVisible" @select="handleSelectMap" @close="modalVisible = false" />

    <!-- 切换中全屏遮罩 -->
    <MapSwitchOverlay v-if="stateStore.isSwitching" @cancel="() => {}" />
</template>
