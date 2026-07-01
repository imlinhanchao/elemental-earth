<script setup lang="ts">
  import { Items } from '@/data/items';
  import { useAppStore } from '@/stores/modules/app';
  import { usePackStore, type IPackItem } from '@/stores/modules/pack';
  import { computed, ref } from 'vue';
  import InlineTooltip from '@/components/InlineTooltip.vue';
  import RenameDialog from '@/components/RenameDialog.vue';
import { Icon } from '@iconify/vue';

  const props = defineProps<{
    data: IPackItem;
  }>();

  const appStore = useAppStore();
  const packStore = usePackStore();
  const itemData = computed(() => {
    return Items.find(item => item.key === props.data.key);
  });

  const displayName = computed(() => packStore.getDisplayName(props.data.key));
  const description = computed(() => itemData.value?.description || '');
  const note = computed(() => packStore.getItemNote(props.data.key));

  const showRename = ref(false);
</script>
<template>
  <div class="item-row group">
    <div class="flex items-center justify-between px-4">
      <InlineTooltip :text="description">
        <template #text>
          <div>
            <span>{{ description }}</span>
            <br />
            <span v-if="note" class="italic opacity-70">({{ note }})</span>
          </div>
        </template>
        <span class="truncate block">{{ displayName }}</span>
      </InlineTooltip>
      <div class="flex items-center gap-1 shrink-0">
        <button
          class="btn btn-xs btn-ghost transition-opacity px-1"
          :class="{ 'opacity-0 lg:group-hover:opacity-60 lg:hover:opacity-100!': !appStore.isMobile, 'opacity-60': appStore.isMobile }"
          title="修改命名"
          @click.stop="showRename = true"
        >
          <Icon icon="icon-park-outline:edit" class="text-base" />
        </button>
        <span class="badge badge-soft badge-primary badge-xs">{{ data.quantity }}</span>
      </div>
    </div>
    <InlineTooltip v-if="itemData?.durable" :text="`耐久度: ${Math.round((data.durable / (itemData?.durable ?? 1)) * 100)}%`">
      <progress 
        class="progress progress-primary w-full" 
        :value="data.durable * 100" 
        :max="(itemData?.durable ?? 1) * 100"
      ></progress>
    </InlineTooltip>
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