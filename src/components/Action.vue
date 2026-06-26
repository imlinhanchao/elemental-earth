<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import FormulaDialog from '@/components/FormulaDialog.vue';
  import type { IAction } from '@/data/actions';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { useStateStore } from '@/stores/modules/state';
  import { computed, ref } from 'vue';

  const props = defineProps<{
    data: IAction;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();
  const stateStore = useStateStore();

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
    return mapOk &&
      props.data.required_items.every((item) => packStore.hasItem(item.key, item.quantity)) &&
      (!props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech)));
  });

  const isVisible = computed(() => {
    const techsOk = !props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech));
    const itemsEverHad = props.data.required_items.every((item) => packStore.hasEverHad(item.key));
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
    // 普通行动：批量推送任务
    const count = Math.min(batchCount.value, maxBatch.value);
    for (let i = 0; i < count; i++) {
      if (taskStore.tasks.length >= 100) break;
      taskStore.pushTask(props.data);
    }
  }

  function onFormulaDialogClose() {
    showFormulaDialog.value = false;
  }
</script>
<template>
  <ActionTip v-if="isVisible" :description="data.description" :required_items="data.required_items" :required_techs="data.required_techs">
    <div class="relative inline-flex">
      <button 
        class="btn w-[10em]" 
        :disabled="!isEnabled" 
        @click="performAction"
      >
        {{ data.name }}
      </button>
      <!-- 批量次数选择器 -->
      <div class="absolute -top-2 -left-2 z-10">
        <button
          class="btn btn-xs btn-ghost bg-base-100 shadow-sm border border-base-300 rounded-full w-5 h-5 min-h-0 p-0 text-[10px] font-bold"
          :class="batchCount > 1 ? 'text-primary' : 'text-base-content/40'"
          @click="toggleBatchPicker"
        >{{ batchCount }}</button>
      </div>
      <!-- 下拉选择面板 -->
      <div v-if="showBatchPicker"
        class="absolute top-0 left-0 z-200 bg-base-100 border border-base-300 rounded-lg shadow-lg p-1.5 flex gap-1 flex-wrap min-w-[120px]"
        @click.stop
      >
        <button
          v-for="n in batchOptions"
          :key="n"
          class="btn btn-xs"
          :class="batchCount === n ? 'btn-primary' : 'btn-ghost'"
          @click="setBatch(n)"
        >{{ n }}</button>
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
