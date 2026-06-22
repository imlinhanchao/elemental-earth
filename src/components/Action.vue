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

  // ─── 配方对话框状态 ────────────────────────────────────────────
  const showFormulaDialog = ref(false);

  function performAction() {
    if (!isEnabled.value) return;

    const f = props.data.formula;
    if (f?.key && f?.operation) {
      // 有配方引用 → 弹出配方执行对话框
      showFormulaDialog.value = true;
    } else {
      // 普通行动 → 直接推进任务队列
      taskStore.pushTask(props.data);
    }
  }

  function onFormulaDialogClose() {
    showFormulaDialog.value = false;
  }
</script>
<template>
  <ActionTip v-if="isVisible" :description="data.description" :required_items="data.required_items" :required_techs="data.required_techs">
    <button 
      class="btn w-[10em]" 
      :disabled="!isEnabled" 
      @click="performAction"
    >
      {{ data.name }}
    </button>
  </ActionTip>

  <FormulaDialog
    v-if="data.formula"
    :visible="showFormulaDialog"
    :formulaKey="data.formula.key"
    :operationKey="data.formula.operation"
    @close="onFormulaDialogClose"
  />
</template>
