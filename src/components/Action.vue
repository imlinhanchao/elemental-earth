<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import FormulaDialog from '@/components/FormulaDialog.vue';
  import type { IAction } from '@/data/actions';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { useStateStore } from '@/stores/modules/state';
  import { computed, ref, reactive } from 'vue';

  const props = defineProps<{
    data: IAction;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();
  const stateStore = useStateStore();

  // ─── 替代材料选择 ────────────────────────────────────────────
  /** 按 action key 存储用户为每个替代材料组选定的 key */
  const materialChoices = reactive<Record<string, string>>({});

  /** 是否有替代材料配置 */
  const hasAlternatives = computed(() =>
    props.data.required_items.some(r => Array.isArray(r.key))
  );

  /** 行动是否有任务正在执行 */
  const isRunning = computed(() =>
    taskStore.tasks.some(t => t.key === props.data.key)
  );

  /** 获取当前行动各材料最终选定的 key（替代材料组取用户选择或默认第一个） */
  function resolveMaterials(): { key: string; quantity: number; use?: number }[] {
    return props.data.required_items.map(r => {
      const keys = Array.isArray(r.key) ? r.key : [r.key];
      // 用户已选择 →
      const chosen = materialChoices[`${props.data.key}_${r.key}`];
      if (chosen && keys.includes(chosen) && packStore.hasItem(chosen, r.quantity)) return { key: chosen, quantity: r.quantity, use: r.use };
      // 默认第一个可用的
      for (const k of keys) {
        if (packStore.hasItem(k, r.quantity)) return { key: k, quantity: r.quantity, use: r.use };
      }
      return { key: keys[0], quantity: r.quantity, use: r.use };
    });
  }

  /** 替代材料组当前是否有多个可选 */
  function hasMultipleChoices(): boolean {
    return props.data.required_items.some(r => {
      if (!Array.isArray(r.key)) return false;
      const avail = r.key.filter(k => packStore.hasItem(k, r.quantity));
      return avail.length > 1;
    });
  }

  /** 获取某组替代材料的可用选项 */
  function getAvailableOptions(reqKey: string | string[]): { key: string; name: string }[] {
    const keys = Array.isArray(reqKey) ? reqKey : [reqKey];
    return keys
      .map(k => ({ key: k, name: packStore.getDisplayName(k) }))
      .filter(o => packStore.hasItem(o.key, props.data.required_items.find(r => (Array.isArray(r.key) ? r.key : [r.key]).includes(o.key))?.quantity ?? 1));
  }

  // ─── 选择弹窗 ────────────────────────────────────────────────
  const showMaterialPicker = ref(false);

  function toggleMaterialPicker(e: Event) {
    e.stopPropagation();
    if (!hasMultipleChoices() || isRunning.value) return;
    showMaterialPicker.value = !showMaterialPicker.value;
  }

  function selectAlternative(storeKey: string, itemKey: string) {
    materialChoices[storeKey] = itemKey;
    showMaterialPicker.value = false;
  }

  // ─── 批量次数 ────────────────────────────────────────────────
  const batchCount = ref(1);
  const showBatchPicker = ref(false);

  const maxBatch = computed(() => {
    const slots = 100 - taskStore.tasks.length;
    return Math.min(20, Math.max(1, slots));
  });

  const batchOptions = computed(() => {
    const opts: number[] = [];
    const max = maxBatch.value;
    for (const n of [1, 2, 3, 5, 10, 20]) {
      if (n <= max) opts.push(n);
    }
    if (!opts.includes(max) && max > 0) opts.push(max);
    return opts;
  });

  function setBatch(n: number) {
    batchCount.value = Math.max(1, Math.min(n, maxBatch.value));
    showBatchPicker.value = false;
  }

  function toggleBatchPicker(e: Event) {
    e.stopPropagation();
    showBatchPicker.value = !showBatchPicker.value;
  }

  // ─── 可见/可用 ──────────────────────────────────────────────
  const isEnabled = computed(() => {
    if (taskStore.tasks.length >= 100) return false;
    const mapOk = !props.data.map || props.data.map.includes(stateStore.state.map);
    const itemsOk = props.data.required_items.every(r => {
      const keys = Array.isArray(r.key) ? r.key : [r.key];
      return keys.some(k => packStore.hasItem(k, r.quantity));
    });
    return mapOk && itemsOk && (!props.data.required_techs || props.data.required_techs.every(t => packStore.hasTech(t)));
  });

  const isVisible = computed(() => {
    const techsOk = !props.data.required_techs || props.data.required_techs.every(t => packStore.hasTech(t));
    const itemsEverHad = props.data.required_items.every(r => {
      const keys = Array.isArray(r.key) ? r.key : [r.key];
      return keys.some(k => packStore.hasEverHad(k));
    });
    const mapOk = !props.data.map || props.data.map.includes(stateStore.state.map);
    return techsOk && itemsEverHad && mapOk;
  });

  // ─── 执行 ──────────────────────────────────────────────────
  const showFormulaDialog = ref(false);

  function performAction() {
    if (!isEnabled.value) return;
    const f = props.data.formula;
    if (f?.key && f?.operation) {
      showFormulaDialog.value = true;
      return;
    }
    // 批量推送
    const count = Math.min(batchCount.value, maxBatch.value);
    for (let i = 0; i < count; i++) {
      if (taskStore.tasks.length >= 100) break;
      // 用当前选定的材料替换替代项
      const resolved = resolveMaterials();
      // 创建一个修改过的 action 数据，替换 required_items
      const actionData = { ...props.data };
      const originalReqs = props.data.required_items;
      // 推送时用 resolved 材料
      // 修改 pushTask 调用的数据
      const taskPayload = {
        ...actionData,
        required_items: resolved,
      };
      taskStore.pushTask(taskPayload);
    }
  }

  function onFormulaDialogClose() {
    showFormulaDialog.value = false;
  }
</script>
<template>
  <ActionTip v-if="isVisible"
    :description="data.description"
    :required_items="resolveMaterials().map(r => ({ key: r.key, quantity: r.quantity }))"
    :required_techs="data.required_techs"
  >
    <div class="relative inline-flex">
      <button 
        class="btn w-[10em]" 
        :disabled="!isEnabled" 
        @click="performAction"
      >
        {{ data.name }}
      </button>

      <!-- 批量次数（左上） -->
      <div class="absolute -top-2 -left-2 z-10">
        <button
          class="btn btn-xs btn-ghost bg-base-100 shadow-sm border border-base-300 rounded-full w-5 h-5 min-h-0 p-0 text-[10px] font-bold"
          :class="batchCount > 1 ? 'text-primary' : 'text-base-content/40'"
          @click="toggleBatchPicker"
        >{{ batchCount }}</button>
        <!-- 批量选择面板 -->
        <div v-if="showBatchPicker"
          class="absolute top-0 left-0 z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg p-1.5 flex gap-1 flex-wrap min-w-[120px]"
          @click.stop
        >
          <button v-for="n in batchOptions" :key="n"
            class="btn btn-xs"
            :class="batchCount === n ? 'btn-primary' : 'btn-ghost'"
            @click="setBatch(n)"
          >{{ n }}</button>
        </div>
      </div>

      <!-- 替代材料选择（右上） -->
      <div v-if="hasAlternatives" class="absolute -top-2 -right-2 z-300">
        <button
          v-if="hasMultipleChoices() && !isRunning"
          class="btn btn-xs btn-ghost bg-base-100 shadow-sm border border-base-300 rounded-full w-5 h-5 min-h-0 p-0 flex items-center justify-center"
          title="选择材料"
          @click="toggleMaterialPicker"
        ><span class="text-[12px]"><Icon icon="tdesign:setting-1-filled" /></span></button>
        <!-- 材料选择面板 -->
        <div v-if="showMaterialPicker"
          class="absolute top-0 right-0 z-20 bg-base-100 border border-base-300 rounded-lg shadow-lg p-2 min-w-[140px]"
          @click.stop
        >
          <div v-for="r in data.required_items" :key="Array.isArray(r.key) ? r.key.join(',') : r.key">
            <template v-if="Array.isArray(r.key)">
              <div class="text-[10px] opacity-50 mb-1">替代材料</div>
              <button v-for="opt in getAvailableOptions(r.key)" :key="opt.key"
                class="btn btn-xs w-full justify-start mb-0.5"
                :class="(materialChoices[`${data.key}_${r.key}`] || resolveMaterials().find(m => r.key.includes ? r.key.includes(m.key) : false)?.key) === opt.key ? 'btn-primary' : 'btn-ghost'"
                @click="selectAlternative(`${data.key}_${r.key}`, opt.key)"
              >{{ opt.name }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </ActionTip>

  <FormulaDialog
    v-if="data.formula"
    :visible="showFormulaDialog"
    :formulaKey="data.formula.key"
    :operationKey="data.formula.operation"
    @close="onFormulaDialogClose"
  />
</template>
