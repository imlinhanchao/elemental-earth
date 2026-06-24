<script setup lang="ts">
  import { Items } from '@/data/items';
  import { usePackStore } from '@/stores/modules/pack';
  import { computed } from 'vue';

  const props = defineProps<{
    description: string;
    required_items: { key: string; quantity: number }[];
    required_techs?: string[];
  }>();

  const packStore = usePackStore();

  const items = computed(() => {
    return props.required_items.map(item => {
      const itemData = Items.find(i => i.key === item.key);
      const known = packStore.hasEverHad(item.key);
      return {
        key: item.key,
        quantity: item.quantity,
        name: known ? (itemData?.name || item.key) : '????',
        known,
        insufficient: known && item.quantity > packStore.getItemQuantity(item.key),
      };
    });
  });

</script>
<template>
  <section class="inline-flex relative group">
    <slot></slot>
    <section class="w-full absolute content p-2 bg-base-300/80 hidden group-hover:block rounded border border-base-300 z-100 shadow-xl">
      <div>{{ description }}</div>
      <div v-if="items.length" class="divider"></div>
      <div v-for="item in items" :key="item.key" :class="{ 'text-error': item.insufficient }">
        {{ item.quantity }}x {{ item.name }}
      </div>
    </section>
  </section>
</template>
<style scoped>
  .content {
    --size: calc(var(--size-field, 0.25rem) * 10 + 5px);
    top: var(--size);
  }
</style>