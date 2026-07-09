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
        />物品管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    
    <div class="flex flex-col gap-4 mb-6 bg-base-200/50 p-4 rounded-xl border border-base-300">
      <div class="flex flex-wrap gap-3 items-center">
        <button class="btn btn-primary btn-sm" @click="openNew">
          ＋ 新增物品
        </button>
        
        <div class="join">
          <div class="input input-bordered input-sm join-item">
            <Icon icon="tabler:search" class="opacity-30 text-xs" />
            <input
              v-model="searchQuery"
              class="w-40"
              placeholder="搜索名称或Key..."
            />
          </div>
          <div class="input input-bordered input-sm join-item border-l-0">
            <Icon icon="tabler:atom-2" class="opacity-30 text-xs" />
            <input
              v-model="searchElement"
              type="number"
              class="w-24"
              placeholder="元素序数"
            />
          </div>
        </div>

        <select v-model="filterCategory" class="select select-bordered select-sm">
          <option value="">全部分类</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>

        <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
        
        <button 
          v-if="searchQuery || searchElement || filterCategory || filterTypes.length" 
          class="btn btn-ghost btn-sm text-error"
          @click="searchQuery = ''; searchElement = ''; filterCategory = ''; filterTypes = []"
        >
          重置筛选
        </button>
      </div>

      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs opacity-50 mr-1">类型过滤:</span>
        <button
          v-for="opt in typeOptions"
          :key="opt"
          class="btn btn-xs rounded-full px-3"
          :class="filterTypes.includes(opt) ? 'btn-primary' : 'btn-ghost border-base-300'"
          @click="toggleFilterType(opt)"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead>
          <tr>
            <th>标识符</th>
            <th>名称</th>
            <th>分类</th>
            <th>类型标签</th>
            <th>元素</th>
            <th>描述</th>
            <th class="w-28">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filteredRecords" :key="r.key">
            <td class="font-mono text-xs">{{ r.key }}</td>
            <td>{{ r.name }}</td>
            <td>{{ r.category }}</td>
            <td>
              <span
                v-for="t in r.type || []"
                :key="t"
                class="badge badge-ghost badge-xs mr-0.5"
                >{{ t }}</span
              >
            </td>
            <td>{{ r.elemental ?? "—" }}</td>
            <td class="text-xs opacity-70">{{ r.description }}</td>
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
          <tr v-if="!filteredRecords.length">
            <td
              colspan="7"
              class="text-center py-12 text-base-content/30 text-sm"
            >
              {{ records.length ? '没有匹配的物品' : '暂无数据' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-xl">
          <h3 class="text-lg font-bold mb-6">
            {{ editing ? "编辑物品" : "新增物品" }}
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
                  placeholder="英文标识"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">名称</span>
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.name"
                  placeholder="中文名称"
                />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">分类</span>
              <select
                class="select select-bordered select-sm w-full"
                v-model="form.category"
              >
                <option value="" disabled>选择分类</option>
                <option v-for="c in categories" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">描述</span>
              <textarea
                class="textarea textarea-bordered textarea-sm w-full"
                v-model="form.description"
                rows="2"
              ></textarea>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">类型标签（点按添加/删除）</span>
              <div class="flex flex-wrap gap-1 mb-1">
                <span
                  v-for="(t, i) in form.type"
                  :key="i"
                  class="badge badge-primary badge-sm gap-1 cursor-pointer"
                  @click="form.type.splice(i, 1)"
                  >{{ t }} ✕</span
                >
              </div>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="opt in typeOptions"
                  :key="opt"
                  class="badge badge-ghost badge-sm cursor-pointer hover:badge-primary"
                  :class="{ 'badge-primary': form.type.includes(opt) }"
                  @click="toggleType(opt)"
                  >{{ opt }}</span
                >
              </div>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">元素序数</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.elemental"
                  placeholder="可选"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">耐久度</span>
                <input
                  type="number"
                  step="0.01"
                  class="input input-bordered input-sm w-full"
                  v-model.number="form.durable"
                  placeholder="0-1"
                />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">重大发现</span>
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="toggle toggle-sm"
                  v-model="form.is_discovery"
                />
                <span class="text-xs opacity-60">{{
                  form.is_discovery ? "首次获得时触发命名弹窗" : "直接获得"
                }}</span>
              </div>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">时代里程碑</span>
              <SearchableSelect :options="milestoneOptions" v-model="form.milestone" placeholder="无" />
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">额外属性（JSON）</span>
              <textarea
                class="textarea textarea-bordered textarea-sm w-full font-mono"
                v-model="formJson.attrs"
                rows="2"
                placeholder='{"burn_time":30}'
              ></textarea>
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
import { ref, reactive, onMounted, computed } from "vue";
import { useAdminStore } from "@/stores/modules/admin";
import SearchableSelect from "@/components/SearchableSelect.vue";
import type { IItem } from "@/data/items";

const admin = useAdminStore();
const records = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const categories = ["材料", "工具", "容器", "燃料", "气体", "液体", "火源"];
const typeOptions = [
  "material",
  "tool",
  "container",
  "fuel",
  "gas",
  "liquid",
  "fire_source",
];

const searchQuery = ref("");
const searchElement = ref("");
const filterCategory = ref("");
const filterTypes = ref<string[]>([]);

const filteredRecords = computed(() => {
  let list = records.value;
  const q = searchQuery.value.toLowerCase().trim();
  const eq = searchElement.value.trim();

  if (q) {
    list = list.filter(r => 
      r.name?.toLowerCase().includes(q) || 
      r.key?.toLowerCase().includes(q)
    );
  }

  if (eq) {
    list = list.filter(r => r.elemental?.toString() === eq);
  }

  if (filterCategory.value) {
    list = list.filter(r => r.category === filterCategory.value);
  }

  if (filterTypes.value.length > 0) {
    list = list.filter(r => 
      filterTypes.value.every(t => r.type?.includes(t))
    );
  }

  return list;
});

function toggleFilterType(t: string) {
  const i = filterTypes.value.indexOf(t);
  i >= 0 ? filterTypes.value.splice(i, 1) : filterTypes.value.push(t);
}

const form = reactive<IItem>({
  key: "",
  name: "",
  category: "",
  description: "",
  type: [] as string[],
  elemental: undefined as number | undefined,
  durable: undefined as number | undefined,
  is_discovery: false,
});
const formJson = reactive({ attrs: "" });
const milestoneOptions = ref<{ key: string; label: string }[]>([]);

onMounted(async () => {
  await loadRecords();
  const { Eras } = await import("@/data/eras");
  milestoneOptions.value = Eras.flatMap((e) =>
    e.milestones.map((m) => ({ key: m.key, label: `${e.name} → ${m.description}` }))
  );
});
async function loadRecords() {
  const r = await admin.apiFetch("/api/items");
  records.value = await r.json();
}
function toggleType(t: string) {
  const i = form.type.indexOf(t);
  i >= 0 ? form.type.splice(i, 1) : form.type.push(t);
}
function resetForm() {
  Object.assign(form, {
    key: "",
    name: "",
    category: "",
    description: "",
    type: [],
    elemental: undefined,
    durable: undefined,
    is_discovery: false,
  });
  formJson.attrs = "";
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
    category: r.category || "",
    description: r.description || "",
    type: Array.isArray(r.type) ? [...r.type] : [],
    elemental: r.elemental,
    durable: r.durable,
    is_discovery: !!r.is_discovery,
    milestone: r.milestone || "",
  });
  formJson.attrs = r.attrs ? JSON.stringify(r.attrs, null, 2) : "";
  modalRef.value?.showModal();
}
function closeModal() {
  modalRef.value?.close();
}
async function save() {
  if (!form.key) {
    alert("标识符不能为空");
    return;
  }
  const body: Record<string, any> = {};
  for (const k of ["key", "name", "category", "description"]) {
    if ((form as any)[k]) body[k] = (form as any)[k];
  }
  if (form.type.length) body.type = [...form.type];
  if (form.elemental !== undefined && !isNaN(Number(form.elemental)))
    body.elemental = Number(form.elemental);
  if (form.durable !== undefined && !isNaN(Number(form.durable)))
    body.durable = Number(form.durable);
  if (form.is_discovery) body.is_discovery = true;
  if (form.milestone) body.milestone = form.milestone;
  if (formJson.attrs.trim()) {
    try {
      body.attrs = JSON.parse(formJson.attrs);
    } catch {
      alert("属性 JSON 格式错误");
      return;
    }
  }
  try {
    const res = editing.value
      ? await admin.apiFetch(`/api/items/${editing.value.key}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await admin.apiFetch("/api/items", {
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
  if (!confirm(`确定删除物品「${r.name || r.key}」？`)) return;
  await admin.apiFetch(`/api/items/${r.key}`, { method: "DELETE" });
  loadRecords();
}
</script>
