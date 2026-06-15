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
  <span class="badge inline-flex p-1 group items-center">
    {{ task.name }}[{{ shortTime(cost) }}]
    <Icon icon="tabler:x" class="text-sm hidden group-hover:inline" @click="remove" />
  </span>
</template>