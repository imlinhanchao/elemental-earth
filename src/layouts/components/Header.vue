<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'
import { useStateStore } from '@/stores/modules/state'

const appStore = useAppStore()
const stateStore = useStateStore()
</script>
<template>
    <header class="navbar bg-base-300 shadow-sm z-10 flex-none">
      <div class="flex-none">
        <button class="btn btn-square btn-ghost" @click="appStore.toggleLeftSidebar">
          <Icon :icon="appStore.leftSidebarOpen ? 'icon-park-solid:expand-right' : 'icon-park-solid:expand-left'" class="text-xl" />
        </button>
      </div>
      <div class="flex-1 px-2">
        <span class="text-lg font-bold">Elemental Earth</span>
      </div>
      <div class="flex-none gap-2 flex items-center">
        <span class="mr-2 inline-flex items-center">
          <Icon :icon="stateStore.getMap?.icon || 'tabler:map-filled'" class="text-xl mr-1" />
          <span>{{ stateStore.getMap?.name }}</span>
        </span>
        <button class="btn btn-ghost btn-circle" @click="appStore.toggleTheme" :title="appStore.theme === 'light' ? '切换深色' : '切换浅色'">
          <span v-if="appStore.theme === 'light'"><Icon icon="tabler:moon-filled" class="text-xl" /></span>
          <span v-else><Icon icon="tabler:sun-filled" class="text-xl" /></span>
        </button>
        <button class="btn btn-ghost btn-circle" @click="appStore.toggleRightSidebar" title="切换右侧栏">
          <Icon :icon="appStore.rightSidebarOpen ? 'icon-park-solid:expand-left' : 'icon-park-solid:expand-right'" class="text-xl" />
        </button>
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
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
</template>