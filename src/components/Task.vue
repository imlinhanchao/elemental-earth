<script setup lang="ts">
  import { useTaskStore, type ITask } from '@/stores/modules/task';
  import { useAppStore } from '@/stores/modules/app';
  import { shortTime } from '@/utils/date';
  import { computed, ref } from 'vue';

  const props = defineProps<{
    task: ITask;
    ids?: (number | string)[];
    count?: number;
    showInTitle?: boolean;
    readOnly?: boolean;
  }>();

  const taskStore = useTaskStore();
  const appStore = useAppStore();
  const now = computed(() => appStore.tick);

  const cost = computed(() => {
    if (!props.task) return 0;
    
    // 任务预计完成时间 = 开始时间 + (持续时间 * 倍率)
    const finishTime = props.task.begin_time + (props.task.time_required * taskStore.timeMultiplier * 1000);
    let timeToFinish = (finishTime - now.value) / 1000;

    // 如果是折叠任务，加上组内剩余相同任务的总时间
    if (props.count && props.count > 1) {
      timeToFinish += (props.count - 1) * props.task.time_required * taskStore.timeMultiplier;
    }

    if (props.showInTitle) {
      document.title = `元素纪元 - ${props.task.name}${props.count && props.count > 1 ? ` x${props.count}` : ''} [${shortTime(Math.max(0, timeToFinish))}]`;
    }
    
    return Math.max(0, timeToFinish);
  });

  function remove() {
    if (props.readOnly) return;

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
  <span 
    class="badge inline-flex p-1 group items-center relative truncate transition-colors" 
    :class="[
      readOnly ? 'opacity-80 grayscale active:scale-100' : 'group hover:bg-error/10 hover:text-error cursor-pointer'
    ]"
    :title="readOnly ? `${task.name} (查看模式)` : task.name" 
    @click="remove"
  >
    <span class="truncate inline-flex items-center" :class="{ 'group-hover:opacity-50': !readOnly }">
      <Icon v-if="task.condition?.loopUntil" icon="tabler:repeat" class="text-xs mr-0.5 text-primary" />
      <span class="truncate">{{ task.name }}</span>
      <span v-if="count && count > 1">x{{ count }}</span>
      <span>[{{ shortTime(cost) }}]</span>
    </span>
    <span v-if="!readOnly" class="inline-flex absolute left-0 right-0 transition-transform translate-y-0.5 items-center justify-center">
      <Icon icon="tabler:x" class="text-sm hidden group-hover:inline" />
    </span>
  </span>
</template>