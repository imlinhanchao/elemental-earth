<template>
  <Teleport to="body">
    <dialog ref="dialogRef" class="modal" @close="$emit('close')">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">{{ title }}</h3>
        <div class="space-y-3 max-h-[65vh] overflow-y-auto pr-1">

          <!-- ====== maps ====== -->
          <template v-if="type === 'maps'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <label class="form-control"><span class="label-text">图标</span><input class="input input-bordered input-sm" v-model="form.icon" /></label>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">坐标 X</span><input type="number" class="input input-bordered input-sm" v-model.number="form.px" /></label>
              <label class="form-control"><span class="label-text">坐标 Y</span><input type="number" class="input input-bordered input-sm" v-model.number="form.py" /></label>
            </div>
          </template>

          <!-- ====== items ====== -->
          <template v-if="type === 'items'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <label class="form-control"><span class="label-text">分类</span>
              <select class="select select-bordered select-sm" v-model="form.category">
                <option v-for="c in ['材料','工具','容器','燃料','气体','液体','火源']" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <label class="form-control">
              <span class="label-text">类型标签</span>
              <div class="flex flex-wrap gap-1 mb-1">
                <span v-for="(t,i) in form.type" :key="i" class="badge badge-primary badge-sm gap-1 cursor-pointer" @click="form.type.splice(i,1)">{{ t }} ✕</span>
              </div>
              <div class="flex flex-wrap gap-1">
                <span v-for="opt in ['material','tool','container','fuel','gas','liquid','fire_source']" :key="opt"
                  class="badge badge-ghost badge-sm cursor-pointer" :class="{'badge-primary':form.type.includes(opt)}"
                  @click="toggleType(opt)">{{ opt }}</span>
              </div>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">元素序数</span><input type="number" class="input input-bordered input-sm" v-model.number="form.elemental" /></label>
              <label class="form-control"><span class="label-text">耐久度</span><input type="number" step="0.01" class="input input-bordered input-sm" v-model.number="form.durable" /></label>
            </div>
            <label class="form-control"><span class="label-text">额外属性（JSON）</span><textarea class="textarea textarea-bordered textarea-sm font-mono" v-model="formJson.attrs" rows="2"></textarea></label>
          </template>

          <!-- ====== actions ====== -->
          <template v-if="type === 'actions'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">分类</span><input class="input input-bordered input-sm" v-model="form.category" /></label>
              <label class="form-control"><span class="label-text">耗时（秒）</span><input type="number" class="input input-bordered input-sm" v-model.number="form.time_required" /></label>
            </div>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <fieldset class="border border-base-300 rounded p-2"><legend class="text-xs opacity-60 px-1">所需材料</legend>
              <div v-for="(row,i) in objItems" :key="i" class="flex gap-1 items-start mb-1">
                <input class="input input-bordered input-xs flex-1" v-model="row.key" placeholder="物品key" />
                <input type="number" class="input input-bordered input-xs w-14" v-model.number="row.quantity" placeholder="数量" />
                <input type="number" step="0.01" class="input input-bordered input-xs w-14" v-model.number="row.use" placeholder="消耗" />
                <button class="btn btn-xs btn-ghost text-error" @click="objItems.splice(i,1)">✕</button>
              </div>
              <button class="btn btn-xs btn-ghost" @click="objItems.push({key:'',quantity:1,use:undefined})">＋ 添加</button>
            </fieldset>
            <fieldset class="border border-base-300 rounded p-2"><legend class="text-xs opacity-60 px-1">奖励</legend>
              <div v-for="(row,i) in objRewards" :key="i" class="flex gap-1 items-start mb-1">
                <input class="input input-bordered input-xs flex-1" v-model="row.key" placeholder="物品key" />
                <input class="input input-bordered input-xs w-14" v-model="row.quantity" placeholder="数量" />
                <input type="number" class="input input-bordered input-xs w-14" v-model.number="row.probability" placeholder="概率" />
                <button class="btn btn-xs btn-ghost text-error" @click="objRewards.splice(i,1)">✕</button>
              </div>
              <button class="btn btn-xs btn-ghost" @click="objRewards.push({key:'',quantity:'',probability:1000})">＋ 添加</button>
            </fieldset>
            <label class="form-control"><span class="label-text">前置科技（逗号分隔）</span><input class="input input-bordered input-sm" v-model="form.techs" /></label>
            <label class="form-control"><span class="label-text">地图（逗号分隔）</span><input class="input input-bordered input-sm" v-model="form.maps" /></label>
          </template>

          <!-- ====== techs ====== -->
          <template v-if="type === 'techs'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <label class="form-control"><span class="label-text">耗时（秒）</span><input type="number" class="input input-bordered input-sm" v-model.number="form.time_required" /></label>
            <fieldset class="border border-base-300 rounded p-2"><legend class="text-xs opacity-60 px-1">所需材料</legend>
              <div v-for="(row,i) in objItems" :key="i" class="flex gap-1 items-start mb-1">
                <input class="input input-bordered input-xs flex-1" v-model="row.key" placeholder="物品key" />
                <input type="number" class="input input-bordered input-xs w-14" v-model.number="row.quantity" placeholder="数量" />
                <button class="btn btn-xs btn-ghost text-error" @click="objItems.splice(i,1)">✕</button>
              </div>
              <button class="btn btn-xs btn-ghost" @click="objItems.push({key:'',quantity:1})">＋ 添加</button>
            </fieldset>
            <label class="form-control"><span class="label-text">前置科技（逗号分隔）</span><input class="input input-bordered input-sm" v-model="form.techs" /></label>
          </template>

          <!-- ====== labs ====== -->
          <template v-if="type === 'labs'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">耗时（秒）</span><input type="number" class="input input-bordered input-sm" v-model.number="form.time_required" /></label>
              <label class="form-control"><span class="label-text">需要燃烧</span>
                <select class="select select-bordered select-sm" v-model="form.requires_burning">
                  <option :value="undefined">不确定</option>
                  <option :value="true">需要</option>
                  <option :value="false">不需要</option>
                </select>
              </label>
            </div>
          </template>

          <!-- ====== formulas ====== -->
          <template v-if="type === 'formulas'">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"><span class="label-text">标识符</span><input class="input input-bordered input-sm" v-model="form.key" /></label>
              <label class="form-control"><span class="label-text">名称</span><input class="input input-bordered input-sm" v-model="form.name" /></label>
            </div>
            <label class="form-control"><span class="label-text">描述</span><textarea class="textarea textarea-bordered textarea-sm" v-model="form.description" rows="2"></textarea></label>
            <div class="grid grid-cols-3 gap-3">
              <label class="form-control"><span class="label-text">耗时（秒）</span><input type="number" class="input input-bordered input-sm" v-model.number="form.time_required" /></label>
              <label class="form-control"><span class="label-text">容器</span><input class="input input-bordered input-sm" v-model="form.container" /></label>
              <label class="form-control"><span class="label-text">操作 key</span><input class="input input-bordered input-sm" v-model="form.action_key" /></label>
            </div>
            <fieldset class="border border-base-300 rounded p-2"><legend class="text-xs opacity-60 px-1">所需材料</legend>
              <div v-for="(row,i) in objItems" :key="i" class="flex gap-1 items-start mb-1">
                <input class="input input-bordered input-xs flex-1" v-model="row.key" placeholder="key 或 key1,key2" />
                <input type="number" class="input input-bordered input-xs w-14" v-model.number="row.quantity" placeholder="数量" />
                <button class="btn btn-xs btn-ghost text-error" @click="objItems.splice(i,1)">✕</button>
              </div>
              <button class="btn btn-xs btn-ghost" @click="objItems.push({key:'',quantity:1})">＋ 添加</button>
            </fieldset>
            <fieldset class="border border-base-300 rounded p-2"><legend class="text-xs opacity-60 px-1">产物</legend>
              <div v-for="(row,i) in objProducts" :key="i" class="flex gap-1 items-start mb-1">
                <input class="input input-bordered input-xs flex-1" v-model="row.key" placeholder="物品key" />
                <input type="number" class="input input-bordered input-xs w-14" v-model.number="row.multiple" placeholder="倍率" />
                <input class="input input-bordered input-xs w-20" v-model="row.required_chain_operation" placeholder="追加操作key" />
                <button class="btn btn-xs btn-ghost text-error" @click="objProducts.splice(i,1)">✕</button>
              </div>
              <button class="btn btn-xs btn-ghost" @click="objProducts.push({key:'',multiple:1,required_chain_operation:''})">＋ 添加</button>
            </fieldset>
          </template>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost btn-sm" @click="close">取消</button>
          <button class="btn btn-primary btn-sm" @click="save">保存</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, nextTick } from 'vue'

const props = defineProps<{
  type: string
  item: any
  visible: boolean
}>()

const emit = defineEmits<{
  save: [data: any]
  close: []
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
const form = reactive<any>({})
const formJson = reactive<Record<string,string>>({})
const objItems = reactive<any[]>([])
const objRewards = reactive<any[]>([])
const objProducts = reactive<any[]>([])

const titleMap: Record<string,string> = {
  maps:'编辑地图', items:'编辑物品', actions:'编辑行动',
  techs:'编辑科技', labs:'编辑实验操作', formulas:'编辑配方',
}

const title = ref('编辑')

watch(() => props.visible, async (v) => {
  if (v && props.item) {
    title.value = titleMap[props.type] || '编辑'
    resetForm()
    loadItem(props.item)
    await nextTick()
    dialogRef.value?.showModal()
  } else {
    dialogRef.value?.close()
  }
})

function loadItem(item: any) {
  for (const k of Object.keys(form)) delete form[k]
  formJson.attrs = ''
  objItems.splice(0)
  objRewards.splice(0)
  objProducts.splice(0)

  if (props.type === 'maps') {
    Object.assign(form, { key:item.key||'', name:item.name||'', icon:item.icon||'', description:item.description||'', px:item.position?.x||0, py:item.position?.y||0 })
  } else if (props.type === 'items') {
    Object.assign(form, { key:item.key||'', name:item.name||'', category:item.category||'', description:item.description||'', type:Array.isArray(item.type)?[...item.type]:[], elemental:item.elemental, durable:item.durable, is_discovery:!!item.is_discovery })
    formJson.attrs = item.attrs ? JSON.stringify(item.attrs, null, 2) : ''
  } else if (props.type === 'actions') {
    Object.assign(form, { key:item.key||'', name:item.name||'', category:item.category||'', description:item.description||'', time_required:item.time_required??10, techs:(item.required_techs||[]).join(', '), maps:(item.map||[]).join(', ') })
    objItems.push(...(item.required_items||[]).map((x:any)=>({...x})))
    objRewards.push(...(item.rewards||[]).map((x:any)=>({...x,quantity:x.quantity})))
  } else if (props.type === 'techs') {
    Object.assign(form, { key:item.key||'', name:item.name||'', description:item.description||'', time_required:item.time_required??30, techs:(item.required_techs||[]).join(', ') })
    objItems.push(...(item.required_items||[]).map((x:any)=>({...x})))
  } else if (props.type === 'labs') {
    Object.assign(form, { key:item.key||'', name:item.name||'', description:item.description||'', time_required:item.time_required??20, requires_burning:item.requires_burning })
  } else if (props.type === 'formulas') {
    Object.assign(form, { key:item.key||'', name:item.name||'', description:item.description||'', time_required:item.time_required??30, container:item.required_container||'', action_key:item.required_actions?.key||'' })
    objItems.push(...(item.required_items||[]).map((x:any)=>({...x})))
    objProducts.push(...(item.products||[]).map((x:any)=>({...x,required_chain_operation:x.required_chain_operation||''})))
  }
}

function resetForm() {
  Object.assign(form, { key:'', name:'', description:'', icon:'', category:'', type:[] as string[], elemental:undefined, durable:undefined, time_required:10, techs:'', maps:'', px:0, py:0, container:'', action_key:'', requires_burning:undefined, is_discovery:false })
}

function toggleType(t: string) { const i = form.type.indexOf(t); i >= 0 ? form.type.splice(i,1) : form.type.push(t) }

function buildData(): any {
  const body: Record<string,any> = {}

  if (props.type === 'maps') {
    Object.assign(body, { key:form.key, name:form.name, icon:form.icon, description:form.description })
    if (form.px || form.py) body.position = { x:form.px, y:form.py }
  } else if (props.type === 'items') {
    for (const k of ['key','name','category','description']) { if (form[k]) body[k] = form[k] }
    if (form.type.length) body.type = [...form.type]
    if (form.elemental !== undefined && form.elemental !== '' && !isNaN(Number(form.elemental))) body.elemental = Number(form.elemental)
    if (form.durable !== undefined && form.durable !== '' && !isNaN(Number(form.durable))) body.durable = Number(form.durable)
    if (form.is_discovery) body.is_discovery = true
    if (formJson.attrs.trim()) { try { body.attrs = JSON.parse(formJson.attrs) } catch {} }
  } else if (props.type === 'actions') {
    Object.assign(body, { key:form.key, name:form.name, category:form.category, description:form.description, time_required:form.time_required })
    if (objItems.length) body.required_items = objItems.map((r:any)=>{const o:any={};if(r.key)o.key=r.key;if(r.quantity!==undefined&&r.quantity!=='')o.quantity=r.quantity;if(r.use!==undefined&&r.use!=='')o.use=r.use;return o})
    if (objRewards.length) body.rewards = objRewards.map((r:any)=>{const o:any={};if(r.key)o.key=r.key;o.quantity=r.quantity;if(r.probability!==undefined&&r.probability!=='')o.probability=r.probability;return o})
    if (form.techs.trim()) body.required_techs = form.techs.split(',').map((s:string)=>s.trim()).filter(Boolean)
    if (form.maps.trim()) body.map = form.maps.split(',').map((s:string)=>s.trim()).filter(Boolean)
  } else if (props.type === 'techs') {
    Object.assign(body, { key:form.key, name:form.name, description:form.description, time_required:form.time_required })
    if (objItems.length) body.required_items = [...objItems]
    if (form.techs.trim()) body.required_techs = form.techs.split(',').map((s:string)=>s.trim()).filter(Boolean)
  } else if (props.type === 'labs') {
    Object.assign(body, { key:form.key, name:form.name, description:form.description, time_required:form.time_required })
    if (form.requires_burning !== undefined) body.requires_burning = form.requires_burning
  } else if (props.type === 'formulas') {
    Object.assign(body, { key:form.key, name:form.name, description:form.description, time_required:form.time_required })
    if (form.container) body.required_container = form.container
    if (form.action_key) body.required_actions = { key:form.action_key }
    if (objItems.length) body.required_items = objItems.map((r:any)=>{const o:any={};const pk=r.key;if(pk.includes(','))o.key=pk.split(',').map((s:string)=>s.trim());else o.key=pk;if(r.quantity)o.quantity=r.quantity;return o})
    if (objProducts.length) body.products = objProducts.map((r:any)=>{const o:any={};if(r.key)o.key=r.key;if(r.multiple)o.multiple=r.multiple;if(r.required_chain_operation)o.required_chain_operation=r.required_chain_operation;return o})
  }
  return body
}

function save() {
  const data = buildData()
  if (!data.key) { alert('标识符不能为空'); return }
  emit('save', data)
  close()
}

function close() {
  dialogRef.value?.close()
  emit('close')
}
</script>
