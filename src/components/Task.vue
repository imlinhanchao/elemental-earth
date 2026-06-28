<script setup lang="ts">
  import { useTaskStore, type ITask } from '@/stores/modules/task';
  import { shortTime } from '@/utils/date';
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

  const props = defineProps<{
    task: ITask;
    preTasks: ITask[];
  }>();

  const taskStore = useTaskStore();
  const now = ref(Date.now());
  onMounted(() => {
    const timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
    onBeforeUnmount(() => {
      clearInterval(timer);
    });
  });

  const cost = computed(() => {
    return props.preTasks.reduce((total, preTask) => {
      if (preTask.begin_time > 0) {
        return total + (preTask.time_required * 1000 + preTask.begin_time - now.value) / 1000;
      }
      return total + preTask.time_required;
    }, 0) + (props.task.time_required * 1000 + props.task.begin_time - (props.task.begin_time > 0 ? now.value : 0)) / 1000;
  });

  function remove() {
    taskStore.removeTask(props.task.id);
  }
</script>
<template>
  <span class="badge inline-flex p-1 group items-center relative group hover:bg-error/10 hover:text-error transition-colors cursor-pointer" :title="task.name" @click="remove">
    <span class="group-hover:opacity-50">{{ task.name }}[{{ shortTime(cost) }}]</span>
    <span class="inline-flex absolute left-0 right-0 transition-transform translate-y-0.5 items-center justify-center">
      <Icon icon="tabler:x" class="text-sm hidden group-hover:inline" />
    </span>
  </span>
</template>