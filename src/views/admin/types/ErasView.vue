<template>
  <div class="flex-1 overflow-y-auto p-4">
    <div class="flex items-center gap-3 mb-6">
      <button
        class="btn btn-ghost btn-sm"
        @click="$router.push('/admin/dashboard')"
      >
        ← 返回
      </button>
      <h2 class="text-xl font-bold">⏳ 时代管理</h2>
      <span class="badge badge-ghost badge-sm">{{ eras.length }} 个时代</span>
    </div>
    <div class="space-y-4">
      <div v-for="era in eras" :key="era.key" class="card bg-base-200">
        <div class="card-body p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-bold text-base">
              {{ era.order + 1 }}. {{ era.name }}
            </h3>
            <div class="flex gap-2">
              <button class="btn btn-xs btn-primary" @click="openEdit(era)">
                编辑
              </button>
            </div>
          </div>
          <p class="text-xs text-base-content/60 mb-2">{{ era.description }}</p>
          <div class="text-xs font-medium mb-1">
            里程碑（{{ era.milestones.length }}）
          </div>
          <div class="space-y-1">
            <div
              v-for="(m, i) in era.milestones"
              :key="i"
              class="flex items-center gap-2 text-xs"
            >
              <span class="opacity-50">{{ +i + 1 }}.</span>
              <span>{{ m.description }}</span>
              <span class="font-mono text-[10px] opacity-40"
                >({{ m.key }})</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <dialog ref="modalRef" class="modal">
        <div class="modal-box max-w-xl">
          <h3 class="font-bold text-lg mb-4">
            {{ editing ? "编辑时代" : "新增时代" }}
          </h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <label class="form-control"
                ><span class="label-text">标识符</span
                ><input
                  class="input input-bordered input-sm"
                  v-model="form.key"
              /></label>
              <label class="form-control"
                ><span class="label-text">名称</span
                ><input
                  class="input input-bordered input-sm"
                  v-model="form.name"
              /></label>
            </div>
            <label class="form-control"
              ><span class="label-text">图标（Iconify 名）</span
              ><input class="input input-bordered input-sm" v-model="form.icon"
            /></label>
            <label class="form-control"
              ><span class="label-text">描述</span
              ><textarea
                class="textarea textarea-bordered textarea-sm"
                v-model="form.description"
                rows="2"
              ></textarea>
            </label>
            <label class="form-control"
              ><span class="label-text">显示顺序</span
              ><input
                type="number"
                class="input input-bordered input-sm"
                v-model.number="form.order"
            /></label>

            <fieldset class="border border-base-300 rounded p-2">
              <legend class="text-xs opacity-60 px-1">里程碑</legend>
              <div
                v-for="(row, i) in milestones"
                :key="i"
                class="flex gap-1 items-start mb-1"
              >
                <input
                  class="input input-bordered input-xs flex-1"
                  v-model="row.key"
                  placeholder="key"
                />
                <input
                  class="input input-bordered input-xs flex-1"
                  v-model="row.description"
                  placeholder="描述"
                />
                <button
                  class="btn btn-xs btn-ghost text-error"
                  @click="milestones.splice(i, 1)"
                >
                  ✕
                </button>
              </div>
              <button
                class="btn btn-xs btn-ghost"
                @click="milestones.push({ key: '', description: '' })"
              >
                ＋ 添加
              </button>
            </fieldset>
          </div>
          <div class="modal-action">
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
const eras = ref<any[]>([]);
const modalRef = ref<HTMLDialogElement | null>(null);
const editing = ref<any>(null);
const form = reactive({
  key: "",
  name: "",
  icon: "",
  description: "",
  order: 0,
});
const milestones = reactive<any[]>([]);

onMounted(loadEras);
async function loadEras() {
  const { Eras } = await import("@/data/eras");
  eras.value = [...Eras].sort((a, b) => a.order - b.order);
}
function resetForm() {
  Object.assign(form, {
    key: "",
    name: "",
    icon: "",
    description: "",
    order: 0,
  });
  milestones.splice(0);
  editing.value = null;
}
function openEdit(r: any) {
  editing.value = r;
  resetForm();
  Object.assign(form, {
    key: r.key,
    name: r.name,
    icon: r.icon,
    description: r.description,
    order: r.order,
  });
  milestones.push(...r.milestones.map((m: any) => ({ ...m })));
}
function closeModal() {
  modalRef.value?.close();
}
function save() {
  if (!form.key) {
    alert("key 不能为空");
    return;
  }
  // 提示用户通过后台 files API 手动保存 eras.json
  alert(
    "时代数据保存在 src/data/eras.json 中，请手动编辑该文件保存更改。\n\n修改内容：\n" +
      JSON.stringify({ ...form, milestones: [...milestones] }, null, 2),
  );
  closeModal();
}
</script>
