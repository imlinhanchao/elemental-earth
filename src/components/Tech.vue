<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import type { ITech } from '@/data/techs';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { computed } from 'vue';

  const props = defineProps<{
    data: ITech;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();

  const isEnabled = computed(() => {
    if (taskStore.tasks.length >= 10) return false; // 只能同时进行10个任务
    // 如果科技已经在任务队列中，则禁止再次点击
    if (taskStore.tasks.some(t => t.key === props.data.key && t.type === 'tech')) return false;
    return props.data.required_items.every((item) => packStore.hasItem(item.key, item.quantity)) &&
      (!props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech)));
  });

  const isVisible = computed(() => {
    return (!props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech))) && !packStore.hasTech(props.data.key);
  });

  function performAction() {
    if (!isEnabled.value) return;
    // Perform the tech's effect here
    console.log(`Performing tech: ${props.data.name}`);
    taskStore.pushTask(props.data);
  }
</script>
<template>
  <ActionTip
    v-if="isVisible"
    :id="`tech-${data.key}`"
    :description="data.description"
    :required_items="data.required_items.map(req => ({
    key: Array.isArray(req.key) ? req.key[0] : req.key,
    quantity: req.quantity,
  }))" :required_techs="data.required_techs">
    <button 
      class="btn w-[10em]" 
      :disabled="!isEnabled" 
      @click="performAction"
    >
      {{ data.name }}
    </button>
  </ActionTip>
</template>