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

    <!-- Mod 管理 -->
    <div class="card bg-base-200 shadow border border-info/20">
      <div class="card-body">
        <div class="flex items-center justify-between gap-2">
          <h2 class="card-title text-base">Mod 管理</h2>
          <div class="join">
            <button class="btn btn-sm join-item" @click="showModImport = true">导入文本</button>
            <button class="btn btn-sm join-item" :disabled="modFileImporting" @click="openModFilePicker">
              {{ modFileImporting ? '导入中...' : '导入文件(JSON/ZIP)' }}
            </button>
          </div>
        </div>
        <input
          ref="modFileInputRef"
          type="file"
          class="hidden"
          accept=".json,.zip,application/json,application/zip"
          @change="onModFileSelected"
        />
        <p class="text-xs text-base-content/70">
          高权限 Mod 可访问全部 Store、DOM 和网络。仅导入可信来源内容。
        </p>

        <div v-if="modRows.length === 0" class="text-sm text-base-content/60 py-2">尚未安装 Mod</div>
        <div v-else class="space-y-2">
          <div v-for="row in modRows" :key="row.pkg.manifest.modId" class="p-2 rounded border border-base-300 bg-base-100">
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="font-bold text-sm">
                  {{ row.pkg.manifest.name }}
                  <span class="text-xs text-base-content/60">v{{ row.pkg.manifest.version }}</span>
                  <span v-if="isHighTrustMod(row.pkg)" class="badge badge-warning badge-xs ml-1">高权限</span>
                </div>
                <div class="text-xs text-base-content/60">{{ row.pkg.manifest.modId }}</div>
              </div>
              <div class="join">
                <button class="btn btn-xs join-item" @click="toggleMod(row.pkg.manifest.modId, !row.enabled)">
                  {{ row.enabled ? '停用' : '启用' }}
                </button>
                <button class="btn btn-xs btn-error join-item" @click="removeMod(row.pkg.manifest.modId)">卸载</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="modWarnings.length" class="mt-2">
          <div class="text-xs font-bold mb-1">最近告警</div>
          <ul class="text-xs text-warning space-y-1">
            <li v-for="(w, idx) in modWarnings.slice(-5)" :key="`w-${idx}`">{{ w }}</li>
          </ul>
        </div>

        <div v-if="modDiagnostics.length" class="mt-2">
          <div class="text-xs font-bold mb-1">运行诊断</div>
          <ul class="text-xs text-base-content/70 space-y-1 max-h-36 overflow-auto">
            <li v-for="(d, idx) in modDiagnostics.slice(0, 15)" :key="`d-${idx}`" class="font-mono">
              <span :class="`text-${d.level}`">[{{ d.level }}]</span>
              {{ d.modId }}/{{ d.hookId }}: 
              {{ d.message }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Mod 导入弹窗 -->
    <Teleport to="body">
      <dialog ref="modImportModalRef" class="modal" @close="showModImport = false">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-2 flex items-center gap-2"><Icon icon="tabler:plug-connected" class="text-lg" />导入 Mod(JSON)</h3>
          <p class="text-xs text-base-content/60 mb-3">粘贴完整 mod 包 JSON（manifest + patches + hooks）。导入后默认不启用。</p>
          <textarea class="textarea textarea-bordered w-full font-mono text-xs" rows="10" v-model="modImportText" placeholder="在此粘贴 mod 包 JSON..."></textarea>
          <div class="flex gap-2 mt-3 justify-end">
            <button class="btn btn-sm" :disabled="modFileImporting" @click="openModFilePicker">
              {{ modFileImporting ? '导入中...' : '选择文件(JSON/ZIP)' }}
            </button>
            <button class="btn btn-primary btn-sm" :disabled="!modImportText.trim()" @click="submitModImport">导入</button>
            <button class="btn btn-ghost btn-sm" @click="showModImport = false">取消</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </Teleport>

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
import { modManager } from '@/mods/manager'
import type { UserInfo } from 'fishpi-play'
import type { HookDiagnostic, ModPackage, StoredModEntry } from '@/mods/types'

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

// ─── Mod 管理 ────────────────────────────────────────────────
const modRows = ref<StoredModEntry[]>([])
const modWarnings = ref<string[]>([])
const modDiagnostics = ref<HookDiagnostic[]>([])

const showModImport = ref(false)
const modImportText = ref('')
const modImportModalRef = ref<HTMLDialogElement | null>(null)
const modFileInputRef = ref<HTMLInputElement | null>(null)
const modFileImporting = ref(false)

function isHighTrustMod(pkg: ModPackage): boolean {
  if (pkg.manifest.hooksRuntime === 'full-trust') return true
  if ((pkg.hooks?.length ?? 0) > 0) return true
  if (pkg.manifest.capabilities?.stores === 'all') return true
  if (pkg.manifest.capabilities?.dom === true) return true
  if (pkg.manifest.capabilities?.network === true) return true
  return false
}

function getPrivilegeSummary(pkg: ModPackage): string {
  const parts: string[] = []
  if (pkg.manifest.hooksRuntime === 'full-trust') parts.push('Full Trust 运行时')
  if ((pkg.hooks?.length ?? 0) > 0) parts.push(`脚本 Hook ${pkg.hooks?.length} 个`)
  if (pkg.manifest.capabilities?.stores === 'all') parts.push('访问全部 Store')
  if (pkg.manifest.capabilities?.dom === true) parts.push('访问 DOM')
  if (pkg.manifest.capabilities?.network === true) parts.push('访问网络')

  const allowDomains = pkg.manifest.networkPolicy?.allowDomains || []
  const blockedDomains = pkg.manifest.networkPolicy?.blockedDomains || []
  if (allowDomains.length > 0) parts.push(`网络白名单: ${allowDomains.join(', ')}`)
  if (blockedDomains.length > 0) parts.push(`网络黑名单: ${blockedDomains.join(', ')}`)
  return parts.join('；')
}

function confirmHighTrustEnable(pkg: ModPackage): boolean {
  if (!isHighTrustMod(pkg)) return true
  const summary = getPrivilegeSummary(pkg)
  return confirm(
    `即将启用高权限 Mod：${pkg.manifest.name} (${pkg.manifest.modId})\n\n权限摘要：${summary || '高权限执行'}\n\n该 Mod 脚本可能读取/改写游戏状态，且可访问页面和网络。请确认来源可信后再启用。`,
  )
}

function openModFilePicker() {
  modFileInputRef.value?.click()
}

async function onModFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  modFileImporting.value = true
  try {
    const pkg = await modManager.importModFromFile(file)
    showModImport.value = false
    refreshModPanel()
    const warning = isHighTrustMod(pkg) ? '\n该 Mod 含高权限能力，启用时会再次要求确认。' : ''
    alert(`Mod 导入成功: ${pkg.manifest.name}（默认未启用）${warning}`)
  } catch (e) {
    alert('Mod 文件导入失败: ' + (e as Error).message)
  } finally {
    modFileImporting.value = false
    target.value = ''
  }
}

function refreshModPanel() {
  modRows.value = modManager.listMods()
  modWarnings.value = modManager.getApplyResult().warnings
  modDiagnostics.value = [...modManager.getDiagnostics()].reverse()
}

watch(showModImport, (v) => {
  if (v) modImportModalRef.value?.showModal()
  else modImportModalRef.value?.close()
})

function submitModImport() {
  try {
    const pkg = modManager.importModFromText(modImportText.value)
    modImportText.value = ''
    showModImport.value = false
    refreshModPanel()
    const warning = isHighTrustMod(pkg) ? '\n该 Mod 含高权限能力，启用时会再次要求确认。' : ''
    alert(`Mod 导入成功: ${pkg.manifest.name}（默认未启用）${warning}`)
  } catch (e) {
    alert('Mod 导入失败: ' + (e as Error).message)
  }
}

function toggleMod(modId: string, enable: boolean) {
  try {
    const row = modRows.value.find(item => item.pkg.manifest.modId === modId)
    if (!row) {
      throw new Error(`找不到 Mod: ${modId}`)
    }

    if (enable && !confirmHighTrustEnable(row.pkg)) {
      return
    }

    if (enable) modManager.enableMod(modId)
    else modManager.disableMod(modId)
    refreshModPanel()
  } catch (e) {
    alert((enable ? '启用' : '停用') + '失败: ' + (e as Error).message)
  }
}

function removeMod(modId: string) {
  if (!confirm(`确认卸载 Mod: ${modId} ?`)) return
  try {
    modManager.uninstallMod(modId)
    refreshModPanel()
  } catch (e) {
    alert('卸载失败: ' + (e as Error).message)
  }
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

onMounted(() => {
  refreshModPanel()
})
</script>
<style lang="less" scoped>
  .text-error {
    color: var(--color-error);
  }
  .text-warn {
    color: var(--color-warning);
  }
  .text-info {
    color: var(--color-info);
  }
</style>