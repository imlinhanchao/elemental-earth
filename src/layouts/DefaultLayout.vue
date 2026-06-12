<template>
  <div class="flex flex-col h-screen" :data-theme="appStore.theme">
    <!-- Header Toolbar -->
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

    <!-- Body: three-column layout -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left Sidebar -->
      <aside
        class="bg-base-200 border-r border-base-300 flex-none overflow-y-auto transition-all duration-300"
        :class="appStore.leftSidebarOpen ? 'w-60' : 'w-0 overflow-hidden'"
      >
        <div class="p-4 min-w-60">
          <h2 class="menu-title text-xs uppercase text-base-content/50 mb-2">导航</h2>
          <ul class="menu menu-md w-full">
            <li>
              <RouterLink to="/home" active-class="active">
                <span>🏠</span> 首页
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/explore" active-class="active">
                <span>🔍</span> 发现
              </RouterLink>
            </li>
            <li>
              <RouterLink to="/settings" active-class="active">
                <span>⚙️</span> 设置
              </RouterLink>
            </li>
          </ul>
          <div class="divider"></div>
          <h2 class="menu-title text-xs uppercase text-base-content/50 mb-2">分类</h2>
          <ul class="menu menu-md w-full">
            <li><a>🌍 地球元素</a></li>
            <li><a>🔥 火焰元素</a></li>
            <li><a>💧 水元素</a></li>
            <li><a>🌬 风元素</a></li>
          </ul>
        </div>
      </aside>

      <!-- Main / Center Column -->
      <main class="flex-1 flex flex-col overflow-hidden bg-base-100">
        <!-- Tab Bar -->
        <div class="tabs tabs-bordered tabs-lg border-b border-base-300 bg-base-200 flex-none px-4">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.name"
            :to="tab.path"
            class="tab gap-2"
            active-class="tab-active"
          >
            <span>{{ tab.icon }}</span>
            {{ tab.label }}
          </RouterLink>
        </div>

        <!-- Router View -->
        <div class="flex-1 overflow-y-auto p-6">
          <RouterView />
        </div>
      </main>

      <!-- Right Sidebar -->
      <aside
        class="bg-base-200 border-l border-base-300 flex-none overflow-y-auto transition-all duration-300"
        :class="appStore.rightSidebarOpen ? 'w-72' : 'w-0 overflow-hidden'"
      >
        <div class="p-4 min-w-72">
          <h2 class="menu-title text-xs uppercase text-base-content/50 mb-2">信息面板</h2>
          <div class="stats stats-vertical shadow w-full">
            <div class="stat">
              <div class="stat-title">元素总数</div>
              <div class="stat-value text-primary">118</div>
              <div class="stat-desc">已收录元素</div>
            </div>
            <div class="stat">
              <div class="stat-title">活跃用户</div>
              <div class="stat-value text-secondary">1.2K</div>
              <div class="stat-desc">本月新增 ↗︎ 120</div>
            </div>
          </div>
          <div class="divider"></div>
          <h2 class="menu-title text-xs uppercase text-base-content/50 mb-2">最近活动</h2>
          <ul class="timeline timeline-vertical timeline-compact">
            <li>
              <div class="timeline-middle"><span class="text-xs">●</span></div>
              <div class="timeline-end timeline-box text-xs">添加了新元素</div>
              <hr />
            </li>
            <li>
              <hr />
              <div class="timeline-middle"><span class="text-xs">●</span></div>
              <div class="timeline-end timeline-box text-xs">更新了配置</div>
              <hr />
            </li>
            <li>
              <hr />
              <div class="timeline-middle"><span class="text-xs">●</span></div>
              <div class="timeline-end timeline-box text-xs">新用户注册</div>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAppStore } from '../stores/app'

const appStore = useAppStore()

const tabs = [
  { name: 'Home', path: '/home', label: '首页', icon: '🏠' },
  { name: 'Explore', path: '/explore', label: '发现', icon: '🔍' },
  { name: 'Settings', path: '/settings', label: '设置', icon: '⚙️' },
]
</script>
