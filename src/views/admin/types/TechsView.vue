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
          icon="tabler:atom"
          class="inline-block align-middle mr-1"
        />科技管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-primary btn-sm" @click="openNew">
        ＋ 新增科技
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
              colspan="5"
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
            {{ editing ? "编辑科技" : "新增科技" }}
          </h3>
          <div class="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
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
              <span class="label-text mb-1">研究耗时（秒）</span>
              <input
                type="number"
                class="input input-bordered input-sm w-full"
                v-model.number="form.time_required"
              />
            </label>

            <!-- 所需材料 -->
            <div class="divider text-xs opacity-50 mt-4">
              <span> 所需材料 </span>
              <button
                class="btn btn-xs btn-ghost"
                @click="objItems.push({ key: '', quantity: 1 })"
              >
                <Icon icon="material-symbols:add" />
              </button>
            </div>
            <div
              v-for="(row, i) in objItems"
              :key="i"
              class="flex gap-2 items-center mb-2 bg-base-200 rounded-box p-2"
            >
              <SearchableSelect
                :options="itemOptions"
                v-model="row.key"
                placeholder="选择物品"
                class="flex-1"
              />
              <label class="flex items-center gap-1 text-xs whitespace-nowrap"
                >数量<input
                  type="number"
                  class="input input-bordered input-xs w-14"
                  v-model.number="row.quantity"
              /></label>
              <button
                class="btn btn-xs btn-ghost text-error"
                @click="objItems.splice(i, 1)"
              >
                ✕
              </button>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">时代里程碑</span>
              <SearchableSelect :options="milestoneOptions" v-model="form.milestone" placeholder="无" />
            </label>
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
                placeholder="添加前置科技…"
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
import { Eras } from "@/data/eras";

const admin = useAdminStore();
const records = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const form = reactive({
  key: "",
  name: "",
  description: "",
  time_required: 30,
  milestone: "",
  techs: [] as string[],
});
const techInput = ref("");
const objItems = reactive<any[]>([]);
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
  const r = await admin.apiFetch("/api/techs");
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
    time_required: 30,
    techs: [],
    milestone: "",
  });
  objItems.splice(0);
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
    techs: [...(r.required_techs || [])],
    milestone: r.milestone || "",
  });
  objItems.push(...(r.required_items || []).map((x: any) => ({ ...x })));
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
  const body: Record<string, any> = {
    key: form.key,
    name: form.name,
    description: form.description,
    time_required: form.time_required,
    milestone: form.milestone || undefined,
  };
  if (objItems.length)
    body.required_items = objItems.map((r: any) => {
      const o: any = {};
      if (r.key) o.key = r.key;
      if (r.quantity !== undefined && r.quantity !== "")
        o.quantity = r.quantity;
      return o;
    });
  if (form.techs.length) body.required_techs = [...form.techs];
  try {
    const res = editing.value
      ? await admin.apiFetch(`/api/techs/${editing.value.key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await admin.apiFetch("/api/techs", {
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
  if (!confirm(`确定删除科技「${r.name || r.key}」？`)) return;
  await admin.apiFetch(`/api/techs/${r.key}`, { method: "DELETE" });
  loadRecords();
}
</script>
