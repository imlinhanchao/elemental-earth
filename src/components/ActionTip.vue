<script setup lang="ts">
  import Icon from '@/components/Icon.vue';
  import { Items } from '@/data/items';
  import { usePackStore } from '@/stores/modules/pack';
  import { useAppStore } from '@/stores/modules/app';
  import { useTaskStore } from '@/stores/modules/task';
  import { computed, ref } from 'vue';

  const props = defineProps<{
    description: string;
    required_items: { key: string; quantity: number }[];
    required_techs?: string[];
    time_required?: number;
  }>();

  const packStore = usePackStore();
  const taskStore = useTaskStore();
  const appStore = useAppStore();

  const items = computed(() => {
    return props.required_items.map(item => {
      const itemData = Items.find(i => i.key === item.key);
      const known = packStore.hasEverHad(item.key);
      const projectedQty = taskStore.projectedInventory.get(item.key) || 0;
      return {
        key: item.key,
        quantity: item.quantity,
        name: itemData?.name || item.key,
        known,
        insufficient: known && item.quantity > projectedQty,
      };
    });
  });

  // 移动端长按显示
  const mobileShow = ref(false);
  let pressTimer: any = null;

  function handleTouchStart() {
    if (!appStore.isMobile) return;
    // 重置状态
    if (pressTimer) clearTimeout(pressTimer);
    
    pressTimer = setTimeout(() => {
      mobileShow.value = true;
      pressTimer = null;
      // 3秒后自动关闭，避免遮挡
      setTimeout(() => { mobileShow.value = false }, 3000);
    }, 500); // 500ms 定义为长按
  }

  function handleTouchEnd() {
    if (!appStore.isMobile) return;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function handleTouchMove() {
    if (!appStore.isMobile) return;
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

</script>
<template>
  <section 
    class="inline-flex relative group" 
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchMove"
  >
    <slot></slot>
    <section 
      class="w-full absolute content p-2 bg-base-200/80 rounded border border-base-300 z-100 shadow-xl backdrop-blur-sm transition-all -mt-1"
      :class="[
        appStore.isMobile ? (mobileShow ? 'block animate-in fade-in zoom-in duration-200' : 'hidden') : 'hidden group-hover:block'
      ]"
    >
      <div class="flex items-center justify-between gap-2 mb-1">
        <div class="text-xs font-bold">{{ description }}</div>
      </div>
      <div v-if="time_required" class="text-[10px] opacity-60 whitespace-nowrap flex items-center gap-0.5">
        <Icon icon="tabler:clock" />
        {{ time_required }}s
      </div>
      <div v-if="items.length" class="divider my-1 h-px"></div>
      <div v-for="item in items" :key="item.key" class="text-[10px] leading-relaxed request-item" :class="{ 'text-error': item.insufficient, 'opacity-50': !item.known }">
        {{ item.quantity }}x 
        <span class="item-name" :class="{ 'hidden': !item.known }">{{ item.name }}</span>
        <span class="unknown" v-if="!item.known">????</span>
      </div>
    </section>
  </section>
</template>
<style scoped lang="less">
  .content {
    --size: calc(var(--size-field, 0.25rem) * 10 + 5px);
    top: var(--size);
  }
  .request-item {
    .hidden {
      display: none;
    }
    &:hover {
      .item-name {
        display: inline;
      }
      .unknown {
        display: none;
      }
    }
  }
</style>