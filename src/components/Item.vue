<script setup lang="ts">
  import { Items } from '@/data/items';
  import { usePackStore, type IPackItem } from '@/stores/modules/pack';
  import { computed } from 'vue';

  const props = defineProps<{
    data: IPackItem;
  }>();

  const packStore = usePackStore();
  const itemData = computed(() => {
    return Items.find(item => item.key === props.data.key);
  });
</script>
<template>
  <div class="flex items-center justify-between px-4">
    <span>{{ data.name }}</span>
    <span class="badge badge-primary badge-xs">{{ data.quantity }}</span>
  </div>
  <span v-if="itemData?.durable" class="tooltip tooltip-bottom inline-flex w-full" :data-tip="`耐久度: ${Math.round((data.durable / (itemData?.durable ?? 1)) * 100)}%`">
    <progress 
      class="progress progress-primary w-full" 
      :value="data.durable * 100" 
      :max="(itemData?.durable ?? 1) * 100"
    ></progress>
  </span>
</template>