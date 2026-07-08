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
        />元素管理
      </h2>
      <span class="badge badge-ghost badge-sm">{{ records.length }} 条</span>
    </div>
    <div class="flex gap-2 mb-4">
      <button class="btn btn-ghost btn-sm" @click="loadRecords">⟳ 刷新</button>
    </div>
    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-zebra table-xs">
        <thead>
          <tr>
            <th>序数</th>
            <th>符号</th>
            <th>中文名</th>
            <th>英文名</th>
            <th>分类</th>
            <th>原子量</th>
            <th class="w-20">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in records" :key="r.number">
            <td>{{ r.number }}</td>
            <td class="font-bold">{{ r.symbol }}</td>
            <td>{{ r.name }}</td>
            <td class="text-xs">{{ r.nameEn }}</td>
            <td class="text-xs">{{ r.category }}</td>
            <td class="text-xs">{{ r.mass }}</td>
            <td>
              <div class="flex gap-1">
                <button
                  class="btn btn-xs btn-ghost"
                  @click="$router.push(`/admin/elements/${r.number}`)"
                >
                  路径
                </button>
                <button class="btn btn-xs btn-ghost" @click="openEdit(r)">
                  编辑
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!records.length">
            <td
              colspan="7"
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
        <div class="modal-box max-w-lg">
          <h3 class="text-lg font-bold mb-6">编辑元素</h3>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">原子序数</span>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  :value="form.number"
                  disabled
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">符号</span>
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.symbol"
                />
              </label>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <label class="form-control w-full">
                <span class="label-text mb-1">中文名称</span>
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.name"
                />
              </label>
              <label class="form-control w-full">
                <span class="label-text mb-1">英文名称</span>
                <input
                  class="input input-bordered input-sm w-full"
                  v-model="form.nameEn"
                />
              </label>
            </div>
            <label class="form-control w-full">
              <span class="label-text mb-1">分类</span>
              <select
                class="select select-bordered select-sm w-full"
                v-model="form.category"
              >
                <option v-for="c in categories" :key="c" :value="c">
                  {{ c }}
                </option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text mb-1">原子量</span>
              <input
                class="input input-bordered input-sm w-full"
                v-model="form.mass"
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
import { ref, onMounted } from "vue";
import { useAdminStore } from "@/stores/modules/admin";

const admin = useAdminStore();
const records = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const form = ref({
  number: 0,
  symbol: "",
  name: "",
  nameEn: "",
  category: "",
  mass: "",
});
const categories = [
  "alkali-metal",
  "alkaline-earth-metal",
  "transition-metal",
  "post-transition-metal",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble-gas",
  "lanthanide",
  "actinide",
  "placeholder",
];
onMounted(loadRecords);
async function loadRecords() {
  const r = await admin.apiFetch("/api/elements");
  records.value = await r.json();
}
function resetForm() {
  form.value = {
    number: 0,
    symbol: "",
    name: "",
    nameEn: "",
    category: "",
    mass: "",
  };
  editing.value = null;
}
function openEdit(r: any) {
  editing.value = r;
  form.value = {
    number: r.number,
    symbol: r.symbol || "",
    name: r.name || "",
    nameEn: r.nameEn || "",
    category: r.category || "",
    mass: r.mass || "",
  };
  modalRef.value?.showModal();
}
function closeModal() {
  modalRef.value?.close();
}
async function save() {
  if (!editing.value) return;
  try {
    const res = await admin.apiFetch(`/api/elements/${editing.value.number}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.value),
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
</script>
