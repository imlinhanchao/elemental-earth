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
          icon="tabler:flask"
          class="inline-block align-middle mr-1"
        />实验操作管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">
        ＋ 新增操作
      </button>
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead>
          <tr>
            <th>标识符</th>
            <th>名称</th>
            <th>描述</th>
            <th>耗时</th>
            <th>燃烧</th>
            <th class="w-28">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td>
            <td>{{ r.name }}</td>
            <td class="max-w-xs truncate text-xs opacity-70">
              {{ r.description }}
            </td>
            <td>{{ r.time_required }}s</td>
            <td>
              {{
                r.requires_burning === true
                  ? "🔥 需要"
                  : r.requires_burning === false
                    ? "❌ 不需要"
                    : "—"
              }}
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
        <div class="modal-box max-w-xl">
          <h3 class="text-lg font-bold mb-6">
            {{ editing ? "编辑实验操作" : "新增实验操作" }}
          </h3>
          <div class="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">
                  标识符 <span class="text-error">*</span>
                </span>
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
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">耗时（秒）</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.time_required"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">是否需要燃烧</span>
                <select
                  class="select select-bordered select-sm w-full"
                  v-model="form.requires_burning"
                >
                  <option :value="undefined">不确定</option>
                  <option :value="true">需要燃烧</option>
                  <option :value="false">无需燃烧</option>
                </select>
              </label>
            </div>

            <!-- 所需设备 -->
            <div class="divider text-xs opacity-50 mt-0">
              <span>
                所需设备（可选）
                <button
                  class="btn btn-xs btn-ghost"
                  @click="
                    objReq.push({
                      _keys: [],
                      _input: '',
                      key: '',
                      quantity: 1,
                      use: 0.1,
                    })
                  "
                >
                  <Icon icon="material-symbols:add" />
                </button>
              </span>
            </div>
            <div
              v-for="(row, i) in objReq"
              :key="i"
              class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2"
            >
              <div class="flex-1 flex flex-wrap gap-1 items-center">
                <LabelTag
                  v-for="(k, ki) in row._keys"
                  :key="ki"
                  :value="k"
                  :options="itemOptions"
                  closeable
                  @close="
                    row._keys.splice(ki, 1);
                    row.key = row._keys.join(',');
                  "
                />
                <SearchableSelect
                  :options="itemOptions"
                  :modelValue="row._input"
                  @update:modelValue="
                    (v) => {
                      row._input = v;
                      addReqKey(row);
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
              <label class="flex items-center gap-1 text-xs whitespace-nowrap">
                消耗耐久
                <input
                  type="number"
                  step="0.01"
                  class="input input-bordered input-xs w-14"
                  v-model.number="row.use"
                />
              </label>
              <button
                class="btn btn-xs btn-ghost text-error"
                @click="objReq.splice(i, 1)"
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
            <label class="form-control w-full">
              <span class="label-text mb-1">时代里程碑</span>
              <SearchableSelect :options="milestoneOptions" v-model="form.milestone" placeholder="无" />
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
import { Eras } from "@/data/eras";

const admin = useAdminStore();
const records = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const form = reactive({
  key: "",
  name: "",
  description: "",
  time_required: 20,
  requires_burning: undefined as boolean | undefined,
  milestone: "",
  techs: [] as string[],
});
const techInput = ref("");
const objReq = reactive<any[]>([]);
const itemOptions = ref<any[]>([]);
const techOptions = ref<any[]>([]);
const milestoneOptions = ref<{ key: string; label: string }[]>([]);

onMounted(() => {
  loadRecords();
  fetchRefs();
  milestoneOptions.value = Eras.flatMap((e) =>
    e.milestones.map((m) => ({ key: m.key, label: `${e.name} → ${m.description}` }))
  );
});
async function loadRecords() {
  const r = await admin.apiFetch("/api/labs");
  records.value = await r.json();
}
async function fetchRefs() {
  const [ir, tr] = await Promise.all([
    admin.apiFetch("/api/items"),
    admin.apiFetch("/api/techs"),
  ]);
  itemOptions.value = await ir.json();
  techOptions.value = await tr.json();
}
function resetForm() {
  Object.assign(form, {
    key: "",
    name: "",
    description: "",
    time_required: 20,
    requires_burning: undefined,
    milestone: "",
    techs: [],
  });
  objReq.splice(0);
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
    time_required: r.time_required ?? 20,
    requires_burning: r.requires_burning,
    milestone: r.milestone || "",
    techs: [...(r.required_techs || [])],
  });
  objReq.push(
    ...(r.required_item || []).map((x: any) => {
      const keys = Array.isArray(x.key) ? x.key : [x.key];
      return { ...x, _keys: [...keys], _input: "" };
    }),
  );
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
function addReqKey(row: any) {
  const v = row._input;
  if (!v) return;
  if (!row._keys.includes(v)) row._keys.push(v);
  row._input = "";
  row.key = row._keys.join(",");
}
async function save() {
  if (!form.key) {
    alert("标识符不能为空");
    return;
  }
  const body: Record<string, any> = {
    key: form.key,
    name: form.name,
    description: form.description,
    time_required: form.time_required,
    milestone: form.milestone || undefined,
  };
  if (form.requires_burning !== undefined)
    body.requires_burning = form.requires_burning;
  if (objReq.length)
    body.required_item = objReq
      .map((r: any) => {
        const o: any = {};
        if (r._keys.length === 1) o.key = r._keys[0];
        else if (r._keys.length > 1) o.key = [...r._keys];
        else return null;
        if (r.quantity !== undefined && r.quantity !== "")
          o.quantity = r.quantity;
        if (r.use !== undefined && r.use !== "") o.use = r.use;
        return o;
      })
      .filter(Boolean);
  if (form.techs.length) body.required_techs = [...form.techs];
  try {
    const res = editing.value
      ? await admin.apiFetch(`/api/labs/${editing.value.key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await admin.apiFetch("/api/labs", {
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
  if (!confirm(`确定删除实验操作「${r.name || r.key}」？`)) return;
  await admin.apiFetch(`/api/labs/${r.key}`, { method: "DELETE" });
  loadRecords();
}
</script>
