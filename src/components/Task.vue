<script setup lang="ts">
  import { useTaskStore, type ITask } from '@/stores/modules/task';
  import { shortTime } from '@/utils/date';
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

  const props = defineProps<{
    task: ITask;
    preTasks: ITask[];
    ids?: number[];
    count?: number;
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
    const timeToFirstFinish = props.preTasks.reduce((total, preTask) => {
      if (preTask.begin_time > 0) {
        return total + (preTask.time_required * 1000 + preTask.begin_time - now.value) / 1000;
      }
      return total + preTask.time_required;
    }, 0) + (props.task.time_required * 1000 + props.task.begin_time - (props.task.begin_time > 0 ? now.value : 0)) / 1000;

    // 如果是折叠任务，加上组内剩余任务的总时间
    if (props.count && props.count > 1) {
      return timeToFirstFinish + (props.count - 1) * props.task.time_required;
    }
    return timeToFirstFinish;
  });

  function remove() {
    if (props.ids && props.ids.length > 1) {
      // 逆序移除，防止索引错乱（虽然 removeTask 是按 ID 查找，但安全起见）
      const toRemove = [...props.ids].reverse();
      toRemove.forEach(id => taskStore.removeTask(id));
    } else {
      taskStore.removeTask(props.task.id);
    }
  }
</script>
<template>
  <span class="badge inline-flex p-1 group items-center relative group hover:bg-error/10 hover:text-error transition-colors cursor-pointer" :title="task.name" @click="remove">
    <span class="group-hover:opacity-50">
      {{ task.name }}
      <template v-if="count && count > 1">x{{ count }}</template>
      [{{ shortTime(cost) }}]
    </span>
    <span class="inline-flex absolute left-0 right-0 transition-transform translate-y-0.5 items-center justify-center">
      <Icon icon="tabler:x" class="text-sm hidden group-hover:inline" />
    </span>
  </span>
</template>