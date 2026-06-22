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

    <!-- 存档管理 -->
    <div class="max-w-lg space-y-4 mt-8">
      <div class="card bg-base-200 shadow border border-error/20">
        <div class="card-body">
          <h2 class="card-title text-base text-error">存档管理</h2>
          <p class="text-xs text-base-content/60 mb-2">
            最后保存：{{ getLastSavedLabel() }}
          </p>
          <button class="btn btn-error btn-outline gap-2" @click="resetSave">
            <Icon icon="tabler:trash" class="text-lg" />
            重置存档
          </button>
          <p class="text-xs text-base-content/40 mt-1">
            清除所有游戏进度，回到初始状态。此操作不可撤销。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '../stores/modules/app'
import { deleteSaveData, getLastSavedLabel, stopAutoSave } from '@/utils/archive'

const appStore = useAppStore()

function resetSave() {
  if (!confirm('⚠️ 确定要重置存档吗？\n\n所有游戏进度将被清除，此操作不可撤销！')) return
  if (!confirm('再次确认：真的要删除所有存档数据吗？')) return
  // 先停止自动存档，防止 beforeunload 又把存档写回去
  stopAutoSave()
  deleteSaveData()
  alert('存档已重置，页面将重新加载')
  window.location.replace(window.location.origin + window.location.pathname)
}
</script>