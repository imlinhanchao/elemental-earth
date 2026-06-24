<script setup lang="ts">
  import { Items } from '@/data/items';
  import { usePackStore, type IPackItem } from '@/stores/modules/pack';
  import { computed, ref } from 'vue';
  import InlineTooltip from '@/components/InlineTooltip.vue';
  import RenameDialog from '@/components/RenameDialog.vue';

  const props = defineProps<{
    data: IPackItem;
  }>();

  const packStore = usePackStore();
  const itemData = computed(() => {
    return Items.find(item => item.key === props.data.key);
  });

  const hasRename = computed(() => !!packStore.itemRenames[props.data.key]);
  const displayName = computed(() => packStore.getDisplayName(props.data.key));
  const description = computed(() => itemData.value?.description || '');

  const showRename = ref(false);
</script>
<template>
  <div class="item-row group">
    <div class="flex items-center justify-between px-4">
      <InlineTooltip :text="description">
        <span class="truncate block">{{ displayName }}</span>
      </InlineTooltip>
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="btn btn-xs btn-ghost opacity-0 group-hover:opacity-60 hover:opacity-100! transition-opacity px-1"
          title="修改命名"
          @click.stop="showRename = true"
        >
          <Icon icon="fa7-solid:edit" />
        </button>
        <span class="badge badge-primary badge-xs">{{ data.quantity }}</span>
      </div>
    </div>
    <span v-if="itemData?.durable" class="tooltip tooltip-bottom inline-flex w-full" :data-tip="`耐久度: ${Math.round((data.durable / (itemData?.durable ?? 1)) * 100)}%`">
      <progress 
        class="progress progress-primary w-full" 
        :value="data.durable * 100" 
        :max="(itemData?.durable ?? 1) * 100"
      ></progress>
    </span>
    <RenameDialog
      :visible="showRename"
      :itemKey="data.key"
      @done="showRename = false"
    />
  </div>
</template>
<style scoped>
.item-row {
  position: relative;
}
</style>