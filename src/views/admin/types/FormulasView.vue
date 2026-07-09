<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div class="flex items-center gap-3 mb-6">
      <button
        class="btn btn-ghost btn-sm"
        @click="$router.push('/admin/dashboard')"
      >
        ← 返回
      </button>
      <h2 class="text-xl font-bold inline-flex items-center gap-1">
        <Icon
          icon="tabler:script"
          class="inline-block align-middle mr-1"
        />配方管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">
        ＋ 新增配方
      </button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead>
          <tr>
            <th>标识符</th>
            <th>名称</th>
            <th>耗时</th>
            <th>容器</th>
            <th>操作</th>
            <th>时代</th>
            <th>科技</th>
            <th class="w-28">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td>
            <td>{{ r.name }}</td>
            <td class="text-xs">
              <span v-if="getFormulaTime(r) !== r.time_required" class="text-warning font-bold" title="与原始设置不符">{{ getFormulaTime(r) }}s*</span>
              <span v-else>{{ r.time_required }}s</span>
            </td>
            <td
              class="text-xs"
              :class="{ 'text-error font-bold': hasContainerConflict(r) }"
              :title="
                hasContainerConflict(r) ? '操作需求 ' + getActionContainerName(r) : ''
              "
            >
              {{ r.required_container || "—" }}
            </td>
            <td class="text-xs">{{ r.required_actions?.key || "—" }}</td>
            <td class="text-xs">{{ eraOptions.find(e => e.key == r.required_era)?.name || "—" }}</td>
            <td class="text-xs">
              <span v-if="r.required_techs?.length">
                <span
                  v-for="(t, i) in r.required_techs"
                  :key="t"
                  class="badge badge-ghost badge-sm mr-1 mb-1"
                >
                  {{ techOptions.find(x => x.key == t)?.name || t }}
                </span>
              </span>
              <span v-else>—</span>
            </td>
            <td>
              <button class="btn btn-xs btn-ghost" @click="openEdit(r)">
                编辑</button
              ><button
                class="btn btn-xs btn-ghost text-error"
                @click="remove(r)"
              >
                删除
              </button>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td
              colspan="6"
              class="text-center py-12 text-base-content/30 text-sm"
            >
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-2xl">
          <h3 class="text-lg font-bold mb-6">
            {{ editing ? "编辑配方" : "新增配方" }}
          </h3>
          <div class="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <!-- 基本信息 -->
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1"
                  >标识符 <span class="text-error">*</span></span
                >
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.key"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">名称</span>
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.name"
                />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">描述</span>
              <textarea
                class="textarea textarea-bordered textarea-sm w-full"
                v-model="form.description"
                rows="2"
              ></textarea>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1"
                >碎片描述 (使用 #材料Key# 和 $操作key$ 占位)</span
              >
              <textarea
                class="textarea textarea-bordered textarea-sm w-full font-mono"
                v-model="form.fragment_description"
                rows="2"
              ></textarea>
            </label>
            <div class="grid grid-cols-3 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">耗时（秒）</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.time_required"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">电力消耗 (耐久)</span>
                <input
                  type="number"
                  step="0.01"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.power_consumption"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">所需容器</span>
                <SearchableSelect
                  :options="containerItems"
                  v-model="form.container"
                  placeholder="不要求容器"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">实验操作</span>
                <SearchableSelect
                  :options="labOptions"
                  v-model="form.action_key"
                  placeholder="不要求操作"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">所属时代</span>
                <SearchableSelect
                  :options="eraOptions"
                  v-model="form.era"
                  placeholder="石器时代 (默认)"
                />
              </label>
            </div>

            <!-- 操作参数 -->
            <div
              v-if="form.action_key"
              class="grid grid-cols-2 gap-4 bg-base-200 rounded-box p-3"
            >
              <label class="form-control w-full">
                <span class="label-text mb-1">最少操作次数</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.action_min"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">最多操作次数（留空不限）</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.action_max"
                />
              </label>
            </div>

            <!-- 所需材料（支持可选材料，用逗号分隔 key） -->
            <div class="divider text-xs opacity-50 mt-0">
              <span>
                所需材料
                <button
                  class="btn btn-xs btn-ghost"
                  @click="
                    objItems.push({ _keys: [], _input: '', key: '', quantity: 1, isMain: false })
                  "
                >
                  <Icon icon="material-symbols:add" />
                </button>
              </span>
            </div>
            <div
              v-for="(row, i) in objItems"
              :key="i"
              class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2"
            >
              <div class="flex-1 flex flex-wrap gap-1 items-center">
                <LabelTag
                  v-for="(k, ki) in row._keys"
                  :key="ki"
                  closeable
                  :value="k"
                  :options="itemOptions"
                  @close="removeItemKey(row, ki)"
                />
                <SearchableSelect
                  :options="itemOptions"
                  :modelValue="row._input"
                  @update:modelValue="
                    (v) => {
                      row._input = v;
                      addItemKey(row);
                    }
                  "
                  placeholder="添加…"
                />
              </div>
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">
                数量
                <input
                  type="number"
                  class="input input-bordered input-xs w-14"
                  v-model.number="row.quantity"
                />
              </label>
              <label class="flex items-center gap-1 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-xs"
                  v-model="row.isMain"
                />
                <span :class="row.isMain ? 'text-primary font-bold' : 'opacity-40'">主材料</span>
              </label>
              <button
                class="btn btn-xs btn-ghost text-error"
                @click="objItems.splice(i, 1)"
              >
                ✕
              </button>
            </div>

            <!-- 产物 -->
            <div class="divider text-xs opacity-50 mt-0">
              <span>
                产物
                <button
                  class="btn btn-xs btn-ghost"
                  @click="
                    objProducts.push({
                      key: '',
                      multiple: 1,
                      required_chain_operation: '',
                      required_item: '',
                    })
                  "
                >
                  <Icon icon="material-symbols:add" />
                </button>
              </span>
            </div>
            <div
              v-for="(row, i) in objProducts"
              :key="i"
              class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2"
            >
              <SearchableSelect
                :options="itemOptions"
                v-model="row.key"
                placeholder="选择产物"
                class="flex-1"
              />
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">
                倍率
                <input
                  type="number"
                  class="input input-bordered input-xs w-14"
                  v-model.number="row.multiple"
                />
              </label>
              <SearchableSelect
                :options="[{ name: '无需追加', key: '' }, ...labOptions]"
                v-model="row.required_chain_operation"
                placeholder="无需追加"
              />
              <SearchableSelect
                :options="[{ name: '不限反应物', key: '' }, ...itemOptions]"
                v-model="row.required_item"
                placeholder="不限反应物"
              />
              <button
                class="btn btn-xs btn-ghost text-error"
                @click="objProducts.splice(i, 1)"
              >
                ✕
              </button>
            </div>

            <!-- 前置科技 -->
            <label class="form-control w-full">
              <span class="label-text mb-1">前置科技</span>
              <div class="flex flex-wrap gap-1 mb-1">
                <LabelTag
                  v-for="(t, i) in form.techs"
                  :key="i"
                  :options="techOptions"
                  :value="t"
                  closeable
                  @close="form.techs.splice(i, 1)"
                />
              </div>
              <SearchableSelect
                :options="techOptions"
                :modelValue="techInput"
                @update:modelValue="
                  (v) => {
                    techInput = v;
                    addTech();
                  }
                "
                placeholder="添加科技…"
              />
            </label>
          </div>
          <div class="modal-action mt-6">
            <button class="btn btn-ghost btn-sm" @click="closeModal">
              取消
            </button>
            <button class="btn btn-primary btn-sm" @click="save">保存</button>
          </div>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useAdminStore } from "@/stores/modules/admin";
import SearchableSelect from "@/components/SearchableSelect.vue";
import LabelTag from "@/components/LabelTag.vue";

const admin = useAdminStore();
const records = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const form = reactive({
  key: "",
  name: "",
  description: "",
  time_required: 30,
  container: "",
  action_key: "",
  action_min: 1,
  action_max: undefined as number | undefined,
  fragment_description: "",
  power_consumption: undefined as number | undefined,
  era: "",
  techs: [] as string[],
});
const techInput = ref("");
const objItems = reactive<any[]>([]);
const objProducts = reactive<any[]>([]);
const itemOptions = ref<any[]>([]);
const techOptions = ref<any[]>([]);
const labOptions = ref<any[]>([]);
const containerItems = ref<any[]>([]);
const eraOptions = ref<any[]>([]);

onMounted(() => {
  loadRecords();
  fetchRefs();
});
async function loadRecords() {
  const r = await admin.apiFetch("/api/formulas");
  records.value = await r.json();
}
async function fetchRefs() {
  const [ir, tr, lr, cr, er] = await Promise.all([
    admin.apiFetch("/api/items"),
    admin.apiFetch("/api/techs"),
    admin.apiFetch("/api/labs"),
    admin.apiFetch("/api/items"),
    admin.apiFetch("/api/eras"),
  ]);
  itemOptions.value = await ir.json();
  techOptions.value = await tr.json();
  labOptions.value = await lr.json();
  eraOptions.value = await er.json();
  containerItems.value = (await cr.json()).filter((i: any) =>
    i.type?.includes("container"),
  );
}

function addItemKey(row: any) {
  const v = row._input;
  if (!v) return;
  if (!row._keys.includes(v)) row._keys.push(v);
  row._input = "";
  row.key = row._keys.join(",");
}
function removeItemKey(row: any, idx: number | string) {
  row._keys.splice(idx, 1);
  row.key = row._keys.join(",") || "";
}

function getFormulaTime(r: any) {
  if (r.required_actions?.key) {
    const action = labOptions.value.find((l) => l.key === r.required_actions.key);
    if (action) {
      return action.time_required * (r.required_actions.min || 1);
    }
  }
  return r.time_required;
}

function getActionContainerName(r: any) {
  if (!r.required_actions?.key) return null;
  const action = labOptions.value.find((l) => l.key === r.required_actions.key);
  if (!action || !action.required_item) return null;

  for (const req of action.required_item) {
    const keys = Array.isArray(req.key) ? req.key : [req.key];
    const isContainerReq = keys.some((k: string) => {
      const item = itemOptions.value.find((i) => i.key === k);
      return item?.type?.includes("container");
    });

    if (isContainerReq) {
      return keys
        .map((k: string) => itemOptions.value.find((i) => i.key === k)?.name || k)
        .join("/");
    }
  }
  return null;
}

function hasContainerConflict(r: any) {
  if (!r.required_actions?.key) return false;
  const action = labOptions.value.find((l) => l.key === r.required_actions.key);
  if (!action || !action.required_item) return false;

  for (const req of action.required_item) {
    const keys = Array.isArray(req.key) ? req.key : [req.key];
    const isContainerReq = keys.some((k: string) => {
      const item = itemOptions.value.find((i) => i.key === k);
      return item?.type?.includes("container");
    });

    if (isContainerReq) {
      // 如果配方指定了容器，但不在操作要求的范围内，或者配方没指定容器但操作要求了
      if (!r.required_container || !keys.includes(r.required_container)) {
        return true;
      }
    }
  }
  return false;
}

function resetForm() {
  Object.assign(form, {
    key: "",
    name: "",
    description: "",
    time_required: 30,
    container: "",
    action_key: "",
    action_min: 1,
    action_max: undefined,
    fragment_description: "",
    power_consumption: undefined,
    era: "",
    techs: [],
  });
  objItems.splice(0);
  objProducts.splice(0);
  editing.value = null;
}
function openNew() {
  resetForm();
  modalRef.value?.showModal();
}
function openEdit(r: any) {
  resetForm();
  editing.value = r;
  Object.assign(form, {
    key: r.key || "",
    name: r.name || "",
    description: r.description || "",
    time_required: r.time_required ?? 30,
    container: r.required_container || "",
    action_key: r.required_actions?.key || "",
    action_min: r.required_actions?.min ?? 1,
    action_max: r.required_actions?.max,
    fragment_description: r.fragment_description || "",
    power_consumption: r.power_consumption,
    era: r.required_era || "",
    techs: [...(r.required_techs || [])],
  });
  objItems.push(
    ...(r.required_items || []).map((x: any) => {
      const keys = Array.isArray(x.key) ? x.key : x.key ? [x.key] : [];
      return { ...x, _keys: [...keys], _input: "", isMain: !!x.isMain };
    }),
  );
  objProducts.push(...(r.products || []).map((x: any) => ({ ...x })));
  modalRef.value?.showModal();
}
function closeModal() {
  modalRef.value?.close();
}
function addTech() {
  if (techInput.value && !form.techs.includes(techInput.value))
    form.techs.push(techInput.value);
  techInput.value = "";
}
async function save() {
  if (!form.key) {
    alert("标识符不能为空");
    return;
  }

  // 计算实际耗时
  let calculatedTime = form.time_required;
  if (form.action_key) {
    const action = labOptions.value.find((l) => l.key === form.action_key);
    if (action) {
      calculatedTime = action.time_required * (form.action_min || 1);
    }
  }

  const body: Record<string, any> = {
    key: form.key,
    name: form.name,
    description: form.description,
    fragment_description: form.fragment_description || undefined,
    time_required: calculatedTime,
    power_consumption: form.power_consumption || undefined,
    required_era: form.era || undefined,
  };
  if (form.container) body.required_container = form.container;
  if (form.action_key) {
    body.required_actions = { key: form.action_key, min: form.action_min ?? 1 };
    if (form.action_max !== undefined && form.action_max !== null)
      body.required_actions.max = form.action_max;
  }
  if (objItems.length)
    body.required_items = objItems
      .map((r: any) => {
        const o: any = {};
        if (r._keys.length === 1) o.key = r._keys[0];
        else if (r._keys.length > 1) o.key = [...r._keys];
        else return null;
        if (r.quantity !== undefined && r.quantity !== "")
          o.quantity = r.quantity;
        if (r.isMain) o.isMain = true;
        return o;
      })
      .filter(Boolean);
  if (objProducts.length)
    body.products = objProducts.map((r: any) => {
      const o: any = {};
      if (r.key) o.key = r.key;
      if (r.multiple !== undefined && r.multiple !== "")
        o.multiple = r.multiple;
      if (r.required_chain_operation)
        o.required_chain_operation = r.required_chain_operation;
      if (r.required_item) o.required_item = r.required_item;
      return o;
    });
  if (form.techs.length) body.required_techs = [...form.techs];
  try {
    const res = editing.value
      ? await admin.apiFetch(`/api/formulas/${editing.value.key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await admin.apiFetch("/api/formulas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    const j = await res.json();
    if (!res.ok) {
      alert(j.error || "失败");
      return;
    }
    closeModal();
    loadRecords();
  } catch (e: any) {
    alert(e.message);
  }
}
async function remove(r: any) {
  if (!confirm(`确定删除配方「${r.name || r.key}」？`)) return;
  await admin.apiFetch(`/api/formulas/${r.key}`, { method: "DELETE" });
  loadRecords();
}
</script>
