<template>
  <div class="flex flex-col h-screen">
    <!-- Header -->
    <header class="navbar bg-base-200 border-b border-base-300 px-4 flex-none">
      <div class="flex-1">
        <span class="text-lg font-bold">⚙️ 数据管理后台</span>
      </div>
      <div class="flex-none gap-2">
        <span class="text-xs text-base-content/50">{{ currentModel?.label }} {{ records.length }} 条</span>
        <button class="btn btn-ghost btn-xs" @click="logout">退出</button>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs tabs-bordered bg-base-200 px-4 flex-none overflow-x-auto">
      <a v-for="m in models" :key="m.key"
        class="tab tab-bordered tab-sm whitespace-nowrap"
        :class="{ 'tab-active': currentType === m.key }"
        @click="switchType(m.key)"
      >{{ m.label }}</a>
      <a class="tab tab-bordered tab-sm" :class="{ 'tab-active': currentType === 'ai' }" @click="currentType = 'ai'">🤖 AI 生成</a>
    </div>

    <!-- AI Generator Panel -->
    <div v-if="currentType === 'ai'" class="flex-1 overflow-y-auto p-4">
      <AiGenerator />
    </div>

    <!-- Data Panel -->
    <div v-else class="flex-1 overflow-y-auto p-4">
      <div class="flex gap-2 mb-3">
        <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增</button>
        <button class="btn btn-ghost btn-sm" @click="refresh">🔄 刷新</button>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-xs">
          <thead>
            <tr>
              <th v-for="f in displayFields" :key="f">{{ f }}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in records" :key="String(r[keyField])">
              <td v-for="f in displayFields" :key="f" class="max-w-[200px] truncate">
                {{ formatValue(r[f]) }}
              </td>
              <td class="whitespace-nowrap">
                <button class="btn btn-xs btn-primary mr-1" @click="openEdit(r)">编辑</button>
                <button class="btn btn-xs btn-error" @click="remove(r)">删除</button>
              </td>
            </tr>
            <tr v-if="records.length === 0">
              <td :colspan="displayFields.length + 1" class="text-center text-base-content/40 py-8">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Editor Modal -->
    <Teleport to="body">
      <dialog ref="modalRef" class="modal" @close="onModalClose">
        <div class="modal-box w-11/12 max-w-3xl">
          <h3 class="font-bold text-lg mb-4">{{ editingRecord ? '编辑' : '新增' }}</h3>
          <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div v-for="(tag, f) in fieldTags" :key="f" class="form-control">
              <label class="label">
                <span class="label-text">{{ tag.label || f }}</span>
              </label>

              <!-- boolean -->
              <input v-if="tag.type === 'boolean'" type="checkbox" class="toggle" v-model="formData[f]" />

              <!-- number -->
              <input v-else-if="tag.type === 'number'" type="number" class="input input-bordered input-sm"
                v-model.number="formData[f]" :placeholder="f" />

              <!-- json -->
              <textarea v-else-if="tag.type === 'json'" class="textarea textarea-bordered textarea-sm font-mono"
                v-model="formJson[f]" :placeholder="'JSON: ' + f" rows="2"></textarea>

              <!-- stringarray (tags) -->
              <div v-else-if="tag.type === 'stringarray'" class="flex flex-wrap gap-1 items-center">
                <span v-for="(t, ti) in formArrays[f]" :key="ti"
                  class="badge badge-outline gap-1">{{ t }}
                  <button class="text-lg leading-none cursor-pointer" @click="formArrays[f].splice(ti, 1)">&times;</button>
                </span>
                <input type="text" class="input input-bordered input-xs w-24"
                  v-model="tagInputs[f]" @keyup.enter="addTag(f)" placeholder="添加" />
                <button class="btn btn-xs btn-ghost" @click="addTag(f)">＋</button>
              </div>

              <!-- objarray -->
              <div v-else-if="tag.type === 'objarray'" class="space-y-1">
                <div v-for="(row, ri) in formObjArrays[f]" :key="ri" class="flex gap-1 items-start">
                  <input v-for="sf in (tag.fields || ['key'])" :key="sf"
                    :placeholder="sf"
                    class="input input-bordered input-xs flex-1"
                    v-model="row[sf]" />
                  <button class="btn btn-xs btn-ghost text-error" @click="formObjArrays[f].splice(ri, 1)">&times;</button>
                </div>
                <button class="btn btn-xs btn-ghost" @click="addObjRow(f)">＋ 添加行</button>
              </div>

              <!-- object (simple key-value) -->
              <div v-else-if="tag.type === 'object'" class="flex gap-2 flex-wrap">
                <div v-for="(v, subKey) in formObjects[f]" :key="subKey" class="flex items-center gap-1">
                  <span class="text-xs opacity-60">{{ subKey }}:</span>
                  <input type="text" class="input input-bordered input-xs w-24" v-model="formObjects[f][subKey]" />
                </div>
              </div>

              <!-- default text -->
              <input v-else type="text" class="input input-bordered input-sm" v-model="formData[f]" :placeholder="f" />
            </div>
          </div>
          <div class="modal-action">
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
import { ref, computed, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/modules/admin'
import AiGenerator from './AiGenerator.vue'

const router = useRouter()
const admin = useAdminStore()

// ─── 模型元信息 ──────────────────────────────────────────────────
const models = ref<{ key: string; label: string; file: string; keyField: string }[]>([])
const currentType = ref('')
const currentModel = computed(() => models.value.find(m => m.key === currentType.value))

const keyField = computed(() => currentModel.value?.keyField || 'key')
const records = ref<any[]>([])

// ─── 字段标签定义 ──────────────────────────────────────────────
const FIELD_TAGS: Record<string, any> = {
  key:       { label: '标识符' },
  name:      { label: '名称' },
  category:  { label: '分类' },
  description:{label: '描述'},
  icon:      { label: '图标' },
  time_required:{label:'耗时(秒)', type:'number'},
  probability:{label:'概率', type:'number'},
  quantity:  { label: '数量', type:'number' },
  multiple:  { label: '倍率', type:'number' },
  durable:   { label: '耐久度', type:'number' },
  elemental: { label: '元素序数', type:'number' },
  requires_burning:{label:'需要燃烧', type:'boolean'},
  required_items:{label:'所需物品', type:'objarray', fields:['key','quantity','use']},
  rewards:   { label: '奖励', type:'objarray', fields:['key','quantity','probability','map']},
  products:  { label: '产物', type:'objarray', fields:['key','multiple']},
  required_techs:{label:'前置科技', type:'stringarray'},
  type:      { label: '类型标签', type:'stringarray'},
  map:       { label: '解锁地图', type:'stringarray'},
  required_item:{label:'所需物品', type:'objarray', fields:['key','quantity','use']},
  required_container:{label:'要求容器'},
  required_actions:{label:'所需操作', type:'object', fields:{key:'操作',min:'最少',max:'最多'}},
  position:  { label: '位置', type:'object', fields:{x:'X',y:'Y'}},
  attrs:     { label: '属性', type:'json'},
  formula:   { label: '配方引用', type:'object', fields:{key:'配方key',operation:'操作key'}},
}

const displayFields = computed(() => {
  if (!records.value.length) return ['key', 'name']
  const keys = new Set<string>()
  records.value.forEach(r => Object.keys(r).forEach(k => keys.add(k)))
  const omit = new Set(['required_items','rewards','products','required_item','type','required_techs','required_actions','map','attrs','position','formula'])
  return Array.from(keys).filter(k => !omit.has(k)).slice(0, 6)
})

function formatValue(v: any): string {
  if (v === undefined || v === null) return '—'
  if (Array.isArray(v)) return `[${v.length}项]`
  if (typeof v === 'object') return '{…}'
  if (typeof v === 'boolean') return v ? '✅' : '❌'
  return String(v)
}

// ─── 数据加载 ──────────────────────────────────────────────────
async function fetchModels() {
  const res = await admin.apiFetch('/api')
  models.value = await res.json()
}

async function loadRecords() {
  if (!currentType.value) return
  const res = await admin.apiFetch(`/api/${currentType.value}`)
  records.value = await res.json()
}

function switchType(type: string) {
  currentType.value = type
  if (type !== 'ai') loadRecords()
}

function refresh() { loadRecords() }

// ─── 模态框 ────────────────────────────────────────────────────
const modalRef = ref<HTMLDialogElement | null>(null)
const editingRecord = ref<any>(null)
const formData = reactive<Record<string, any>>({})
const formJson = reactive<Record<string, string>>({})
const formArrays = reactive<Record<string, string[]>>({})
const formObjArrays = reactive<Record<string, any[]>>({})
const formObjects = reactive<Record<string, Record<string, string>>>({})
const tagInputs = reactive<Record<string, string>>({})

function getFieldTags() {
  if (!records.value.length) return FIELD_TAGS
  const keys = new Set<string>()
  records.value.forEach(r => Object.keys(r).forEach(k => keys.add(k)))
  const tags: Record<string, any> = {}
  for (const k of keys) {
    tags[k] = FIELD_TAGS[k] || { label: k }
  }
  return tags
}

const fieldTags = computed(() => getFieldTags())

function openNew() {
  editingRecord.value = null
  resetForm()
  modalRef.value?.showModal()
}

function openEdit(record: any) {
  editingRecord.value = record
  resetForm()
  // 填充表单
  for (const [k, v] of Object.entries(record)) {
    const tag = FIELD_TAGS[k] || {}
    if (tag.type === 'json') {
      formJson[k] = v ? JSON.stringify(v, null, 2) : ''
    } else if (tag.type === 'stringarray') {
      formArrays[k] = Array.isArray(v) ? [...v] : []
    } else if (tag.type === 'objarray') {
      formObjArrays[k] = v ? JSON.parse(JSON.stringify(v)) : []
    } else if (tag.type === 'object') {
      formObjects[k] = v ? Object.fromEntries(Object.entries(v).map(([sk, sv]) => [sk, String(sv)])) : {}
      // 用缺省字段补齐
      const defs = tag.fields || {}
      for (const defK of Object.keys(defs)) {
        if (!(defK in formObjects[k])) formObjects[k][defK] = ''
      }
    } else {
      formData[k] = v
    }
  }
  modalRef.value?.showModal()
}

function resetForm() {
  for (const k of Object.keys(formData)) delete formData[k]
  for (const k of Object.keys(formJson)) delete formJson[k]
  for (const k of Object.keys(formArrays)) formArrays[k] = []
  for (const k of Object.keys(formObjArrays)) formObjArrays[k] = []
  for (const k of Object.keys(formObjects)) delete formObjects[k]
  // 补全 key
  formData['key'] = ''
}

function onModalClose() {
  // dialog 自带关闭，不需要额外逻辑
}

function closeModal() {
  modalRef.value?.close()
}

function addTag(f: string) {
  const v = tagInputs[f]?.trim()
  if (!v) return
  if (!formArrays[f]) formArrays[f] = []
  formArrays[f].push(v)
  tagInputs[f] = ''
}

function addObjRow(f: string) {
  if (!formObjArrays[f]) formObjArrays[f] = []
  const tag = FIELD_TAGS[f] || {}
  const row: Record<string, string> = {}
  for (const sf of (tag.fields || ['key'])) row[sf] = ''
  formObjArrays[f].push(row)
}

// ─── 保存 ──────────────────────────────────────────────────────
async function save() {
  const data: Record<string, any> = {}

  for (const [k, v] of Object.entries(formData)) {
    if (v !== '' && v !== undefined && v !== null) data[k] = v
  }
  for (const [k, v] of Object.entries(formJson)) {
    if (v.trim()) {
      try { data[k] = JSON.parse(v) } catch { alert(`字段 ${k} JSON 格式错误`); return }
    }
  }
  for (const [k, arr] of Object.entries(formArrays)) {
    if (arr.length) data[k] = [...arr]
  }
  for (const [k, arr] of Object.entries(formObjArrays)) {
    if (arr.length) {
      data[k] = arr.map((row: any) => {
        const obj: Record<string, any> = {}
        for (const [sk, sv] of Object.entries(row)) {
          if (sv === '' || sv === undefined || sv === null) continue
          let val: any = sv
          // 逗号分隔的数量转数组
          if ((sk === 'quantity' || sk === 'multiple') && typeof val === 'string' && val.includes(',')) {
            val = val.split(',').map((s: string) => { const n = Number(s.trim()); return isNaN(n) ? s.trim() : n }).filter((s: any) => s !== '')
          } else if (!isNaN(Number(val)) && val !== '') {
            val = Number(val)
          }
          obj[sk] = val
        }
        return obj
      })
    }
  }
  for (const [k, obj] of Object.entries(formObjects)) {
    const clean: Record<string, any> = {}
    for (const [sk, sv] of Object.entries(obj)) {
      if (sv === '' || sv === undefined) continue
      clean[sk] = isNaN(Number(sv)) ? sv : Number(sv)
    }
    if (Object.keys(clean).length) data[k] = clean
  }

  if (!data.key) { alert('key 字段不能为空'); return }

  try {
    let res: Response
    if (editingRecord.value) {
      res = await admin.apiFetch(`/api/${currentType.value}/${editingRecord.value[keyField.value]}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...admin.authHeaders() },
        body: JSON.stringify(data),
      })
    } else {
      res = await admin.apiFetch(`/api/${currentType.value}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...admin.authHeaders() },
        body: JSON.stringify(data),
      })
    }
    const json = await res.json()
    if (!res.ok) { alert(json.error || '保存失败'); return }
    closeModal()
    loadRecords()
  } catch (e) {
    alert('保存失败: ' + (e as Error).message)
  }
}

// ─── 删除 ──────────────────────────────────────────────────────
async function remove(record: any) {
  if (!confirm(`确定删除 key="${record[keyField.value]}" 的记录？`)) return
  try {
    const res = await admin.apiFetch(`/api/${currentType.value}/${record[keyField.value]}`, {
      method: 'DELETE',
      headers: admin.authHeaders(),
    })
    const json = await res.json()
    if (!res.ok) { alert(json.error || '删除失败'); return }
    loadRecords()
  } catch (e) {
    alert('删除失败: ' + (e as Error).message)
  }
}

// ─── 退出 ──────────────────────────────────────────────────────
function logout() {
  admin.logout()
  router.push('/admin')
}

// ─── 初始化 ──────────────────────────────────────────────────
fetchModels()
</script>
