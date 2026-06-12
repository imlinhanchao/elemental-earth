<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>
<template>
    <header class="navbar bg-base-300 shadow-sm z-10 flex-none">
      <div class="flex-none">
        <button class="btn btn-square btn-ghost" @click="appStore.toggleLeftSidebar">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div class="flex-1 px-2">
        <span class="text-lg font-bold">Elemental Earth</span>
      </div>
      <div class="flex-none gap-2">
        <button class="btn btn-ghost btn-circle" @click="appStore.toggleTheme" :title="appStore.theme === 'light' ? '切换深色' : '切换浅色'">
          <span v-if="appStore.theme === 'light'">🌙</span>
          <span v-else>☀️</span>
        </button>
        <button class="btn btn-ghost btn-circle" @click="appStore.toggleRightSidebar" title="切换右侧栏">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
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