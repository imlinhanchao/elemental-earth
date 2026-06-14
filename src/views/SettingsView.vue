<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">设置 ⚙️</h1>
    <p class="text-base-content/70 mb-6">管理你的偏好设置。</p>

    <div class="max-w-lg space-y-4">
      <!-- Theme -->
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-base">外观</h2>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">深色模式</span>
              <input
                type="checkbox"
                class="toggle toggle-primary"
                :checked="appStore.theme === 'dark'"
                @change="appStore.toggleTheme"
              />
            </label>
          </div>
        </div>
      </div>

      <!-- Layout -->
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-base">布局</h2>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">显示左侧栏</span>
              <input
                type="checkbox"
                class="toggle toggle-secondary"
                :checked="appStore.leftSidebarOpen"
                @change="appStore.toggleLeftSidebar"
              />
            </label>
          </div>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">显示右侧栏</span>
              <input
                type="checkbox"
                class="toggle toggle-accent"
                :checked="appStore.rightSidebarOpen"
                @change="appStore.toggleRightSidebar"
              />
            </label>
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="card bg-base-200 shadow">
        <div class="card-body">
          <h2 class="card-title text-base">通知</h2>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">邮件通知</span>
              <input type="checkbox" class="toggle" checked />
            </label>
          </div>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">桌面推送</span>
              <input type="checkbox" class="toggle" />
            </label>
          </div>
        </div>
      </div>

      <button class="btn btn-primary">保存设置</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/modules/app'
const appStore = useAppStore()
</script>
