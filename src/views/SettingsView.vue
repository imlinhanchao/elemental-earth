<template>
  <div class="p-4 max-w-lg mx-auto space-y-4">
    <h2 class="text-xl font-bold flex items-center gap-2">
      <Icon icon="uil:setting" class="text-2xl" />
      设置
    </h2>

    <!-- Account -->
    <div class="card bg-base-200 shadow">
      <div class="card-body">
        <h2 class="card-title text-base">账户</h2>
        <div v-if="accountLoading" class="flex justify-center py-2">
          <span class="loading loading-spinner loading-sm"></span>
        </div>
        <div v-else-if="user" class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="avatar">
              <div class="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img :src="user.avatar" />
              </div>
            </div>
            <div class="grow">
              <div class="font-bold text-sm">{{ user.nickname }}</div>
              <div class="text-xs text-base-content/60">@{{ user.username }}</div>
            </div>
            <button class="btn btn-ghost btn-sm text-error" @click="handleLogout">退出</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button class="btn btn-primary btn-sm gap-2" @click="handleUploadCloud">
              <Icon icon="tabler:cloud-upload" />
              上传存档
            </button>
            <button class="btn btn-outline btn-sm gap-2" @click="handlePullCloud">
              <Icon icon="tabler:cloud-download" />
              拉取存档
            </button>
          </div>
          
          <div v-if="user.isAdmin" class="pt-2 border-t border-base-300">
            <router-link to="/admin" class="btn btn-neutral btn-sm w-full gap-2">
              <Icon icon="material-symbols:admin-panel-settings" />
              进入后台管理
            </router-link>
          </div>
        </div>
        <div v-else>
          <p class="text-xs text-base-content/60 mb-3">登录后可将存档同步至云端，多端同步进度。</p>
          <button class="btn btn-primary btn-sm w-full gap-2" @click="handleLogin">
            <Icon icon="tabler:login" />
            通过摸鱼派登录
          </button>
        </div>
      </div>
    </div>

    <!-- Theme -->
    <div class="card bg-base-200 shadow">
      <div class="card-body">
        <h2 class="card-title text-base">主题</h2>
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
            <input type="checkbox" class="toggle toggle-primary" :checked="appStore.leftSidebarOpen" @change="appStore.toggleLeftSidebar" />
          </label>
        </div>
        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">显示右侧栏</span>
            <input type="checkbox" class="toggle toggle-primary" :checked="appStore.rightSidebarOpen" @change="appStore.toggleRightSidebar" />
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
            <span class="label-text">桌面推送</span>
            <input type="checkbox" class="toggle toggle-primary" :checked="appStore.desktopPush" @change="appStore.toggleDesktopPush" />
          </label>
        </div>
        <div v-if="appStore.desktopPush" class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">推送模式</span>
          </label>
          <div class="ml-2 join">
            <button class="btn btn-xs join-item" :class="appStore.taskNotifyMode === 'all' ? 'btn-primary' : 'btn-soft'" @click="appStore.setTaskNotifyMode('all')">全部完成通知</button>
            <button class="btn btn-xs join-item" :class="appStore.taskNotifyMode === 'each' ? 'btn-primary' : 'btn-soft'" @click="appStore.setTaskNotifyMode('each')">每个任务通知</button>
          </div>
        </div>
        <div v-if="appStore.desktopPush" class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">仅不在当前页面时通知</span>
            <input type="checkbox" class="toggle toggle-primary" :checked="appStore.notifyOnlyHidden" @change="appStore.toggleNotifyOnlyHidden" />
          </label>
        </div>
      </div>
    </div>

    <!-- Game Experience -->
    <div class="card bg-base-200 shadow">
      <div class="card-body">
        <h2 class="card-title text-base">游戏体验</h2>
        <div class="form-control">
          <label class="label cursor-pointer">
            <div>
              <span class="label-text block">硬核命名模式</span>
              <span class="label-text-alt text-base-content/60">发现新物质时强制要求手动命名（默认关闭）</span>
            </div>
            <input type="checkbox" class="toggle toggle-primary" :checked="appStore.hardMode" @change="appStore.toggleHardMode" />
          </label>
        </div>
      </div>
    </div>

    <!-- 存档管理 -->
    <div class="card bg-base-200 shadow border border-error/20">
      <div class="card-body">
        <h2 class="card-title text-base text-error">存档管理</h2>
        <p class="text-xs text-base-content/60 mb-3">
          最后保存：{{ getLastSavedLabel() }}
        </p>
        <div class="flex gap-2 flex-wrap mb-3">
          <button class="btn btn-sm gap-2" @click="showExport = true">
            <Icon icon="tabler:download" class="text-lg" />
            导出存档
          </button>
          <button class="btn btn-sm gap-2" @click="showImport = true">
            <Icon icon="tabler:upload" class="text-lg" />
            导入存档
          </button>
          <button class="btn btn-sm btn-error btn-outline gap-2" @click="resetSave">
            <Icon icon="tabler:trash" class="text-lg" />
            重置存档
          </button>
        </div>
        <p class="text-xs text-base-content/40">
          导出的数据已加密，导入将覆盖当前所有进度
        </p>
      </div>
    </div>

    <!-- 导出弹窗 -->
    <Teleport to="body">
      <dialog ref="exportModalRef" class="modal" @close="showExport = false">
        <div class="modal-box max-w-xl">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2"><Icon icon="tabler:download" class="text-lg" />导出存档</h3>
          <p class="text-xs text-base-content/60 mb-3">复制下方加密数据，或下载为文件。</p>
          <textarea class="textarea textarea-bordered w-full font-mono text-xs" rows="6" readonly>{{ exportText }}</textarea>
          <div class="flex gap-2 mt-3 justify-end">
            <button class="btn btn-ghost btn-sm" @click="copyExport"><Icon icon="tabler:copy" class="text-sm" />复制</button>
            <button class="btn btn-ghost btn-sm" @click="downloadExport"><Icon icon="tabler:download" class="text-sm" />下载</button>
            <button class="btn btn-primary btn-sm" @click="closeExport">关闭</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </Teleport>

    <!-- 导入弹窗 -->
    <Teleport to="body">
      <dialog ref="importModalRef" class="modal" @close="showImport = false">
        <div class="modal-box max-w-xl">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2"><Icon icon="tabler:upload" class="text-lg" />导入存档</h3>
          <p class="text-xs text-base-content/60 mb-3">粘贴加密的存档数据，或选择文件导入。</p>
          <textarea class="textarea textarea-bordered w-full font-mono text-xs" rows="6" v-model="importText" placeholder="在此粘贴存档数据..."></textarea>
          <div class="flex gap-2 mt-3 justify-end">
            <button class="btn btn-ghost btn-sm" @click="fileImport"><Icon icon="tabler:file-import" class="text-sm" />选择文件</button>
            <button class="btn btn-primary btn-sm" :disabled="!importText.trim()" @click="textImport"><Icon icon="tabler:upload" class="text-sm" />导入</button>
            <button class="btn btn-ghost btn-sm" @click="closeImport">取消</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useAppStore } from '../stores/modules/app'
import { deleteSaveData, deleteTutorialData, exportSaveData, downloadSaveData, getLastSavedLabel, importSaveDataFromText, importSaveDataFromFile, stopAutoSave, syncCloudArchive, uploadCloudArchive, pullCloudArchive } from '@/utils/archive'
import { gameSDK as sdk } from '@/utils/sdk'
import type { UserInfo } from 'fish-ball-sdk'

const appStore = useAppStore()

// ─── 账户 ────────────────────────────────────────────────
const user = ref<UserInfo | null>(null)
const accountLoading = ref(true)

async function checkLogin() {
  accountLoading.value = true
  try {
    if (await sdk.isAuthenticated()) {
      user.value = await sdk.getUserProfile()
    } else {
      user.value = null
    }
  } catch (e) {
    console.error('检查登录状态失败:', e)
  } finally {
    accountLoading.value = false
  }
}

onMounted(async () => {
  // App.vue 已经负责处理了 initAuth 和全局同步
  // 这里仅刷新 UI
  await checkLogin()
})

async function handleLogin() {
  try {
    await sdk.login()
  } catch (e) {
    alert('登录失败: ' + (e as Error).message)
  }
}

async function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    sdk.logout()
    user.value = null
  }
}

async function handleUploadCloud() {
  await uploadCloudArchive()
}

async function handlePullCloud() {
  await pullCloudArchive()
}

// ─── 导出 ────────────────────────────────────────────────
const showExport = ref(false)
const exportText = ref('')
const exportModalRef = ref<HTMLDialogElement | null>(null)

watch(showExport, (v) => {
  if (v) {
    exportText.value = exportSaveData() || ''
    exportModalRef.value?.showModal()
  } else {
    exportModalRef.value?.close()
  }
})

function closeExport() { showExport.value = false }

function copyExport() {
  if (!exportText.value) return
  navigator.clipboard.writeText(exportText.value).then(
    () => alert('已复制到剪贴板'),
    () => {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = exportText.value
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('已复制到剪贴板')
    }
  )
}

function downloadExport() {
  downloadSaveData()
}

// ─── 导入 ────────────────────────────────────────────────
const showImport = ref(false)
const importText = ref('')
const importModalRef = ref<HTMLDialogElement | null>(null)

watch(showImport, (v) => {
  if (v) importModalRef.value?.showModal()
  else importModalRef.value?.close()
})

function closeImport() { showImport.value = false }

function textImport() {
  if (!importText.value.trim()) return
  if (importSaveDataFromText(importText.value)) {
    closeImport()
  }
}

function fileImport() {
  importSaveDataFromFile()
}

// ─── 重置 ────────────────────────────────────────────────
function resetSave() {
  if (!confirm('⚠️ 确定要重置存档吗？\n\n所有游戏进度将被清除，此操作不可撤销！')) return
  if (!confirm('再次确认：真的要删除所有存档数据吗？')) return
  stopAutoSave()
  deleteSaveData()
  deleteTutorialData()
  alert('存档已重置，页面将重新加载')
  window.location.href = window.location.origin + window.location.pathname
}
</script>
