<template>
  <div class="flex-1 overflow-y-auto p-4">
    <!-- 标题栏 -->
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-xl font-bold">🗺 地图管理</h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>

    <!-- 图形编辑器 -->
    <div class="card bg-base-200 mb-6">
      <div class="card-body p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-sm">坐标编辑器</h3>
          <div class="flex gap-2 text-xs items-center">
            <button class="btn btn-xs btn-ghost" @click="zoomOut" :disabled="zoom <= 0.3">−</button>
            <span class="font-mono min-w-[3em] text-center">{{ Math.round(zoom * 100) }}%</span>
            <button class="btn btn-xs btn-ghost" @click="zoomIn" :disabled="zoom >= 3">+</button>
            <span class="opacity-30 mx-1">|</span>
            <button class="btn btn-xs btn-ghost" @click="resetPositions">重置布局</button>
            <button class="btn btn-xs btn-primary" @click="saveAllPositions" :disabled="!hasChanges">💾 保存全部坐标</button>
          </div>
        </div>
        <div class="relative border border-base-300 rounded-lg overflow-hidden" ref="canvasRef"
          style="height: 420px; background-image: radial-gradient(circle, oklch(var(--bc) / 0.08) 1px, transparent 1px); background-size: 20px 20px;"
          @click="onCanvasClick"
          @wheel.prevent="onWheel"
        >
          <!-- 缩放容器 -->
          <div class="absolute inset-0 origin-top-left transition-transform duration-100" :style="{ transform: `scale(${zoom})` }">
            <!-- 地图节点 -->
            <div
              v-for="r in records" :key="r.key"
              class="absolute flex flex-col items-center gap-0.5 cursor-grab active:cursor-grabbing select-none transition-shadow"
              :class="{ 'ring-2 ring-primary rounded-lg': draggingKey === r.key }"
              :style="{ left: ((r.position?.x ?? 0) * 1.5 + 60) + 'px', top: ((r.position?.y ?? 0) * 1.5 + 20) + 'px', zIndex: draggingKey === r.key ? 10 : 1 }"
            @mousedown.stop="startDrag($event, r)"
            @touchstart.stop.prevent="startDrag($event, r)"
          >
            <div class="w-14 h-14 rounded-xl bg-base-300 border border-base-300 flex items-center justify-center text-lg shadow-md hover:shadow-lg transition-shadow"
              :class="{ 'ring-2 ring-primary': selectedKey === r.key }"
              @click.stop="selectNode(r)"
            >
              <Icon v-if="r.icon" :icon="r.icon" class="text-xl" />
              <span v-else class="text-xs opacity-40">📍</span>
            </div>
            <span class="text-[10px] font-medium px-1 truncate max-w-[80px] text-center leading-tight">{{ r.name }}</span>
            <span class="text-[9px] opacity-40 font-mono">{{ r.position?.x ?? 0 }}, {{ r.position?.y ?? 0 }}</span>
          </div>

          </div>
          <!-- /缩放容器 -->

          <!-- 选中节点的编辑面板 -->
          <div v-if="selectedNode" class="absolute bottom-2 right-2 bg-base-100 border border-base-300 rounded-lg p-3 shadow-lg z-20 flex gap-3 items-center text-xs">
            <span class="font-medium">{{ selectedNode.name }}</span>
            <label class="flex items-center gap-1">X <input type="number" class="input input-bordered input-xs w-16" v-model.number="selectedNode.position.x" @input="markChanged" /></label>
            <label class="flex items-center gap-1">Y <input type="number" class="input input-bordered input-xs w-16" v-model.number="selectedNode.position.y" @input="markChanged" /></label>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增地图</button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>

    <!-- 表格 -->
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead><tr><th>标识符</th><th>名称</th><th>图标</th><th>坐标</th><th>描述</th><th class="w-28">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td>
            <td>{{ r.name }}</td>
            <td class="font-mono text-xs">{{ r.icon || '—' }}</td>
            <td class="font-mono text-xs">{{ r.position?.x ?? 0 }}, {{ r.position?.y ?? 0 }}</td>
            <td class="max-w-xs truncate text-xs opacity-70">{{ r.description }}</td>
            <td><button class="btn btn-xs btn-ghost" @click="openEdit(r)">编辑</button><button class="btn btn-xs btn-ghost text-error" @click="remove(r)">删除</button></td>
          </tr>
          <tr v-if="!records.length"><td colspan="6" class="text-center py-12 text-base-content/30 text-sm">暂无数据</td></tr>
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

// ─── 图形编辑器 ──────────────────────────────────────────────
const canvasRef = ref<HTMLElement | null>(null)
const selectedKey = ref<string | null>(null)
const draggingKey = ref<string | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const hasChanges = ref(false)
const zoom = ref(1)

const selectedNode = ref<any>(null)

function zoomIn() { zoom.value = Math.min(3, zoom.value + 0.2) }
function zoomOut() { zoom.value = Math.max(0.3, zoom.value - 0.2) }
function onWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    zoom.value = Math.max(0.3, Math.min(3, zoom.value - e.deltaY * 0.005))
  }
}

onMounted(loadRecords)

async function loadRecords() {
  const r = await admin.apiFetch('/api/maps')
  records.value = await r.json()
  hasChanges.value = false
  selectedNode.value = null
}

function selectNode(r: any) {
  selectedKey.value = r.key
  selectedNode.value = r
}

function markChanged() {
  hasChanges.value = true
}

function startDrag(e: MouseEvent | TouchEvent, r: any) {
  draggingKey.value = r.key
  const pos = 'touches' in e ? e.touches[0] : e
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  dragOffset.value = {
    x: pos.clientX - rect.left - ((r.position?.x ?? 0) * 1.5 + 60) * zoom.value,
    y: pos.clientY - rect.top - ((r.position?.y ?? 0) * 1.5 + 20) * zoom.value,
  }
  selectedNode.value = r
  selectedKey.value = r.key

  const onMove = (ev: MouseEvent | TouchEvent) => {
    if (!draggingKey.value || !canvasRef.value) return
    const p = 'touches' in ev ? ev.touches[0] : ev
    const rect = canvasRef.value.getBoundingClientRect()
    if (!r.position) r.position = { x: 0, y: 0 }
    r.position.x = Math.max(0, Math.round((p.clientX - rect.left - dragOffset.value.x) / (1.5 * zoom.value)))
    r.position.y = Math.max(0, Math.round((p.clientY - rect.top - dragOffset.value.y) / (1.5 * zoom.value)))
    hasChanges.value = true
  }
  const onUp = () => {
    draggingKey.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onUp)
}

function onCanvasClick(e: MouseEvent) {
  if ((e.target as HTMLElement) === canvasRef.value) {
    selectedKey.value = null
    selectedNode.value = null
  }
}

async function saveAllPositions() {
  for (const r of records.value) {
    try {
      await admin.apiFetch(`/api/maps/${r.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: r.key, name: r.name, icon: r.icon, description: r.description,
          position: { x: r.position?.x ?? 0, y: r.position?.y ?? 0 },
        }),
      })
    } catch { /* skip */ }
  }
  hasChanges.value = false
  alert('✅ 所有地图坐标已保存')
}

function resetPositions() {
  if (!confirm('重置所有地图坐标为默认布局？')) return
  const cols = 4
  records.value.forEach((r, i) => {
    if (!r.position) r.position = { x: 0, y: 0 }
    r.position.x = (i % cols) * 100
    r.position.y = Math.floor(i / cols) * 80
  })
  hasChanges.value = true
}

// ─── 表单编辑 ──────────────────────────────────────────────
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
