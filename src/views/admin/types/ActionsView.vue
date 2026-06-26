<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn btn-ghost btn-sm" @click="$router.push('/admin/dashboard')">← 返回</button>
      <h2 class="text-xl font-bold">⚡ 行动管理</h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">＋ 新增行动</button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead><tr><th>标识符</th><th>名称</th><th>分类</th><th>耗时</th><th class="w-28">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td><td>{{ r.name }}</td><td>{{ r.category }}</td><td>{{ r.time_required }}s</td>
            <td><button class="btn btn-xs btn-ghost" @click="openEdit(r)">编辑</button><button class="btn btn-xs btn-ghost text-error" @click="remove(r)">删除</button></td>
          </tr>
          <tr v-if="!records.length"><td colspan="5" class="text-center py-12 text-base-content/30 text-sm">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-2xl">
          <h3 class="text-lg font-bold mb-6">{{ editing ? '编辑行动' : '新增行动' }}</h3>
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
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">分类</span>
                <input class="input input-bordered input-sm w-full" v-model="form.category" placeholder="采集 / 制作" />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">耗时（秒）</span>
                <input type="number" class="input input-bordered input-sm w-full" v-model.number="form.time_required" />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">描述</span>
              <textarea class="textarea textarea-bordered textarea-sm w-full" v-model="form.description" rows="2"></textarea>
            </label>

            <!-- 所需材料 -->
            <div class="divider text-xs opacity-50 mt-0">所需材料</div>
            <div v-for="(row,i) in objItems" :key="i" class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2">
              <div class="flex-1 flex flex-wrap gap-1 items-center">
                <span v-for="(k,ki) in row._keys" :key="ki" class="badge badge-primary badge-xs gap-1 cursor-pointer" @click="row._keys.splice(ki,1); row.key=row._keys.join(',')">{{ k }} ✕</span>
                <select class="select select-bordered select-xs" v-model="row._input" @change="addItemKey(row)">
                  <option value="" disabled>添加…</option>
                  <option v-for="o in itemOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </div>
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">数量<input type="number" class="input input-bordered input-xs w-14" v-model.number="row.quantity" /></label>
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">消耗<input type="number" step="0.01" class="input input-bordered input-xs w-14" v-model.number="row.use" /></label>
              <button class="btn btn-xs btn-ghost text-error" @click="objItems.splice(i,1)">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="objItems.push({_keys:[],_input:'',key:'',quantity:1,use:undefined})">＋ 添加材料</button>

            <!-- 奖励 -->
            <div class="divider text-xs opacity-50 mt-0">奖励物品</div>
            <div v-for="(row,i) in objRewards" :key="i" class="flex gap-2 items-start mb-2 bg-base-200 rounded-box p-2">
              <select class="select select-bordered select-xs flex-1" v-model="row.key">
                <option value="" disabled>选择物品</option>
                <option v-for="o in itemOptions" :key="o.key" :value="o.key">{{ o.name }}（{{ o.key }}）</option>
              </select>
              <input class="input input-bordered input-xs w-16" v-model="row.quantity" placeholder="数量" />
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">权重<input type="number" class="input input-bordered input-xs w-14" v-model.number="row.probability" /></label>
              <div class="flex-1 min-w-[100px]">
                <div class="flex flex-wrap gap-0.5 mb-0.5">
                  <span v-for="(k,ki) in row._reqItemKeys" :key="ki" class="badge badge-ghost badge-xs gap-0.5 cursor-pointer" @click="row._reqItemKeys.splice(ki,1)">{{ k }} ✕</span>
                  <span v-if="!row._reqItemKeys.length" class="text-[10px] opacity-40">不限</span>
                </div>
                <select class="select select-bordered select-xs" v-model="row._reqItemInput" @change="addReqItem(row)">
                  <option value="" disabled>需消耗…</option>
                  <option v-for="o in itemOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </div>
              <div class="flex-1">
                <div class="flex flex-wrap gap-1 mb-1">
                  <div v-for="(entry,ti) in row._mapEntries" :key="ti" class="flex items-center gap-0.5 badge badge-ghost badge-sm px-1">
                    <span class="text-[10px]">{{ getMapName(entry.key) }}</span>
                    <input type="number" class="input input-xs w-12 h-4 text-[10px] px-0.5 bg-transparent border-0 border-b border-base-content/20"
                      v-model.number="entry.probability" placeholder="权" title="覆盖概率，留空使用默认权重" />
                    <button class="text-xs leading-none hover:text-error" @click="row._mapEntries.splice(ti,1)">✕</button>
                  </div>
                </div>
                <select class="select select-bordered select-xs" v-model="row._mapInput" @change="addRewardMap(row)">
                  <option value="" disabled>地图…</option>
                  <option v-for="o in mapOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </div>
              <button class="btn btn-xs btn-ghost text-error shrink-0" @click="objRewards.splice(i,1)">✕</button>
            </div>
            <button class="btn btn-xs btn-ghost" @click="objRewards.push({key:'',quantity:'',probability:1000,_mapEntries:[],_mapInput:'',_reqItemKeys:[],_reqItemInput:''})">＋ 添加奖励</button>

            <!-- 前置条件 -->
            <div class="divider text-xs opacity-50 mt-0">前置条件</div>
            <div class="flex gap-4">
              <label class="form-control flex-1">
                <span class="label-text mb-1">前置科技（点击移除）</span>
                <div class="flex flex-wrap gap-1 mb-1">
                  <span v-for="(t,i) in form.techs" :key="i" class="badge badge-ghost badge-sm gap-1 cursor-pointer" @click="form.techs.splice(i,1)">{{ t }} ✕</span>
                </div>
                <div class="flex gap-1 flex-wrap">
                  <select class="select select-bordered select-xs" v-model="techInput" @change="addTech">
                    <option value="" disabled>添加科技…</option>
                    <option v-for="o in techOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                  </select>
                </div>
              </label>
              <label class="form-control flex-1">
                <span class="label-text mb-1">可用地图（点击移除）</span>
                <div class="flex flex-wrap gap-1 mb-1">
                  <span v-for="(t,i) in form.maps" :key="i" class="badge badge-ghost badge-sm gap-1 cursor-pointer" @click="form.maps.splice(i,1)">{{ t }} ✕</span>
                </div>
                <select class="select select-bordered select-xs" v-model="mapInput" @change="addMap">
                  <option value="" disabled>添加地图…</option>
                  <option v-for="o in mapOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </label>
            </div>

            <!-- 配方引用 -->
            <div class="divider text-xs opacity-50 mt-0">配方引用（可选）</div>
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">配方</span>
                <select class="select select-bordered select-sm w-full" v-model="form.formula_key">
                  <option value="">不引用配方</option>
                  <option v-for="o in formulaOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">实验室操作</span>
                <select class="select select-bordered select-sm w-full" v-model="form.formula_op">
                  <option value="">—</option>
                  <option v-for="o in labOptions" :key="o.key" :value="o.key">{{ o.name }}</option>
                </select>
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
import { ref, reactive, onMounted } from 'vue'
import { useAdminStore } from '@/stores/modules/admin'
const admin = useAdminStore()
const records = ref<any[]>([])
const modalRef = ref<HTMLDialogElement | null>(null)
const editing = ref<any>(null)
const form = reactive({ key:'', name:'', category:'', description:'', time_required:10, techs:[] as string[], maps:[] as string[], formula_key:'', formula_op:'' })
const techInput = ref(''); const mapInput = ref('')
const objItems = reactive<any[]>([])
const objRewards = reactive<any[]>([])
const itemOptions = ref<any[]>([]); const techOptions = ref<any[]>([]); const mapOptions = ref<any[]>([]); const labOptions = ref<any[]>([]); const formulaOptions = ref<any[]>([])
const mapNameMap = ref<Record<string,string>>({})

async function fetchRefs() {
  const [ir,tr,mr,lr,fr] = await Promise.all([
    admin.apiFetch('/api/items'), admin.apiFetch('/api/techs'), admin.apiFetch('/api/maps'), admin.apiFetch('/api/labs'), admin.apiFetch('/api/formulas')
  ])
  itemOptions.value = await ir.json(); techOptions.value = await tr.json(); mapOptions.value = await mr.json(); labOptions.value = await lr.json(); formulaOptions.value = await fr.json()
  mapNameMap.value = {}
  for (const m of mapOptions.value) mapNameMap.value[m.key] = m.name
}
function getMapName(key: string): string { return mapNameMap.value[key] || key }

onMounted(() => { loadRecords(); fetchRefs() })
async function loadRecords() { const r = await admin.apiFetch('/api/actions'); records.value = await r.json() }
function resetForm() { Object.assign(form, { key:'', name:'', category:'', description:'', time_required:10, techs:[], maps:[], formula_key:'', formula_op:'' }); objItems.splice(0); objRewards.splice(0); editing.value = null }
function openNew() { resetForm(); modalRef.value?.showModal() }
function openEdit(r: any) { resetForm(); editing.value = r; Object.assign(form, { key:r.key||'', name:r.name||'', category:r.category||'', description:r.description||'', time_required:r.time_required??10, techs:[...(r.required_techs||[])], maps:[...(r.map||[])], formula_key:r.formula?.key||'', formula_op:r.formula?.operation||'' }); objItems.push(...(r.required_items||[]).map((x:any)=>{const keys=Array.isArray(x.key)?x.key:(x.key?[x.key]:[]);return{...x,_keys:[...keys],_input:''}})); objRewards.push(...(r.rewards||[]).map((x:any)=>{const reqKeys=Array.isArray(x.required_item)?[...x.required_item]:(x.required_item?[x.required_item]:[]);return{...x,_mapEntries:(x.map||[]).map((m:any)=>typeof m==='string'?{key:m,probability:undefined}:{key:m.key,probability:m.probability}),_mapInput:'',_reqItemKeys:reqKeys,_reqItemInput:''}})); modalRef.value?.showModal() }
function closeModal() { modalRef.value?.close() }
function addTech() { if (techInput.value && !form.techs.includes(techInput.value)) form.techs.push(techInput.value); techInput.value = '' }
function addMap() { if (mapInput.value && !form.maps.includes(mapInput.value)) form.maps.push(mapInput.value); mapInput.value = '' }
function addItemKey(row: any) { const v = row._input; if (!v) return; if (!row._keys.includes(v)) row._keys.push(v); row._input = ''; row.key = row._keys.join(',') }
function addRewardMap(row: any) { const v = row._mapInput; if (v && !row._mapEntries.some((e:any)=>e.key===v)) row._mapEntries.push({key:v,probability:undefined}); row._mapInput = '' }
function addReqItem(row: any) { const v = row._reqItemInput; if (v && !row._reqItemKeys.includes(v)) row._reqItemKeys.push(v); row._reqItemInput = '' }
function parseQty(v: any) { if (v === ''||v===undefined||v===null) return undefined; if (typeof v === 'string' && v.includes(',')) return v.split(',').map((s:string)=>{const n=Number(s.trim());return isNaN(n)?s.trim():n}).filter((s:any)=>s!==''); const n=Number(v);return isNaN(n)?v:n }
async function save() {
  if (!form.key) { alert('标识符不能为空'); return }
  const body: Record<string,any> = { key:form.key, name:form.name, category:form.category, description:form.description, time_required:form.time_required }
  if (objItems.length) body.required_items = objItems.map((r:any)=>{const o:any={};if(r._keys.length===1) o.key=r._keys[0]; else if(r._keys.length>1) o.key=[...r._keys]; else if(r.key) o.key=r.key; else return null; if(r.quantity!==undefined&&r.quantity!=='')o.quantity=r.quantity;if(r.use!==undefined&&r.use!=='')o.use=r.use;return o}).filter(Boolean)
  if (objRewards.length) body.rewards = objRewards.map((r:any)=>{const o:any={};if(r.key)o.key=r.key;o.quantity=parseQty(r.quantity);if(r.probability!==undefined&&r.probability!=='')o.probability=r.probability;if(r._reqItemKeys?.length===1)o.required_item=r._reqItemKeys[0];else if(r._reqItemKeys?.length>1)o.required_item=[...r._reqItemKeys];if(r._mapEntries?.length) o.map=r._mapEntries.map((e:any)=>{if(e.probability!==undefined&&e.probability!=='') return {key:e.key,probability:Number(e.probability)}; return e.key});return o})
  if (form.techs.length) body.required_techs = [...form.techs]
  if (form.maps.length) body.map = [...form.maps]
  if (form.formula_key && form.formula_op) body.formula = { key:form.formula_key, operation:form.formula_op }
  try {
    const res = editing.value ? await admin.apiFetch(`/api/actions/${editing.value.key}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }) : await admin.apiFetch('/api/actions', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const j = await res.json(); if (!res.ok) { alert(j.error||'失败'); return }
    closeModal(); loadRecords()
  } catch(e:any){ alert(e.message) }
}
async function remove(r: any) { if (!confirm(`确定删除行动「${r.name||r.key}」？`)) return; await admin.apiFetch(`/api/actions/${r.key}`, { method:'DELETE' }); loadRecords() }
</script>
