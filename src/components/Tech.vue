<script setup lang="ts">
  import ActionTip from '@/components/ActionTip.vue';
  import type { ITech } from '@/data/techs';
  import { useAppStore } from '@/stores/modules/app';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { shortTime } from '@/utils/date';
  import { computed } from 'vue';

  const props = defineProps<{
    data: ITech;
  }>();

  const appStore = useAppStore();
  const packStore = usePackStore();
  const taskStore = useTaskStore();

  const now = computed(() => appStore.tick);

  const matchingTaskIndex = computed(() => taskStore.tasks.findIndex(t => t.key === props.data.key && t.type === 'tech'))
  const matchingTask = computed(() => taskStore.tasks[matchingTaskIndex.value])

  const remainingTime = computed(() => {
    if (matchingTaskIndex.value === -1 || !matchingTask.value) return 0;
    
    const multiplier = taskStore.timeMultiplier;
    
    // 如果任务已经有预计开始时间，则 总剩余时间 = (开始时间 + 持续时间 - 现在时间)
    if (matchingTask.value.begin_time > 0) {
      const finishTime = matchingTask.value.begin_time + (matchingTask.value.time_required * multiplier * 1000);
      return Math.max(0, (finishTime - now.value) / 1000);
    }
    
    // 如果任务还没排进开始时间（理论上 push 后立刻 recalculate 会有值，但作为兜底）
    // 累加前面所有任务的耗时 + 自身耗时
    const preTasks = taskStore.tasks.slice(0, matchingTaskIndex.value);
    const preTasksTotal = preTasks.reduce((total, t) => total + t.time_required * multiplier, 0);
    return preTasksTotal + matchingTask.value.time_required * multiplier;
  });

  const isEnabled = computed(() => {
    // 如果科技已经在任务队列中，则禁止再次点击
    if (taskStore.tasks.some(t => t.key === props.data.key && t.type === 'tech')) return false;
    const itemsOk = taskStore.canPerformWithProjection(props.data.required_items);
    const techsOk = !props.data.required_techs || props.data.required_techs.every((tech) => packStore.hasTech(tech));
    return itemsOk && techsOk;
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
    :required_items="data.required_items" 
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