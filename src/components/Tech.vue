<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import type { ITech } from '@/data/techs';
  import { useAppStore } from '@/stores/modules/app';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { shortTime } from '@/utils/date';
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

  const props = defineProps<{
    data: ITech;
  }>();

  const appStore = useAppStore();
  const packStore = usePackStore();
  const taskStore = useTaskStore();

  const now = ref(Date.now());
  let timer: any = null;
  onMounted(() => {
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  });
  onBeforeUnmount(() => {
    if (timer) clearInterval(timer);
  });

  const matchingTaskIndex = computed(() => taskStore.tasks.findIndex(t => t.key === props.data.key && t.type === 'tech'))
  const matchingTask = computed(() => taskStore.tasks[matchingTaskIndex.value])

  const remainingTime = computed(() => {
    if (matchingTaskIndex.value === -1) return 0;
    const preTasks = taskStore.tasks.slice(0, matchingTaskIndex.value);
    const currentTaskRemaining = matchingTask.value.begin_time > 0
      ? (matchingTask.value.time_required * 1000 + matchingTask.value.begin_time - now.value) / 1000
      : matchingTask.value.time_required;

    const preTasksTotal = preTasks.reduce((total, preTask) => {
      if (preTask.begin_time > 0) {
        return total + (preTask.time_required * 1000 + preTask.begin_time - now.value) / 1000;
      }
      return total + preTask.time_required;
    }, 0);

    return Math.max(0, preTasksTotal + currentTaskRemaining);
  });

  const isEnabled = computed(() => {
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
  }))" 
    :required_techs="data.required_techs"
    :time_required="data.time_required"
  >
    <div class="relative w-[10em]">
      <button 
        class="btn w-full" 
        :disabled="!isEnabled" 
        @click="performAction"
      >
        {{ data.name }}
      </button>
      <div v-if="appStore.isMobile && matchingTask" class="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-base-300 rounded-b pointer-events-none opacity-80">
        {{ shortTime(remainingTime) }}
      </div>
    </div>
  </ActionTip>
</template>