<script setup lang="ts">
  import { Items } from '@/data/items';
  import { computed } from 'vue';

  const props = defineProps<{
    description: string;
    required_items: { key: string; quantity: number }[];
    required_techs?: string[];
  }>();

  const items = computed(() => {
    return props.required_items.map(item => {
      const itemData = Items.find(i => i.key === item.key);
      return itemData ? `${item.quantity}x ${itemData.name}` : `${item.quantity}x ${item.key}`;
    });
  });

</script>
<template>
  <section class="inline-flex relative group">
    <slot></slot>
    <section class="w-full absolute content p-2 bg-base-200/50 hidden group-hover:block rounded border border-base-300">
      <div>{{ description }}</div>
      <div v-if="items.length" class="divider"></div>
      <div v-for="item in items" :key="item">{{ item }}</div>
    </section>
  </section>
</template>
<style scoped>
  .content {
    --size: calc(var(--size-field, 0.25rem) * 10 + 5px);
    top: var(--size);
  }
</style>