<script setup lang="ts">
  import { useTaskStore, type ITask } from '@/stores/modules/task';
  import { shortTime } from '@/utils/date';
  import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

  const props = defineProps<{
    task: ITask;
    ids?: number[];
    count?: number;
    showInTitle?: boolean;
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
    if (!props.task) return 0;
    
    // 任务预计完成时间 = 开始时间 + 持续时间
    const finishTime = props.task.begin_time + (props.task.time_required * 1000);
    let timeToFinish = (finishTime - now.value) / 1000;

    // 如果是折叠任务，加上组内剩余相同任务的总时间
    if (props.count && props.count > 1) {
      timeToFinish += (props.count - 1) * props.task.time_required;
    }

    if (props.showInTitle) {
      document.title = `元素纪元 - ${props.task.name}${props.count && props.count > 1 ? ` x${props.count}` : ''} [${shortTime(Math.max(0, timeToFinish))}]`;
    }
    
    return Math.max(0, timeToFinish);
  });

  function remove() {
    const taskName = props.task.name;
    const isBatch = props.ids && props.ids.length > 1;
    const confirmMsg = isBatch 
      ? `确定要取消全部 ${props.count} 个「${taskName}」任务吗？\n取消后将返还所有材料。`
      : `确定要取消任务「${taskName}」吗？\n取消后将返还所有材料。`;

    if ((props.task.formula || props.count) && !confirm(confirmMsg)) return;

    if (isBatch) {
      // 逆序移除，防止索引错乱（虽然 removeTask 是按 ID 查找，但安全起见）
      const toRemove = [...props.ids!].reverse();
      toRemove.forEach(id => taskStore.removeTask(id));
    } else {
      taskStore.removeTask(props.task.id);
    }
  }
</script>
<template>
  <span class="badge inline-flex p-1 group items-center relative truncate group hover:bg-error/10 hover:text-error transition-colors cursor-pointer" :title="task.name" @click="remove">
    <span class="group-hover:opacity-50 truncate inline-flex items-center">
      <span class="truncate">{{ task.name }}</span>
      <span v-if="count && count > 1">x{{ count }}</span>
      <span>[{{ shortTime(cost) }}]</span>
    </span>
    <span class="inline-flex absolute left-0 right-0 transition-transform translate-y-0.5 items-center justify-center">
      <Icon icon="tabler:x" class="text-sm hidden group-hover:inline" />
    </span>
  </span>
</template>