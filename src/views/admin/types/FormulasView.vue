<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-xl font-bold">📜 配方管理</h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增配方</button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead><tr><th>标识符</th><th>名称</th><th>耗时</th><th>容器</th><th>操作</th><th class="w-28">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td><td>{{ r.name }}</td><td>{{ r.time_required }}s</td>
            <td class="text-xs">{{ r.required_container||'—' }}</td><td class="text-xs">{{ r.required_actions?.key||'—' }}</td>
            <td><button class="btn btn-xs btn-ghost" @click="openEdit(r)">编辑</button><button class="btn btn-xs btn-ghost text-error" @click="remove(r)">删除</button></td>
          </tr>
          <tr v-if="!records.length"><td colspan="6" class="text-center py-12 text-base-content/30 text-sm">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-2xl">
          <h3 class="text-lg font-bold mb-6">{{ editing ? '编辑配方' : '新增配方' }}</h3>
          <div class="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <!-- 基本信息 -->
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">标识符 <span class="text-error">*</span></span>
                <input class="input input-bordered input-sm w-full" v-model="form.key" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">名称</span>
                <input class="input input-bordered input-sm w-full" v-model="form.name" />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">描述</span>
              <textarea class="textarea textarea-bordered textarea-sm w-full" v-model="form.description" rows="2"></textarea>
            </label>
            <div class="grid grid-cols-3 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">耗时（秒）</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.time_required" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">所需容器</span>
                <select class="select select-bordered select-sm w-full" v-model="form.container">
                  <option value="">不要求容器</option>
                  <option v-for="o in containerItems" :key="o.key" :value="o.key">{{ o.name }}（{{ o.key }}）</option>
                </select>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">实验操作</span>
                <select class="select select-bordered select-sm w-full" v-model="form.action_key">
                  <option value="">不要求操作</option>
                  <option v-for="o in labOptions" :key="o.key" :value="o.key">{{ o.name }}（{{ o.key }}）</option>
                </select>
              </label>
            </div>

            <!-- 操作参数 -->
            <div v-if="form.action_key" class="grid grid-cols-2 gap-4 bg-base-200 rounded-box p-3">
              <label class="form-control w-full">
                <span class="label-text mb-1">最少操作次数</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.action_min" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">最多操作次数（留空不限）</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.action_max" />
              </label>
            </div>

            <!-- 所需材料（支持可选材料，用逗号分隔 key） -->
            <div class="divider text-xs opacity-50 mt-0">所需材料（多个 key 用逗号分隔表示可替代）</div>
            <div v-for="(row,i) in objItems" :key="i" class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2">
              <div class="flex-1 flex flex-wrap gap-1 items-center">
                <span v-for="(k,ki) in row._keys" :key="ki" class="badge badge-primary badge-xs gap-1 cursor-pointer" @click="removeItemKey(row,ki)">{{ k }} ✕</span>
                <select class="select select-bordered select-xs" v-model="row._input" @change="addItemKey(row)">
                  <option value="" disabled>添加…</option>
                  <option v-for="o in itemOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </div>
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">数量<input type="number" class="input input-bordered input-xs w-14" v-model.number="row.quantity" /></label>
              <button class="btn btn-xs btn-ghost text-error" @click="objItems.splice(i,1)">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="objItems.push({_keys:[],_input:'',key:'',quantity:1})">＋ 添加材料</button>

            <!-- 产物 -->
            <div class="divider text-xs opacity-50 mt-0">产物</div>
            <div v-for="(row,i) in objProducts" :key="i" class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2">
              <select class="select select-bordered select-xs flex-1" v-model="row.key">
                <option value="" disabled>选择产物</option>
                <option v-for="o in itemOptions" :key="o.key" :value="o.key">{{ o.name }}（{{ o.key }}）</option>
              </select>
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">倍率<input type="number" class="input input-bordered input-xs w-14" v-model.number="row.multiple" /></label>
              <button class="btn btn-xs btn-ghost text-error" @click="objProducts.splice(i,1)">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="objProducts.push({key:'',multiple:1})">＋ 添加产物</button>

            <!-- 前置科技 -->
            <label class="form-control w-full">
              <span class="label-text mb-1">前置科技（点击移除）</span>
              <div class="flex flex-wrap gap-1 mb-1">
                <span v-for="(t,i) in form.techs" :key="i" class="badge badge-ghost badge-sm gap-1 cursor-pointer" @click="form.techs.splice(i,1)">{{ t }} ✕</span>
              </div>
              <select class="select select-bordered select-xs" v-model="techInput" @change="addTech">
                <option value="" disabled>添加科技…</option>
                <option v-for="o in techOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
              </select>
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

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
const admin = useAdminStore()
const records = ref<any[]>([]); const modalRef = ref<HTMLDialogElement | null>(null)
const editing = ref<any>(null)
const form = reactive({ key:'', name:'', description:'', time_required:30, container:'', action_key:'', action_min:1, action_max:undefined as number|undefined, techs:[] as string[] })
const techInput = ref('')
const objItems = reactive<any[]>([])
const objProducts = reactive<any[]>([])
const itemOptions = ref<any[]>([]); const techOptions = ref<any[]>([]); const labOptions = ref<any[]>([]); const containerItems = ref<any[]>([])

onMounted(() => { loadRecords(); fetchRefs() })
async function loadRecords() { const r = await admin.apiFetch('/api/formulas'); records.value = await r.json() }
async function fetchRefs() { const [ir,tr,lr,cr] = await Promise.all([admin.apiFetch('/api/items'), admin.apiFetch('/api/techs'), admin.apiFetch('/api/labs'), admin.apiFetch('/api/items')]); itemOptions.value = await ir.json(); techOptions.value = await tr.json(); labOptions.value = await lr.json(); containerItems.value = (await cr.json()).filter((i:any)=>i.type?.includes('container')) }

function addItemKey(row: any) { const v = row._input; if (!v) return; if (!row._keys.includes(v)) row._keys.push(v); row._input = ''; row.key = row._keys.join(',') }
function removeItemKey(row: any, idx: number) { row._keys.splice(idx,1); row.key = row._keys.join(',') || '' }

function resetForm() { Object.assign(form, { key:'', name:'', description:'', time_required:30, container:'', action_key:'', action_min:1, action_max:undefined, techs:[] }); objItems.splice(0); objProducts.splice(0); editing.value = null }
function openNew() { resetForm(); modalRef.value?.showModal() }
function openEdit(r: any) {
  resetForm(); editing.value = r
  Object.assign(form, { key:r.key||'', name:r.name||'', description:r.description||'', time_required:r.time_required??30, container:r.required_container||'', action_key:r.required_actions?.key||'', action_min:r.required_actions?.min??1, action_max:r.required_actions?.max, techs:[...(r.required_techs||[])] })
  objItems.push(...(r.required_items||[]).map((x:any)=>{ const keys = Array.isArray(x.key) ? x.key : (x.key ? [x.key] : []); return {...x, _keys:[...keys], _input:''} }))
  objProducts.push(...(r.products||[]).map((x:any)=>({...x})))
  modalRef.value?.showModal()
}
function closeModal() { modalRef.value?.close() }
function addTech() { if (techInput.value && !form.techs.includes(techInput.value)) form.techs.push(techInput.value); techInput.value = '' }
async function save() {
  if (!form.key) { alert('标识符不能为空'); return }
  const body: Record<string,any> = { key:form.key, name:form.name, description:form.description, time_required:form.time_required }
  if (form.container) body.required_container = form.container
  if (form.action_key) { body.required_actions = { key:form.action_key, min:form.action_min??1 }; if (form.action_max !== undefined && form.action_max !== null) body.required_actions.max = form.action_max }
  if (objItems.length) body.required_items = objItems.map((r:any)=>{const o:any={};if(r._keys.length===1) o.key=r._keys[0]; else if(r._keys.length>1) o.key=[...r._keys]; else return null; if(r.quantity!==undefined&&r.quantity!=='')o.quantity=r.quantity;return o}).filter(Boolean)
  if (objProducts.length) body.products = objProducts.map((r:any)=>{const o:any={};if(r.key)o.key=r.key;if(r.multiple!==undefined&&r.multiple!=='')o.multiple=r.multiple;return o})
  if (form.techs.length) body.required_techs = [...form.techs]
  try { const res = editing.value ? await admin.apiFetch(`/api/formulas/${editing.value.key}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}) : await admin.apiFetch('/api/formulas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j = await res.json(); if(!res.ok){alert(j.error||'失败');return}; closeModal(); loadRecords() } catch(e:any){alert(e.message)}
}
async function remove(r: any) { if (!confirm(`确定删除配方「${r.name||r.key}」？`)) return; await admin.apiFetch(`/api/formulas/${r.key}`,{method:'DELETE'}); loadRecords() }
</script>
