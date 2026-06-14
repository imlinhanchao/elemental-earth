<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import type { IAction } from '@/data/actions';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { computed } from 'vue';

  const props = defineProps<{
    data: IAction;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();

  const isEnabled = computed(() => {
    if (taskStore.tasks.length >= 100) return false; // 只能同时进行10个任务
    return props.data.required_items.every((item) => packStore.hasItem(item.key, item.quantity)) &&
      (!props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech)));
  });

  const isVisible = computed(() => {
    return !props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech));
  });

  function performAction() {
    if (!isEnabled.value) return;
    // Perform the action's effect here
    console.log(`Performing action: ${props.data.name}`);
    taskStore.pushTask(props.data);
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
</template>