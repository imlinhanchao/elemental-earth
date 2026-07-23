<script setup lang="ts">
  import { computed } from 'vue';
  import { usePackStore } from '@/stores/modules/pack';
  import { useTaskStore } from '@/stores/modules/task';
  import { LabActions } from '@/data/labs';
  import type { IFormula } from '@/data/formula';
  import ActionTip from '@/components/ActionTip.vue';

  const props = defineProps<{
    data: IFormula;
    inGroupId?: string;
  }>();

  const emit = defineEmits<{
    (e: 'click', formula: IFormula): void
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();

  /** 获取配方的单次耗时（操作耗时 * 最小次数） */
  const timeRequired = computed(() => {
    const opKey = props.data.required_actions?.key;
    if (!opKey) return props.data.time_required;
    const op = LabActions.find(a => a.key === opKey);
    if (!op) return props.data.time_required;
    return op.time_required * (props.data.required_actions?.min || 1);
  });

  const canPerform = computed(() => {
    if (!props.data.required_actions) return false;
    return taskStore.canPerformWithProjection(props.data.required_items);
  });

  function isInGroup(groupId: string) {
    const g = packStore.manuscripts.find(m => m.id === groupId);
    return g?.items.some(i => i.type === 'formula' && i.key === props.data.key);
  }

  const resolvedItems = computed(() => {
    return props.data.required_items.map(req => ({
      key: Array.isArray(req.key) ? (req.key.find(k => packStore.hasEverHad(k)) || req.key[0]) : req.key,
      quantity: req.quantity,
    }));
  });
</script>

<template>
  <ActionTip
    :id="`formula-${data.key}`"
    :description="data.description"
    :required_items="resolvedItems"
    :required_techs="data.required_techs"
    :time_required="timeRequired"
  >
    <div class="relative inline-flex formula">
      <button
        class="btn btn-soft w-[10em]"
        :disabled="!canPerform"
        @click="emit('click', data)"
      >
        {{ data.name }}
      </button>
      
      <!-- 手札分组（右下） -->
      <div v-if="inGroupId" class="absolute -bottom-2 -right-2 z-110">
        <button
          class="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-sm border border-base-300 w-5 h-5 min-h-0 p-0 text-[10px] text-error hover:bg-error/20 btn-tool"
          title="移出手札"
          @click.stop="packStore.toggleManuscriptItem(inGroupId, 'formula', data.key)"
        >
          <Icon icon="tabler:x" />
        </button>
      </div>
      <div v-else-if="packStore.manuscripts.length > 0" class="absolute -bottom-2 -right-2 z-10 dropdown dropdown-end">
        <button
          tabindex="0"
          class="btn btn-xs btn-circle btn-ghost bg-base-100 shadow-sm border border-base-300 w-5 h-5 min-h-0 p-0 text-[10px] tool-btn"
          title="添加到手札"
          @click.stop
        >
          <Icon icon="tabler:bookmark-plus" />
        </button>
        <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-48 z-30 border border-base-300">
          <li class="menu-title text-xs">加入手札</li>
          <li v-for="g in packStore.manuscripts" :key="g.id">
            <a class="flex justify-between items-center text-sm" @click.stop="packStore.toggleManuscriptItem(g.id, 'formula', data.key)" :class="{ 'bg-primary/10 text-primary': isInGroup(g.id) }">
              {{ g.name }}
              <Icon :icon="isInGroup(g.id) ? 'tabler:check' : 'tabler:bookmark-plus'" class="text-xs" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  </ActionTip>
</template>
