<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
import { Eras } from '@/data/eras'

const admin = useAdminStore()
const records = ref<any[]>([])
const modalRef = ref<HTMLDialogElement | null>(null)

const editing = ref<any>(null)
const form = reactive({
  id: '',
  content: '',
  era: undefined as string | undefined
})

async function loadRecords() {
  try {
    const res = await admin.apiFetch('/api/tips')
    records.value = await res.json()
  } catch (e) {
    console.error('Failed to load tips:', e)
  }
}

function resetForm() {
  Object.assign(form, { id: '', content: '', era: undefined })
  editing.value = null
}

function openNew() {
  resetForm()
  form.id = `tip-${Date.now()}`
  modalRef.value?.showModal()
}

function openEdit(r: any) {
  resetForm()
  editing.value = r
  Object.assign(form, { 
    id: r.id || '',
    content: r.content || '',
    era: r.era
  })
  modalRef.value?.showModal()
}

function closeModal() {
  modalRef.value?.close()
}

async function remove(r: any) {
  if (!confirm(`确定要删除贴士 ${r.id} 吗？`)) return
  try {
    const res = await admin.apiFetch(`/api/tips/${r.id}`, { method: 'DELETE' })
    if (res.ok) loadRecords()
  } catch (e) {
    alert('删除失败')
  }
}

async function save() {
  if (!form.id || !form.content) {
    alert('ID 和 内容不能为空')
    return
  }
  
  const body: any = { 
    id: form.id,
    content: form.content,
    era: form.era
  }

  try {
    const isNew = !editing.value
    const url = isNew ? '/api/tips' : `/api/tips/${editing.value.id}`
    const method = isNew ? 'POST' : 'PUT'
    
    const res = await admin.apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (res.ok) {
      loadRecords()
      closeModal()
    } else {
      const err = await res.json()
      alert(err.error || '保存失败')
    }
  } catch (e) {
    alert('保存出错')
  }
}

onMounted(loadRecords)
</script>

<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-xl font-bold inline-flex items-center gap-1">
        <Icon icon="tabler:bulb" class="inline-block align-middle mr-1" />贴士管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>

    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增贴士</button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-sm">
        <thead>
          <tr>
            <th class="w-24">ID</th>
            <th class="w-32">要求时代</th>
            <th>内容</th>
            <th class="w-32 text-center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td class="font-mono text-xs opacity-50">{{ r.id }}</td>
            <td>
              <span v-if="r.era" class="badge badge-outline badge-xs">
                {{ Eras.find(e => e.key === r.era)?.name || r.era }}
              </span>
              <span v-else class="text-xs opacity-30">不限</span>
            </td>
            <td class="text-sm">{{ r.content }}</td>
            <td class="text-center">
              <div class="join">
                <button class="btn btn-xs btn-ghost join-item" @click="openEdit(r)">编辑</button>
                <button class="btn btn-xs btn-ghost text-error join-item" @click="remove(r)">删除</button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td colspan="4" class="text-center py-12 text-base-content/30 text-sm">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-xl text-base-content">
          <h3 class="text-lg font-bold mb-6">
            {{ editing ? "编辑贴士" : "新增贴士" }}
          </h3>
          <div class="space-y-4 text-left">
            <label class="form-control w-full">
              <span class="label-text mb-1">标识符 <span class="text-error">*</span></span>
              <input class="input input-bordered input-sm w-full font-mono text-base-content" v-model="form.id" placeholder="tip-xxx" />
            </label>
            
            <label class="form-control w-full">
              <span class="label-text mb-1">显示时代要求</span>
              <select class="select select-bordered select-sm w-full text-base-content" v-model="form.era">
                <option :value="undefined">不限 (始终显示)</option>
                <option v-for="e in Eras" :key="e.key" :value="e.key">
                  {{ e.name }} (及以后)
                </option>
              </select>
              <div class="label">
                <span class="label-text-alt opacity-50">只有玩家到达此时代或更晚时代时，此贴士才会出现在随机轮播中。</span>
              </div>
            </label>

            <label class="form-control w-full">
              <span class="label-text mb-1">贴士内容 <span class="text-error">*</span></span>
              <textarea class="textarea textarea-bordered textarea-sm w-full text-base-content" v-model="form.content" rows="4" placeholder="输入要显示的内容..."></textarea>
            </label>
          </div>
          
          <div class="modal-action mt-6">
            <button class="btn btn-ghost btn-sm" @click="closeModal">取消</button>
            <button class="btn btn-primary btn-sm" @click="save">保存</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </Teleport>
  </div>
</template>
