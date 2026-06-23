<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- 标题栏 -->
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-xl font-bold">🗺 地图管理</h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>

    <!-- 操作栏 -->
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增地图</button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>

    <!-- 表格 -->
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead><tr><th>标识符</th><th>名称</th><th>图标</th><th>描述</th><th class="w-28">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td>
            <td>{{ r.name }}</td>
            <td class="font-mono text-xs">{{ r.icon || '—' }}</td>
            <td class="max-w-xs truncate text-xs opacity-70">{{ r.description }}</td>
            <td><button class="btn btn-xs btn-ghost" @click="openEdit(r)">编辑</button><button class="btn btn-xs btn-ghost text-error" @click="remove(r)">删除</button></td>
          </tr>
          <tr v-if="!records.length"><td colspan="5" class="text-center py-12 text-base-content/30 text-sm">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-lg">
          <h3 class="text-lg font-bold mb-6">{{ editing ? '编辑地图' : '新增地图' }}</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">标识符 <span class="text-error">*</span></span>
                <input class="input input-bordered input-sm w-full" v-model="form.key" placeholder="唯一英文标识" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">名称</span>
                <input class="input input-bordered input-sm w-full" v-model="form.name" placeholder="中文名称" />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">图标（Iconify 图标名）</span>
              <input class="input input-bordered input-sm w-full" v-model="form.icon" placeholder="如 hugeicons:mountain" />
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">描述</span>
              <textarea class="textarea textarea-bordered textarea-sm w-full" v-model="form.description" rows="2" placeholder="地图描述"></textarea>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">坐标 X</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.px" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">坐标 Y</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.py" />
              </label>
            </div>
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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
const admin = useAdminStore()
const records = ref<any[]>([])
const modalRef = ref<HTMLDialogElement | null>(null)
const editing = ref<any>(null)
const form = ref({ key:'', name:'', icon:'', description:'', px:0, py:0 })
onMounted(loadRecords)
async function loadRecords() { const r = await admin.apiFetch('/api/maps'); records.value = await r.json() }
function resetForm() { form.value = { key:'', name:'', icon:'', description:'', px:0, py:0 }; editing.value = null }
function openNew() { resetForm(); modalRef.value?.showModal() }
function openEdit(r: any) { editing.value = r; form.value = { key:r.key||'', name:r.name||'', icon:r.icon||'', description:r.description||'', px:r.position?.x||0, py:r.position?.y||0 }; modalRef.value?.showModal() }
function closeModal() { modalRef.value?.close() }
async function save() {
  if (!form.value.key) { alert('标识符不能为空'); return }
  const body: any = { key:form.value.key, name:form.value.name, icon:form.value.icon, description:form.value.description }
  if (form.value.px || form.value.py) body.position = { x: form.value.px, y: form.value.py }
  try {
    const res = editing.value ? await admin.apiFetch(`/api/maps/${editing.value.key}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }) : await admin.apiFetch('/api/maps', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const j = await res.json(); if (!res.ok) { alert(j.error||'失败'); return }
    closeModal(); loadRecords()
  } catch(e:any){ alert(e.message) }
}
async function remove(r: any) { if (!confirm(`确定删除地图「${r.name||r.key}」？`)) return; await admin.apiFetch(`/api/maps/${r.key}`, { method:'DELETE' }); loadRecords() }
</script>
